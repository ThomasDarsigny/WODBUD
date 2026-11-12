-- 064 — Nettoyage : dix tables d'une version précédente de l'app (nutrition,
-- poids, journaux de séries, réglages). Aucun code ne les lit ni ne les écrit
-- (seul database.types.ts les mentionne), elles ont RLS sans aucune règle
-- (donc inaccessibles depuis l'API) et contiennent 32 lignes au total.
--
-- Avant d'appliquer : export JSON des lignes conservé hors dépôt, et la
-- sauvegarde quotidienne chiffrée les contient aussi.
--
-- Pas de CASCADE : si une dépendance inattendue existe, la migration échoue
-- au lieu d'emporter autre chose.

drop table public.app_set_logs;
drop table public.app_sessions;
drop table public.app_custom_exercises;
drop table public.app_custom_workouts;
drop table public.app_custom_foods;
drop table public.app_food_logs;
drop table public.app_hidden_exercises;
drop table public.app_hidden_workouts;
drop table public.app_weight_logs;
drop table public.app_settings;

-- Retour arrière : restaurer depuis la sauvegarde chiffrée (docs/sauvegardes.md)
-- ou depuis l'export JSON ; les tables n'ont pas de définition dans ce dépôt.
