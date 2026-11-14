-- 071 — Retrait des données de test restées en production (feuille de route,
-- « Toujours en suspens »). Inventaire fait le 2026-11-13, en lecture seule :
-- aucun WOD, aucune séance, aucun résultat n'utilise ces exercices.
--
-- 1. Le centre « Box Test WODBUD » (7 novembre) et, en cascade : son propriétaire
--    comme membre (le compte reste), ses 3 liens d'invitation, ses 3 exercices
--    en attente de relecture (« … test WODBUD ») avec leurs muscles et leur photo
--    de référence (la ligne ; le fichier se retire dans Storage, la base refuse
--    de supprimer un objet de stockage), et ses 5 mentions d'import.
-- 2. Les deux votes de test du cours « test classe » (5 juin), faits seulement
--    d'exercices parasites, avec leurs options et leurs 3 votes. Le cours reste.
-- 3. Les 8 exercices parasites de la base commune (1er juin) : test, test 1,
--    test 2 (deux fois), simple test, avant-bras, biceps, epaules, et leurs liens
--    aux muscles.
--
-- Par identifiant : rejouée ailleurs (préproduction), elle ne retire que ce qui existe.

delete from public.vote_sessions
where id in ('acf3b3b9-3251-4984-8aee-fa6cbfd9bd7d', '930fd7fd-9697-447b-9d40-72197e3cfbd7');

delete from public.centers
where id = '7b03052b-79c5-4601-ab01-dc08dbdbca15';

delete from public.exercises
where center_id is null
  and id in (
    'a2861c66-c0a5-4bd8-8cfa-1a1773a989ce',  -- test
    '32ec04d6-6195-449e-8f11-f3602a77a516',  -- test 1
    '20e8d983-fa24-404e-9cb5-0ee3df737dd3',  -- test 2
    '670aeeba-8f65-4ede-9aff-c4081f033df9',  -- test 2
    'b3b12f89-06eb-4859-8845-4ad59b922096',  -- simple test
    '97fa1b5b-e344-4c13-bcc4-f753677d0794',  -- avant-bras
    'a019335a-5545-4ebe-8017-8a06c60336d8',  -- biceps
    'c334eea4-e150-4ebb-be07-41d55872b39c'   -- epaules
  );

-- Retour arrière : aucun (données supprimées). Les lignes retirées sont décrites ci-dessus.
