import fs from 'fs/promises';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '../key.env' });

// Init Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Vérification de la connexion
const { error: pingError } = await supabase.from('ListUrlRss').select('id').limit(1);
if (pingError) {
    console.error('❌ Connexion à Supabase échouée :', pingError.message);
    process.exit(1);
}

// Charger les URLs depuis le fichier JSON
const { links: urls } = JSON.parse(await fs.readFile('feedsList.json', 'utf-8'));

// Préparer les objets à insérer
const articles = urls.map(url => ({ url }));

// Insertion (par lots de 100 pour éviter les limites)
for (let i = 0; i < articles.length; i += 100) {
    const chunk = articles.slice(i, i + 100);
    const { error } = await supabase.from('ListUrlRss').insert(chunk);
    if (error) {
        console.error('❌ Erreur à l’insertion :', error.message);
    } else {
        console.log(`✅ ${chunk.length} URL(s) insérées`);
    }
}