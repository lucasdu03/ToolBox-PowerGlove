import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '../key.env' });

// Initialisation du client Supabase avec les clés d'accès
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

import Parser from 'rss-parser';
import fs from 'fs/promises';
import path from 'path';

// Création d'une instance du parser RSS
const parser = new Parser();
// Définition du chemin du fichier où seront stockés les articles
const filePath = path.resolve('articles.json');

// Récupération des URLs de flux RSS depuis la table ListUrlRss de Supabase
const { data: feeds, error } = await supabase.from('ListUrlRss').select('url');
if (error) {
    console.error('❌ Erreur lors de la récupération des flux depuis Supabase :', error.message);
    process.exit(1);
}
// Mise en forme des sources sous forme d'objet { url }
const sources = feeds.map(f => ({ url: f.url }));

// Fonction utilitaire pour charger les articles existants (si le fichier existe)
const loadExistingArticles = async () => {
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        // Retourne un tableau vide si le fichier n'existe pas ou est vide
        return [];
    }
};

const main = async () => {
    // Test de connexion à Supabase avant toute opération
    const { error: testError } = await supabase.from('ListUrlRss').select('id').limit(1);
    if (testError) {
        console.error('❌ Test de connexion Supabase échoué :', testError.message);
        process.exit(1);
    } else {
        console.log('✅ Connexion à Supabase réussie.');
    }

    for (const source of sources) {
        if (!/^https?:\/\/[^ "]+$/.test(source.url)) {
            console.warn(`⚠️ URL invalide ignorée : ${source.url}`);
            continue;
        }

        console.log(`📥 Lecture de ${source.url}`);
        try {
            const feed = await parser.parseURL(source.url);
            for (const item of feed.items) {
                const articleUrl = item.link;
                if (articleUrl && /^https?:\/\/[^ "]+$/.test(articleUrl)) {
                    // Vérifie si l’URL existe déjà dans Supabase
                    const { data: existing, error: checkError } = await supabase
                        .from('articlesUrl')
                        .select('url')
                        .eq('url', articleUrl)
                        .maybeSingle();

                    if (checkError) {
                        console.error(`❌ Erreur lors de la vérification de l'URL : ${articleUrl}`, checkError.message);
                        continue;
                    }

                    if (!existing) {
                        const { error: insertError } = await supabase
                            .from('articlesUrl')
                            .insert({ url: articleUrl });

                        if (insertError) {
                            console.error(`❌ Erreur lors de l’insertion de l’article : ${articleUrl}`, insertError.message);
                        } else {
                            console.log(`✅ Article inséré : ${articleUrl}`);
                        }
                    } else {
                        console.log(`🔁 Article déjà présent : ${articleUrl}`);
                    }
                }
            }
        } catch (err) {
            console.warn(`❌ Erreur lors du traitement du flux : ${source.url}`, err.message);
        }
    }
};

// Lancement du script principal
main();