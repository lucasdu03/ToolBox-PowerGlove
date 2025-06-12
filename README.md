# RssParser

## Présentation

RssParser est un outil Node.js/Bun permettant de collecter des URLs d’articles à partir de flux RSS, puis de les injecter dans une base de données Supabase.

---

## Prérequis

- [Bun](https://bun.sh) installé (`curl -fsSL https://bun.sh/install | bash`)
- Un compte [Supabase](https://supabase.com/) et un projet créé
- Node.js ≥ 18 (si besoin)
- Accès à la console Supabase pour créer les tables

---

## Installation

```bash
bun install
```

---

## Configuration

1. **Variables d’environnement**

   Crée un fichier `key.env` à la racine du projet avec :

   ```dotenv
   SUPABASE_URL=https://<ton-projet>.supabase.co
   SUPABASE_KEY=<ta-clé-supabase>
   ```

   > Récupère ces informations dans Supabase > Project Settings > API.

2. **Création des tables dans Supabase**

   Dans le SQL Editor de Supabase (laisser les timestamp existant), exécute :

   ```sql
   create table public."ListUrlRss" (
     id serial primary key,
     url text not null unique
   );

   create table public."articlesUrl" (
     id serial primary key,
     url text not null unique
   );
   ```

3. **(Optionnel) Ajoute des URLs RSS dans la table `ListUrlRss`**  
   Tu peux le faire via le dashboard Supabase ou via un script d’injection.

---

## Utilisation

### 1. Récupérer et injecter les articles

Depuis le dossier du projet :

```bash
cd urlArticles
bun run fetchRss.js
```

Ce script :

- Récupère les URLs RSS depuis la table `ListUrlRss`
- Parse chaque flux RSS
- Extrait les liens d’articles uniques
- Les insère dans la table `articlesUrl` (sans doublons)

### 2. Ajouter de nouveaux flux RSS

Ajoute de nouvelles URLs dans la table `ListUrlRss` via le dashboard Supabase ou un script.

---

## Dépannage

- **Invalid API key** : Vérifie la clé dans `key.env` (copie-la bien depuis Supabase).
- **RLS (Row Level Security) errors** : Ajoute une politique d’insertion dans Supabase si besoin.
- **Problèmes de certificat SSL** : Certains flux peuvent avoir des certificats invalides, voir la doc ou ignorer temporairement les erreurs SSL (déconseillé en production).

---

## Structure du projet

```
.
├── key.env
├── urlArticles/
│   └── fetchRss.js
├── injectDB/
│   └── inject.js
├── package.json
└── README.md
```

---

## Liens utiles

- [Documentation Supabase](https://supabase.com/docs)
- [Documentation Bun](https://bun.sh/docs)
- [RSS Parser (npm)](https://www.npmjs.com/package/rss-parser)

---

## Licence

MIT
