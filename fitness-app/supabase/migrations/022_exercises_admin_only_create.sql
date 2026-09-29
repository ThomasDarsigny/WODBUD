-- ═══════════════════════════════════════════════════════════════════
-- Restreint la création d'exercices aux admins.
--
-- Jusqu'ici, « exercises: créer » permettait à n'importe quel compte
-- connecté (coach ou athlète) d'insérer un exercice tant que `created_by`
-- pointait vers lui-même. Sur demande explicite : seul un admin peut
-- désormais créer un nouvel exercice — la bibliothèque reste une ressource
-- partagée et curatée, pas un espace où chaque coach ajoute les siens.
--
-- `exercises_admin_write` (ALL, is_admin()) couvre déjà l'INSERT pour les
-- admins : rien à ajouter, seulement à retirer l'accès self-service.
--
-- Volontairement inchangé : « exercises: modifier les siens » et
-- « exercises: supprimer les siens ». Un coach garde la main sur les
-- exercices qu'il a créés avant ce changement ; seule la création de
-- nouveaux exercices est fermée. Voir docs/import-ocr.md pour le contexte.
-- ═══════════════════════════════════════════════════════════════════

drop policy if exists "exercises: créer" on public.exercises;
