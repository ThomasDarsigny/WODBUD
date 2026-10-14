-- ═══════════════════════════════════════════════════════════════════
-- Tests des règles d'accès (RLS).
--
-- Autonome : crée ses propres comptes et données dans une transaction,
-- vérifie qui peut voir / écrire quoi, puis annule tout (rollback). Ne
-- dépend d'aucune donnée réelle, sauf un exercice existant pour les votes.
--
-- Lancer : coller dans l'éditeur SQL Supabase (ou psql) et exécuter.
-- Résultat : une ligne par vérification, colonne `statut` = OK / ÉCHEC.
-- Toute ligne ÉCHEC est une régression des règles d'accès.
-- ═══════════════════════════════════════════════════════════════════

begin;

-- ── Données de test ─────────────────────────────────────────────────
insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('0c0c0c0c-0000-4000-8000-000000000001', 'rls-coach@test.invalid',    'authenticated', 'authenticated', '{"full_name":"Coach Test"}'),
  ('0a0a0a0a-0000-4000-8000-000000000001', 'rls-athlete-a@test.invalid', 'authenticated', 'authenticated', '{"full_name":"Athlète A"}'),
  ('0b0b0b0b-0000-4000-8000-000000000001', 'rls-athlete-b@test.invalid', 'authenticated', 'authenticated', '{"full_name":"Athlète B"}'),
  ('0d0d0d0d-0000-4000-8000-000000000001', 'rls-outsider@test.invalid',  'authenticated', 'authenticated', '{"full_name":"Extérieur"}'),
  ('0e0e0e0e-0000-4000-8000-000000000001', 'rls-admin@test.invalid',     'authenticated', 'authenticated', '{"full_name":"Admin Test"}');

insert into public.admin_users (user_id) values ('0e0e0e0e-0000-4000-8000-000000000001');

insert into public.classes (id, name, coach_id) values
  ('01c1a550-0000-4000-8000-000000000001', 'Cours RLS', '0c0c0c0c-0000-4000-8000-000000000001');
insert into public.class_members (class_id, athlete_id) values
  ('01c1a550-0000-4000-8000-000000000001', '0a0a0a0a-0000-4000-8000-000000000001'),
  ('01c1a550-0000-4000-8000-000000000001', '0b0b0b0b-0000-4000-8000-000000000001');

insert into public.vote_sessions (id, class_id, coach_id, title, exercise_options, status, deadline) values
  ('0f0e0000-0000-4000-8000-000000000001', '01c1a550-0000-4000-8000-000000000001', '0c0c0c0c-0000-4000-8000-000000000001', 'Vote ouvert',  '{}', 'open', null),
  ('0f0e0000-0000-4000-8000-000000000002', '01c1a550-0000-4000-8000-000000000001', '0c0c0c0c-0000-4000-8000-000000000001', 'Vote expiré',  '{}', 'open', '2020-01-01');

insert into public.workout_sessions (user_id, performed_at, active_minutes) values
  ('0a0a0a0a-0000-4000-8000-000000000001', now(), 20);

-- ── Outillage ───────────────────────────────────────────────────────
create temp table rls_results (n serial, qui text, verification text, attendu text, obtenu text, detail text) on commit drop;
grant all on rls_results to public;
grant usage on sequence rls_results_n_seq to public;

-- attendu : 'ok', 'refusé', ou 'n=K' (nombre de lignes lues par un
-- `select count(*)`, ou touchées par un insert/update/delete).
create function pg_temp.check(qui text, verification text, stmt text, attendu text) returns void
language plpgsql as $f$
declare
  rc bigint;
  obtenu text;
  detail text := null;
begin
  begin
    if attendu like 'n=%' and stmt ~* '^\s*select\s+count' then
      execute stmt into rc;
      obtenu := 'n=' || rc;
    else
      execute stmt;
      get diagnostics rc = row_count;
      obtenu := case when attendu like 'n=%' then 'n=' || rc else 'ok' end;
    end if;
  exception when others then
    obtenu := 'refusé';
    detail := left(sqlerrm, 90);
  end;
  insert into rls_results (qui, verification, attendu, obtenu, detail) values (qui, verification, attendu, obtenu, detail);
end $f$;
grant execute on function pg_temp.check(text, text, text, text) to public;

-- ── Athlète A ───────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"0a0a0a0a-0000-4000-8000-000000000001","role":"authenticated"}', true);
select pg_temp.check('athlète A', 'voit les 2 membres de son cours',
  $$select count(*) from class_members where class_id = '01c1a550-0000-4000-8000-000000000001'$$, 'n=2');
select pg_temp.check('athlète A', 'voit le profil d''un coéquipier',
  $$select count(*) from profiles where id = '0b0b0b0b-0000-4000-8000-000000000001'$$, 'n=1');
select pg_temp.check('athlète A', 'ne voit pas le profil d''un inconnu',
  $$select count(*) from profiles where id = '0d0d0d0d-0000-4000-8000-000000000001'$$, 'n=0');
select pg_temp.check('athlète A', 'voit les 2 votes de son cours',
  $$select count(*) from vote_sessions where class_id = '01c1a550-0000-4000-8000-000000000001'$$, 'n=2');
select pg_temp.check('athlète A', 'vote sur un vote ouvert',
  $$insert into exercise_votes (exercise_id, user_id, vote_session_id) select id, '0a0a0a0a-0000-4000-8000-000000000001', '0f0e0000-0000-4000-8000-000000000001' from exercises limit 1$$, 'ok');
