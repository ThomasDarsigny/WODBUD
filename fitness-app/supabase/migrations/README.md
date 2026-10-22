# Migrations

L'historique complet (47 migrations, de `fix_rls_infinite_recursion_and_cleanup`
à `043_communities_social`) **existe côté Supabase** : le projet les
trace dans `supabase_migrations.schema_migrations`. Rien n'est perdu.

Les migrations 001 à 016, ainsi que 020 et 021, ont été appliquées
directement sur le projet, sans fichier versionné ici : leur intention ne se
relit pas depuis git.

**Le schéma complet, lui, est dans le dépôt** depuis le 2026-10-14 :

- `../schema.sql` — tout le schéma `public` (tables, règles d'accès,
  fonctions, déclencheurs), tiré de la production par
  `npx supabase db dump --linked -f supabase/schema.sql` ;
- `../schema_auth_storage.sql` — ce que ce dump n'inclut pas : le déclencheur
  de création de profil sur `auth.users` et le bucket `avatars`.

À régénérer après une série de migrations, pour qu'il reste la référence.
`db pull` n'est pas utilisé : les noms de fichiers ici (`024_…`) ne suivent
pas le format horodaté de la CLI et ne correspondent pas à l'historique
enregistré en base, il faudrait d'abord le réparer.

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
| `026_scheduled_workouts.sql` | Table `scheduled_workouts` — volet « séances programmées » du journal, personnel (même modèle que `workout_sessions`) |
| `027_profiles_avatar.sql` | Colonne `profiles.avatar_url` + bucket Storage `avatars` (public en lecture, écriture par propriétaire) — voir `docs/suppression-compte.md` pour le choix Storage plutôt que R2 |
| `028_communaute_badges.sql` | 6 nouveaux badges dans la famille `communaute` (4 → 10) + `wodbud_recalc_badges` mis à jour pour les évaluer |
| `029_communities.sql` | Tables `communities` / `community_members`, ouvertes à tout compte (cohérence avec `classes`) + `profiles.social_links` |
| `030_shared_rank_social_links.sql` | `get_shared_rank` renvoie aussi `avatar_url` et `social_links`, pour que la page de rang publique les affiche |
| `031_class_members_visible_to_classmates.sql` | Un athlète voit les autres inscrits de ses cours (fonction `is_class_member`) — le classement d'un cours était vide côté athlète |
| `032_class_leaderboard_week.sql` | Fonction `get_class_leaderboard_since` : minutes par membre depuis une date (≤ 8 jours), pour le classement de la semaine — les séances restent privées, seule la somme sort |
| `033_class_leaderboard_month.sql` | Même fonction, borne portée à 32 jours pour le classement du mois |
| `034_scheduled_workouts_link_session.sql` | `scheduled_workouts.session_id` : un plan retient la séance effectuée qui l'a accomplie (unique, remis à null si la séance est supprimée) |
| `035_rls_consolidation.sql` | Règles d'accès fusionnées (une par table et par action, OU exact des anciennes), `auth.uid()` évalué une fois par requête, règles liées à l'utilisateur réservées à `authenticated` ; `is_admin()` & co. retirées à `anon` ; garde sur `wodbud_recalc_badges`. Tables `app_*` hors périmètre |
| `036_close_app_tables.sql` | Tables `app_*` (inutilisées par WODBUD, ouvertes à `anon` en lecture/écriture) fermées : règles et droits retirés, données conservées |
| `037_class_plans.sql` | Planification par le coach : `class_plans`, copie par athlète dans `scheduled_workouts.class_plan_id` (déclencheurs), lecture des copies par le coach |
| `038_class_plans_title_copy.sql` | Corrige 037 : la fiche du workout du coach n'est plus lisible par l'athlète (bibliothèque), le titre est recopié dans la copie |
| `039_push_notifications.sql` | Notifications push : `push_subscriptions` (un abonnement par appareil), secret Vault `push_cron_secret`, tâche pg_cron `push-rappel-du-matin` (12 h UTC) qui appelle la fonction Edge `push`. Secrets VAPID dans les secrets des fonctions Edge |
| `040_sessions_no_backfill.sql` | Fin du « journal rapide » : déclencheur `wodbud_guard_session` — une séance doit être chronométrée (début < 12 h, fin = heure du serveur, minutes ≤ temps écoulé), et ses durées/dates ne se modifient plus après coup |
| `041_feature_topics.sql` | Vote des thématiques à ajouter : `feature_topics` (l'admin propose, ferme, marque « ajoutée »), `feature_topic_votes` (un seul choix par compte, clé primaire `user_id`, seulement vers une thématique ouverte), fonction `get_feature_topics()` qui ne sort que les décomptes |
| `042_community_members_rank_share.sql` | Communautés : `community_members.share_rank` (chaque membre choisit, par communauté, de partager son rang) et `get_community_members()` — nom et avatar pour tous, rang/minutes/série/badges seulement pour les autres membres et seulement si partagé |
| `043_communities_social.sql` | Communautés : rôles (propriétaire, co-admins, garde `wodbud_guard_community_member`), défis collectifs, classement semaine/mois, WOD épinglé (exercices lisibles par les membres), fil d'activité + réactions, profil d'un membre, 2 badges (`community_challenge`, `community_wod_10`) évalués par `wodbud_recalc_badges`. Rien d'un membre ne sort s'il ne partage pas son rang |
| `044_exercise_results.sql` | Records personnels : `exercise_results` (charge en kg, répétitions ou temps, par mouvement, rattachable à une séance de l'athlète). Privés, sans effet sur les minutes ni les rangs ; le record se calcule à la lecture |
| `045_class_followup.sql` | Suivi des athlètes : `get_class_followup()` — dernière séance, séances et minutes sur 7/30 jours, série, pour chaque inscrit. Réservé au coach du cours et aux admins ; seulement des comptes, jamais le contenu des séances |
| `046_badges_forge.sql` | Badges « Forge » : `badges.art` (visuel `public/badges/<art>.svg`) et `badges.rarity` ; 8 badges ajoutés (5 et 30 séances, lève-tôt, nocturne, 5 séances dans la semaine, premier résultat, 10 records, 50 résultats), `pr` activé ; `wodbud_recalc_badges` évalue aussi records, résultats, horaires et semaine la plus chargée |
