# WODBUD

Créateur de WOD et outil de gestion de box CrossFit — pour les coachs qui programment, et pour les athlètes qui s'entraînent.

## Fonctionnalités

**Pour les coachs**
- **Bibliothèque d'exercices** filtrable (catégorie, mouvement, équipement, région), avec un mannequin musculaire qui montre les muscles sollicités par chaque exercice
- **Constructeur d'entraînements** et bibliothèque de WOD réutilisables, export PDF
- **Import** d'un entraînement depuis une photo ou un PDF
- **Cours** : invite tes athlètes par lien ou code QR, suis leur classement
- **Votes** : tes athlètes choisissent le WOD du jour, avec une échéance

**Pour les athlètes**
- **Séance chronométrée** et **journal** des séances passées et à venir
- **Rangs** basés sur les minutes actives, séries de jours consécutifs, page de rang partageable
- **Badges** de progression
- **Communautés** à rejoindre ou à créer
- **Assistant IA** pour la programmation

**Partout**
- Interface en français, anglais et espagnol
- Thème clair, sombre ou système
- Application installable (PWA), utilisable hors ligne

## Stack

- React 19, TypeScript, Vite, Tailwind CSS
- Zustand, TanStack Query, React Router, i18next
- Supabase : Postgres avec Row Level Security, authentification, stockage, Edge Functions (Deno)
- Déployé sur Vercel

## Démarrer en local

Prérequis : Node.js 20+ et un projet Supabase.

```bash
cd fitness-app
npm install
```

Crée `fitness-app/.env.local` :

```
VITE_SUPABASE_URL=https://<nom-projet>.supabase.co
VITE_SUPABASE_ANON_KEY=<clé-anon>
```

Puis :

```bash
npm run dev
```

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production + prérendu de la page d'accueil |
| `npm run type-check` | Vérification TypeScript |
| `npm run lint` | ESLint |
| `npm run preview` | Prévisualiser le build |

## Structure

```
fitness-app/
├── src/                  Application React
│   ├── components/       Vues et composants par domaine
│   ├── stores/           État global (Zustand)
│   ├── lib/              Accès Supabase et logique métier
│   └── i18n/locales/     Traductions fr / en / es
├── supabase/
│   ├── migrations/       Schéma SQL et politiques RLS
│   └── functions/        Edge Functions (Deno)
└── docs/                 Notes de conception
```

## Auteur

Thomas Darsigny