select pg_temp.check('athlète A', 'ne peut pas voter sur un vote expiré',
  $$insert into exercise_votes (exercise_id, user_id, vote_session_id) select id, '0a0a0a0a-0000-4000-8000-000000000001', '0f0e0000-0000-4000-8000-000000000002' from exercises limit 1$$, 'refusé');
select pg_temp.check('athlète A', 'ne peut pas voter au nom d''un autre',
  $$insert into exercise_votes (exercise_id, user_id, vote_session_id) select id, '0b0b0b0b-0000-4000-8000-000000000001', '0f0e0000-0000-4000-8000-000000000001' from exercises limit 1$$, 'refusé');
select pg_temp.check('athlète A', 'ne peut pas créer une séance au nom d''un autre',
  $$insert into workout_sessions (user_id, performed_at, active_minutes) values ('0b0b0b0b-0000-4000-8000-000000000001', now(), 5)$$, 'refusé');
select pg_temp.check('athlète A', 'ne modifie pas le profil d''un autre',
  $$update profiles set full_name = 'piraté' where id = '0b0b0b0b-0000-4000-8000-000000000001'$$, 'n=0');
select pg_temp.check('athlète A', 'ne modifie pas un exercice',
  $$update exercises set name = name where id = (select id from exercises limit 1)$$, 'n=0');
select pg_temp.check('athlète A', 'ne recalcule pas les badges d''un autre',
  $$select count(*) from public.wodbud_recalc_badges('0b0b0b0b-0000-4000-8000-000000000001')$$, 'n=0');
select pg_temp.check('athlète A', 'n''ajoute pas d''option au vote du coach',
  $$insert into vote_options (vote_session_id, position) values ('0f0e0000-0000-4000-8000-000000000001', 50)$$, 'refusé');
reset role;

-- ── Athlète B ───────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"0b0b0b0b-0000-4000-8000-000000000001","role":"authenticated"}', true);
select pg_temp.check('athlète B', 'ne voit pas les séances de A',
  $$select count(*) from workout_sessions where user_id = '0a0a0a0a-0000-4000-8000-000000000001'$$, 'n=0');
select pg_temp.check('athlète B', 'quitte son cours',
  $$delete from class_members where athlete_id = '0b0b0b0b-0000-4000-8000-000000000001'$$, 'n=1');
reset role;

-- ── Extérieur (inscrit, mais dans aucun cours) ──────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"0d0d0d0d-0000-4000-8000-000000000001","role":"authenticated"}', true);
select pg_temp.check('extérieur', 'ne voit aucun membre du cours',
  $$select count(*) from class_members where class_id = '01c1a550-0000-4000-8000-000000000001'$$, 'n=0');
select pg_temp.check('extérieur', 'ne voit pas les votes du cours',
  $$select count(*) from vote_sessions where class_id = '01c1a550-0000-4000-8000-000000000001'$$, 'n=0');
select pg_temp.check('extérieur', 'ne retire pas un membre du cours',
  $$delete from class_members where athlete_id = '0a0a0a0a-0000-4000-8000-000000000001'$$, 'n=0');
reset role;

-- ── Coach ───────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"0c0c0c0c-0000-4000-8000-000000000001","role":"authenticated"}', true);
select pg_temp.check('coach', 'ajoute une option à son vote',
  $$insert into vote_options (vote_session_id, position) values ('0f0e0000-0000-4000-8000-000000000001', 50)$$, 'ok');
select pg_temp.check('coach', 'la couleur de l''option est posée par le déclencheur',
  $$select count(*) from vote_options where vote_session_id = '0f0e0000-0000-4000-8000-000000000001' and position = 50 and color is not null$$, 'n=1');
select pg_temp.check('coach', 'voit le vote de l''athlète A',
  $$select count(*) from exercise_votes where vote_session_id = '0f0e0000-0000-4000-8000-000000000001'$$, 'n=1');
reset role;

-- ── Admin ───────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"0e0e0e0e-0000-4000-8000-000000000001","role":"authenticated"}', true);
select pg_temp.check('admin', 'modifie un exercice',
  $$update exercises set name = name where id = (select id from exercises limit 1)$$, 'n=1');
select pg_temp.check('admin', 'voit les séances de l''athlète A',
  $$select count(*) from workout_sessions where user_id = '0a0a0a0a-0000-4000-8000-000000000001'$$, 'n=1');
reset role;

-- ── Visiteur anonyme ────────────────────────────────────────────────
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select pg_temp.check('anonyme', 'ne peut pas appeler is_admin()',
  $$select public.is_admin()$$, 'refusé');
select pg_temp.check('anonyme', 'ne voit aucun cours',
  $$select count(*) from classes$$, 'n=0');
select pg_temp.check('anonyme', 'lit les badges (catalogue public)',
  $$select * from badges$$, 'ok');
select pg_temp.check('anonyme', 'ouvre une page de rang partagée',
  $$select * from public.get_shared_rank('inexistant')$$, 'ok');
reset role;

-- ── Bilan ───────────────────────────────────────────────────────────
select case when attendu = obtenu then 'OK' else 'ÉCHEC' end as statut,
       qui, verification, attendu, obtenu, detail
from rls_results
order by (attendu = obtenu), n;

rollback;
