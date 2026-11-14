# Préproduction

Un second projet Supabase, **`wodbud-staging`** (référence `sqhkygxaqqycynadcfmk`,
région Canada, forfait gratuit), séparé de la production (`onyifpsvwprviuhnomxg`).
On y applique une migration, on teste l'app contre, puis seulement on l'applique
en production.

Tout passe par `scripts/staging.mjs`, qui utilise la CLI Supabase déjà connectée
(`npx supabase login` une fois) : ni mot de passe de base, ni Docker. **Le script
n'écrit jamais dans la production** : il la lit en lecture seule (comparaison,
catalogue, état des migrations), et toute écriture vers un autre projet que la
préproduction est refusée dans le code.

## Ce qu'il y a dedans

- **La structure complète** de la production : tables, règles d'accès, fonctions,
  déclencheurs (dont `on_auth_user_created` et `ensure_rls`), compartiments de
  stockage et leurs règles, tâche planifiée du matin.
- **Le catalogue** recopié de la production : rangs, badges, types de mouvement,
  méthodes, groupes musculaires, les exercices de la base commune avec leurs
  muscles et méthodes, et les 13 benchmarks (créés par la migration 067).
- **Aucune donnée de compte** : ni profils, ni séances, ni cours, ni centres, ni
  exercices propres à un centre.
- **Un seul compte au départ**, « contenu WODBUD », propriétaire des benchmarks
  (en production, c'est le compte admin). Il ne peut pas se connecter : aucun mot
  de passe, adresse en `.invalid`, bloqué pour toujours.
- **Les fonctions Edge**, déployées sans leurs secrets : l'assistant IA, l'import
  par photo (Anthropic), les vidéos (R2) et les notifications push (VAPID) ne
  marchent pas en préproduction tant que ces secrets n'y sont pas ajoutés
  (tableau de bord du projet → Edge Functions → Secrets). La suppression de compte
  marche (elle n'utilise que les clés fournies par Supabase).

## Utiliser l'app contre la préproduction

```bash
npm run dev:staging
```

Lance le serveur local avec `.env.staging.local` (adresse et clé publique de la
préproduction, fichier hors git). Pour le recréer : tableau de bord du projet →
Project Settings → API Keys, clé « publishable ».

```
VITE_SUPABASE_URL="https://sqhkygxaqqycynadcfmk.supabase.co"
VITE_SUPABASE_ANON_KEY="sb_publishable_…"
```

On s'y inscrit comme en production (le courriel de confirmation ramène sur
`http://localhost:5173`). Pour tester les écrans d'administration, une fois inscrit :

```bash
npm run staging -- admin ton@courriel
```

### Aperçus Vercel (à faire une fois, dans Vercel)

Les aperçus Vercel (toute branche autre que `main`) utilisent les variables
« Preview » du projet `fitness`. Pour qu'ils parlent à la préproduction et non à
la production : Vercel → projet `fitness` → Settings → Environment Variables,
ajouter pour l'environnement **Preview** seulement `VITE_SUPABASE_URL` et
`VITE_SUPABASE_ANON_KEY` avec les valeurs ci-dessus. Les adresses de retour des
aperçus (`https://fitness-*-thomasdarsignys-projects.vercel.app/**`) sont déjà
acceptées par la préproduction. Aujourd'hui, seule `main` est poussée : il n'y a
pas d'aperçu tant qu'on ne pousse pas une autre branche.

## Avec une nouvelle migration

1. Écrire `supabase/migrations/0NN_nom.sql`.
2. `npm run staging -- migrate` : l'applique à la préproduction (une transaction ;
   si elle échoue, rien n'est gardé).
3. Tester (`npm run dev:staging`, requêtes de vérification).
4. L'appliquer en production, comme avant.
5. `npm run staging -- diff` : les deux structures doivent être identiques.
   Un écart veut dire qu'une migration n'a pas été appliquée des deux côtés, ou
   qu'un changement a été fait directement sur une base sans fichier.

## Commandes

| Commande | Effet |
|---|---|
| `npm run staging -- status` | Migrations du dépôt pas encore appliquées, en préproduction et en production |
| `npm run staging -- migrate` | Applique à la préproduction les migrations qui lui manquent |
| `npm run staging -- diff` | Compare les deux structures (≈ 1000 objets : colonnes, contraintes, index, règles d'accès, fonctions, droits, déclencheurs, compartiments, tâches planifiées) |
| `npm run staging -- seed` | Recopie le catalogue depuis la production (remplace les lignes existantes, garde les autres) |
| `npm run staging -- functions` | Déploie les fonctions Edge sur la préproduction (`verify_jwt` lu dans `supabase/config.toml`) |
| `npm run staging -- auth` | Pousse `staging/supabase/config.toml` (adresse du site, adresses de retour) ; le reste des réglages n'est pas touché |
| `npm run staging -- admin <courriel>` | Rend admin un compte de la préproduction |
| `npm run staging -- build` | Base neuve seulement : schéma de référence, catalogue, migrations, catalogue à jour, comparaison |

## Comment `build` reconstruit la base

1. `supabase/schema.sql` + `supabase/schema_auth_storage.sql` : la base telle
   qu'elle était après la migration 038 (les migrations 001 à 016, 020 et 021
   n'ont pas de fichier : voir `supabase/migrations/README.md`). Les droits par
   défaut de Supabase sont suspendus pendant ce chargement : `pg_dump` écrit les
   droits de chaque objet sans en tenir compte, et sans ce retrait chaque table
   rendrait à `anon` des droits que la production lui avait retirés.
2. Le catalogue, sans les badges : 067 cherche ses mouvements par nom, et 043 et
   046 insèrent eux-mêmes des badges.
3. Les migrations 039 et suivantes, dans l'ordre. L'adresse de la production
   (tâche planifiée de 039) est remplacée par celle de la préproduction.
4. Le catalogue complet, à l'état actuel de la production.
5. La comparaison : vérifié le 2026-11-13, structures identiques (1007 objets),
   et les mêmes réponses des deux côtés pour un visiteur sans compte (lectures
   permises, refus, fonctions publiques).

Pour repartir de zéro, le plus sûr est de supprimer le projet `wodbud-staging`
dans le tableau de bord, d'en recréer un, de mettre sa référence dans
`scripts/staging.mjs` et `.env.staging.local`, puis `build`, `functions`, `auth`.

## Limites

- Le forfait gratuit met un projet en pause après une semaine sans activité ; le
  relancer depuis le tableau de bord (Restore), les données restent.
- Les réglages d'authentification de la production (fournisseurs OAuth, gabarits
  de courriel, SMTP) ne sont pas recopiés : la préproduction a ceux d'un projet
  neuf, plus l'adresse du site et les adresses de retour. Les courriels passent
  par le service intégré de Supabase, limité et réservé aux membres de
  l'organisation.
- `diff` compare la structure, pas les données ni les réglages hors base.
