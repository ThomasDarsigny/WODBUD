-- Tests de la planification par le coach (class_plans, migrations 037-038).
-- Autonome et annulé à la fin (rollback), comme rls_test.sql.
-- Résultat : une ligne par vérification, statut OK / ÉCHEC.

begin;

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('0c0c0c0c-0000-4000-8000-000000000001', 'plan-coach@test.invalid', 'authenticated', 'authenticated', '{"full_name":"Coach"}'),
  ('0a0a0a0a-0000-4000-8000-000000000001', 'plan-a@test.invalid', 'authenticated', 'authenticated', '{"full_name":"A"}'),
  ('0b0b0b0b-0000-4000-8000-000000000001', 'plan-b@test.invalid', 'authenticated', 'authenticated', '{"full_name":"B"}'),
  ('0e0e0e0e-0000-4000-8000-000000000009', 'plan-new@test.invalid', 'authenticated', 'authenticated', '{"full_name":"Nouveau"}'),
  ('0d0d0d0d-0000-4000-8000-000000000001', 'plan-out@test.invalid', 'authenticated', 'authenticated', '{"full_name":"Dehors"}');
insert into public.classes (id, name, coach_id) values ('01c1a550-0000-4000-8000-000000000001', 'Cours Plan', '0c0c0c0c-0000-4000-8000-000000000001');
insert into public.class_members (class_id, athlete_id) values
  ('01c1a550-0000-4000-8000-000000000001', '0a0a0a0a-0000-4000-8000-000000000001'),
  ('01c1a550-0000-4000-8000-000000000001', '0b0b0b0b-0000-4000-8000-000000000001');
insert into public.workouts (id, title, created_by) values ('0f0f0f0f-0000-4000-8000-000000000001', 'WOD du coach', '0c0c0c0c-0000-4000-8000-000000000001');
insert into public.workout_exercises (workout_id, exercise_id, position) select '0f0f0f0f-0000-4000-8000-000000000001', id, 1 from exercises limit 1;

create temp table res (n serial, qui text, verif text, attendu text, obtenu text, detail text) on commit drop;
grant all on res to public; grant usage on sequence res_n_seq to public;
create function pg_temp.check(qui text, verif text, stmt text, attendu text) returns void language plpgsql as $f$
declare rc bigint; obtenu text; detail text := null;
begin
  begin
    if attendu like 'n=%' and stmt ~* '^\s*select\s+count' then execute stmt into rc; obtenu := 'n=' || rc;
    else execute stmt; get diagnostics rc = row_count; obtenu := case when attendu like 'n=%' then 'n=' || rc else 'ok' end; end if;
  exception when others then obtenu := 'refusé'; detail := left(sqlerrm, 90); end;
  insert into res (qui, verif, attendu, obtenu, detail) values (qui, verif, attendu, obtenu, detail);
