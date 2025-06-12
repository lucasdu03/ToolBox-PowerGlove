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

    // Utilisation d'un Set pour éviter les doublons d'URL d'articles
    const articleUrls = new Set();

    for (const source of sources) {
        // Vérification de la validité de l'URL
        if (!/^https?:\/\/[^ "]+$/.test(source.url)) {
            console.warn(`⚠️ URL invalide ignorée : ${source.url}`);
            continue;
        }

        console.log(`📥 Lecture de ${source.url}`);
        try {
            // Parsing du flux RSS
            const feed = await parser.parseURL(source.url);
            for (const item of feed.items) {
                // Ajout de l'URL de l'article si elle est valide
                if (item.link && /^https?:\/\/[^ "]+$/.test(item.link)) {
                    articleUrls.add(item.link);
                }
            }
        } catch (err) {
            // Affichage d'un avertissement en cas d'erreur de parsing
            console.warn(`❌ Erreur lors du traitement du flux : ${source.url}`, err.message);
        }
    }

    try {
        // Écriture des URLs d'articles collectées dans un fichier JSON
        await fs.writeFile('articleUrls.json', JSON.stringify([...articleUrls], null, 2), 'utf-8');
        console.log(`✅ ${articleUrls.size} URL(s) d’article enregistrée(s) dans articleUrls.json`);
    } catch (err) {
        // Affichage d'une erreur si l'écriture échoue
        console.error('❌ Erreur lors de l’écriture du fichier JSON :', err);
    }

    // Envoi des données dans Supabase (table articlesUrl)
    try {
        // Récupérer les URLs déjà présentes en base
        const { data: existingArticles, error: fetchError } = await supabase
            .from('articlesUrl')
            .select('url');

        if (fetchError) {
            console.error('❌ Erreur lors de la récupération des articles existants :', fetchError.message);
            return;
        }

        const existingUrls = new Set(existingArticles.map(a => a.url));

        // Filtrer les nouvelles URLs à insérer
        const newUrls = [...articleUrls].filter(url => !existingUrls.has(url));
        if (newUrls.length === 0) {
            console.log('ℹ️ Aucune nouvelle URL à insérer.');
            return;
        }

        const rows = newUrls.map(url => ({ url }));
        const { error: insertError } = await supabase
            .from('articlesUrl')
            .upsert(rows, { onConflict: 'url' });

        if (insertError) {
            console.error('❌ Erreur lors de l’insertion Supabase :', insertError.message);
        } else {
            console.log(`✅ ${rows.length} article(s) inséré(s) dans Supabase (articlesUrl)`);
        }
    } catch (err) {
        console.error('❌ Erreur inattendue lors de l’upsert Supabase :', err.message);
    }
};

// Lancement du script principal
main();