# Migrations

L'historique complet (24 migrations, de `fix_rls_infinite_recursion_and_cleanup`
à `019_badges_revoke_anon`) **existe côté Supabase** : le projet les trace dans
`supabase_migrations.schema_migrations`. Rien n'est perdu.

Ce qui manque, c'est leur **SQL dans le dépôt** : les migrations 001 à 016 ont
été appliquées directement sur le projet, sans fichier versionné ici. On ne peut
donc pas relire l'intention d'un changement depuis git, ni faire une revue de
schéma en pull request.

**Pour rattraper** : `supabase db pull` récupère le schéma courant en une
migration de base, après quoi chaque changement peut être versionné ici avant
d'être appliqué.

| Fichier | Contenu |
|---|---|
| `017_badges.sql` | Tables `badges` et `user_badges`, RLS, fonction `wodbud_recalc_badges` |
| `018_badges_catalogue.sql` | Les 26 badges retenus |
| `019_badges_revoke_anon.sql` | Retrait de l'accès `anon` à la fonction |