end $f$;
grant execute on function pg_temp.check(text, text, text, text) to public;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"0a0a0a0a-0000-4000-8000-000000000001","role":"authenticated"}', true);
select pg_temp.check('athlète A', 'ne peut pas créer un plan de cours', $$insert into class_plans (class_id, coach_id, scheduled_date, title) values ('01c1a550-0000-4000-8000-000000000001', '0a0a0a0a-0000-4000-8000-000000000001', current_date + 1, 'x')$$, 'refusé');
select pg_temp.check('athlète A', 'ne lit pas le WOD du coach avant le plan', $$select count(*) from workouts where id = '0f0f0f0f-0000-4000-8000-000000000001'$$, 'n=0');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"0c0c0c0c-0000-4000-8000-000000000001","role":"authenticated"}', true);
select pg_temp.check('coach', 'planifie le WOD pour le cours', $$insert into class_plans (id, class_id, coach_id, workout_id, scheduled_date) values ('0f0e0d0c-0000-4000-8000-000000000001', '01c1a550-0000-4000-8000-000000000001', '0c0c0c0c-0000-4000-8000-000000000001', '0f0f0f0f-0000-4000-8000-000000000001', current_date)$$, 'ok');
select pg_temp.check('coach', 'voit les 2 copies des athlètes', $$select count(*) from scheduled_workouts where class_plan_id = '0f0e0d0c-0000-4000-8000-000000000001'$$, 'n=2');
select pg_temp.check('coach', 'ne peut pas modifier la copie d''un athlète', $$update scheduled_workouts set title = 'x' where class_plan_id = '0f0e0d0c-0000-4000-8000-000000000001'$$, 'n=0');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"0a0a0a0a-0000-4000-8000-000000000001","role":"authenticated"}', true);
select pg_temp.check('athlète A', 'voit sa copie dans À venir', $$select count(*) from scheduled_workouts where class_plan_id = '0f0e0d0c-0000-4000-8000-000000000001'$$, 'n=1');
select pg_temp.check('athlète A', 'ne lit pas la fiche du WOD (bibliothèque intacte)', $$select count(*) from workouts where id = '0f0f0f0f-0000-4000-8000-000000000001'$$, 'n=0');
select pg_temp.check('athlète A', 'sa copie porte le titre du WOD', $$select count(*) from scheduled_workouts where class_plan_id = '0f0e0d0c-0000-4000-8000-000000000001' and title = 'WOD du coach'$$, 'n=1');
select pg_temp.check('athlète A', 'lit ses exercices (pour le chrono)', $$select count(*) from workout_exercises where workout_id = '0f0f0f0f-0000-4000-8000-000000000001'$$, 'n=1');
select pg_temp.check('athlète A', 'voit le plan du cours', $$select count(*) from class_plans where class_id = '01c1a550-0000-4000-8000-000000000001'$$, 'n=1');
select pg_temp.check('athlète A', 'fait la séance', $$insert into workout_sessions (id, user_id, workout_id, performed_at, active_minutes) values ('05e55105-0000-4000-8000-000000000001', '0a0a0a0a-0000-4000-8000-000000000001', '0f0f0f0f-0000-4000-8000-000000000001', now(), 20)$$, 'ok');
select pg_temp.check('athlète A', 'coche sa copie (lien séance)', $$update scheduled_workouts set session_id = '05e55105-0000-4000-8000-000000000001' where class_plan_id = '0f0e0d0c-0000-4000-8000-000000000001' and user_id = '0a0a0a0a-0000-4000-8000-000000000001'$$, 'n=1');
select pg_temp.check('athlète A', 'ne voit pas la copie de B', $$select count(*) from scheduled_workouts where user_id = '0b0b0b0b-0000-4000-8000-000000000001'$$, 'n=0');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"0d0d0d0d-0000-4000-8000-000000000001","role":"authenticated"}', true);
select pg_temp.check('extérieur', 'ne lit pas le WOD du coach', $$select count(*) from workouts where id = '0f0f0f0f-0000-4000-8000-000000000001'$$, 'n=0');
select pg_temp.check('extérieur', 'ne lit pas ses exercices', $$select count(*) from workout_exercises where workout_id = '0f0f0f0f-0000-4000-8000-000000000001'$$, 'n=0');
select pg_temp.check('extérieur', 'ne voit pas le plan', $$select count(*) from class_plans$$, 'n=0');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"0e0e0e0e-0000-4000-8000-000000000009","role":"authenticated"}', true);
select pg_temp.check('nouveau', 'rejoint le cours', $$insert into class_members (class_id, athlete_id) values ('01c1a550-0000-4000-8000-000000000001', '0e0e0e0e-0000-4000-8000-000000000009')$$, 'ok');
select pg_temp.check('nouveau', 'reçoit le plan à venir, avec son titre', $$select count(*) from scheduled_workouts where user_id = '0e0e0e0e-0000-4000-8000-000000000009' and title = 'WOD du coach'$$, 'n=1');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"0b0b0b0b-0000-4000-8000-000000000001","role":"authenticated"}', true);
select pg_temp.check('athlète B', 'quitte le cours', $$delete from class_members where athlete_id = '0b0b0b0b-0000-4000-8000-000000000001'$$, 'n=1');
select pg_temp.check('athlète B', 'perd sa copie non faite', $$select count(*) from scheduled_workouts where user_id = '0b0b0b0b-0000-4000-8000-000000000001'$$, 'n=0');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"0c0c0c0c-0000-4000-8000-000000000001","role":"authenticated"}', true);
select pg_temp.check('coach', 'voit 1 séance faite (A)', $$select count(*) from scheduled_workouts where class_plan_id = '0f0e0d0c-0000-4000-8000-000000000001' and session_id is not null$$, 'n=1');
select pg_temp.check('coach', 'renomme le plan', $$update class_plans set title = 'Nouveau titre' where id = '0f0e0d0c-0000-4000-8000-000000000001'$$, 'n=1');
select pg_temp.check('coach', 'le titre suit dans les copies', $$select count(*) from scheduled_workouts where class_plan_id = '0f0e0d0c-0000-4000-8000-000000000001' and title = 'Nouveau titre'$$, 'n=2');
select pg_temp.check('coach', 'supprime le plan', $$delete from class_plans where id = '0f0e0d0c-0000-4000-8000-000000000001'$$, 'n=1');
reset role;
select pg_temp.check('système', 'la séance faite de A reste au journal', $$select count(*) from workout_sessions where id = '05e55105-0000-4000-8000-000000000001'$$, 'n=1');
select pg_temp.check('système', 'plus aucune copie', $$select count(*) from scheduled_workouts where class_plan_id is not null and user_id in ('0a0a0a0a-0000-4000-8000-000000000001','0e0e0e0e-0000-4000-8000-000000000009')$$, 'n=0');

select case when attendu = obtenu then 'OK' else 'ÉCHEC' end as statut, qui, verif, attendu, obtenu, detail from res order by (attendu = obtenu), n;
rollback;
