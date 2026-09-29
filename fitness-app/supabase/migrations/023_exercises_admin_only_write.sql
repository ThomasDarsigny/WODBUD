-- ═══════════════════════════════════════════════════════════════════
-- Ferme aussi la modification et la suppression aux non-admins.
--
-- Suite de 022_exercises_admin_only_create : la création d'exercice était
-- déjà réservée aux admins, mais un coach gardait le droit de modifier ou
-- supprimer les exercices qu'il avait créés avant ce changement (policies
-- « les siens »). Sur demande explicite : la bibliothèque d'exercices est
-- désormais entièrement gérée par les admins, en écriture complète.
--
-- `exercises_admin_write` (ALL, is_admin()) couvre déjà UPDATE et DELETE
-- pour les admins : rien à ajouter, seulement à retirer l'accès
-- self-service. Même chose pour `exercise_muscles`, qui suivait la même
-- logique de propriété (rattachée au `created_by` de l'exercice parent).
-- ═══════════════════════════════════════════════════════════════════

drop policy if exists "exercises: modifier les siens" on public.exercises;
drop policy if exists "exercises: supprimer les siens" on public.exercises;
drop policy if exists "exercise_muscles: gérer les siens" on public.exercise_muscles;
