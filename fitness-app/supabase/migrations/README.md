# Migrations

L'historique complet (29 migrations, de `fix_rls_infinite_recursion_and_cleanup`
à `025_exercise_votes_fix_permissive_bypass`) **existe côté Supabase** : le
projet les trace dans `supabase_migrations.schema_migrations`. Rien n'est perdu.

Ce qui manque, c'est leur **SQL dans le dépôt** : les migrations 001 à 016,
ainsi que 020 et 021, ont été appliquées directement sur le projet (dashboard
ou une session précédente), sans fichier versionné ici. On ne peut donc pas
relire l'intention de ces changements-là depuis git.

**Pour rattraper** : `supabase db pull` récupère le schéma courant en une
migration de base, après quoi chaque changement peut être versionné ici avant
d'être appliqué.

| Fichier | Contenu |
|---|---|
| `017_badges.sql` | Tables `badges` et `user_badges`, RLS, fonction `wodbud_recalc_badges` |
| `018_badges_catalogue.sql` | Les 26 badges retenus |
| `019_badges_revoke_anon.sql` | Retrait de l'accès `anon` à la fonction |
| `020_badges_equipement.sql` | **Manquant du dépôt** — appliqué directement sur le projet |
| `021_notifications_seen.sql` | **Manquant du dépôt** — appliqué directement sur le projet |
| `022_exercises_admin_only_create.sql` | Retire la création d'exercice en libre-service (`exercises: créer`) — seul un admin peut désormais créer un exercice |
| `023_exercises_admin_only_write.sql` | Retire aussi la modification/suppression en libre-service — un admin gère seul toute l'écriture sur `exercises` et `exercise_muscles` |
| `024_vote_sessions_deadline_enforced.sql` | Bloque le vote (INSERT/DELETE sur `exercise_votes`) une fois la session fermée ou l'échéance dépassée — c'était jusque-là seulement caché côté écran |
| `025_exercise_votes_fix_permissive_bypass.sql` | Corrige 024 : une ancienne policy `ALL` sans condition d'échéance la contournait entièrement (policies RLS permissives = OR, pas remplacement) |
