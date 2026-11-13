-- 067 — Benchmarks (phase 1, unité 1.5) : les WODs de référence que tout le
-- CrossFit connaît, livrés par WODBUD, pour mesurer sa progression sur la
-- durée. Ils appartiennent au compte admin WODBUD : la règle de lecture
-- existante (is_admin_authored) les rend visibles de tous, et seul WODBUD
-- peut les modifier.
--
-- Seuls les benchmarks dont tous les mouvements existent dans la base
-- commune sont livrés (13). Les charges sont données RX homme / femme.

alter table public.workouts add column is_benchmark boolean not null default false;

create index workouts_benchmark_idx on public.workouts (is_benchmark) where is_benchmark;

-- Seul WODBUD peut marquer un WOD comme benchmark. Les migrations (sans
-- compte connecté) et le service role passent.
create function public.wodbud_benchmark_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_benchmark is distinct from coalesce(case when tg_op = 'UPDATE' then old.is_benchmark end, false)
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'benchmark_admin_only';
  end if;
  return new;
end;
$$;
revoke execute on function public.wodbud_benchmark_guard() from public, anon, authenticated;

create trigger workouts_benchmark_guard before insert or update of is_benchmark on public.workouts
  for each row execute function public.wodbud_benchmark_guard();

-- Les WODs, avec leurs mouvements dans l'ordre. Un nom de mouvement absent
-- de la base fait échouer la migration plutôt que de livrer un WOD tronqué.
do $$
declare
  v_admin uuid := (select user_id from public.admin_users order by created_at limit 1);
  v_wod uuid;
  b jsonb;
  m jsonb;
  v_ex uuid;
  v_pos integer;
begin
  if v_admin is null then raise exception 'aucun compte admin WODBUD'; end if;

  for b in select * from jsonb_array_elements($json$[
    {"title": "Fran", "method": "for_time", "minutes": null,
     "notes": "21-15-9 répétitions de chaque mouvement, chronométré. Thrusters 43 kg / 30 kg (95 / 65 lb).",
     "moves": [["Thruster", null, "21-15-9", "43 kg / 30 kg"], ["Traction (pull-up)", null, "21-15-9", null]]},
    {"title": "Cindy", "method": "amrap", "minutes": 20,
     "notes": "Le plus de rounds possible en 20 minutes.",
     "moves": [["Traction (pull-up)", null, "5", null], ["Pompe (push-up)", null, "10", null], ["Air squat", null, "15", null]]},
    {"title": "Helen", "method": "for_time", "minutes": null,
     "notes": "3 rounds, chronométré. Kettlebell 24 kg / 16 kg.",
     "moves": [["Course à pied", 3, "400 m", null], ["Kettlebell swing", 3, "21", "24 kg / 16 kg"], ["Traction (pull-up)", 3, "12", null]]},
    {"title": "Isabel", "method": "for_time", "minutes": null,
     "notes": "30 arrachés, chronométré. 61 kg / 43 kg (135 / 95 lb).",
     "moves": [["Arraché (snatch)", null, "30", "61 kg / 43 kg"]]},
    {"title": "Karen", "method": "for_time", "minutes": null,
     "notes": "150 wall balls, chronométré. Balle 9 kg / 6 kg, cible 3 m / 2,7 m.",
     "moves": [["Wall ball", null, "150", "9 kg / 6 kg"]]},
    {"title": "Annie", "method": "for_time", "minutes": null,
     "notes": "50-40-30-20-10 répétitions de chaque mouvement, chronométré.",
     "moves": [["Corde à sauter (double-unders)", null, "50-40-30-20-10", null], ["Redressement assis (sit-up)", null, "50-40-30-20-10", null]]},
    {"title": "Murph", "method": "for_time", "minutes": null,
     "notes": "Chronométré, avec veste lestée 9 kg / 6 kg pour le RX. Les tractions, pompes et squats peuvent être fractionnés librement entre les deux courses.",
     "moves": [["Course à pied", null, "1,6 km", null], ["Traction (pull-up)", null, "100", null], ["Pompe (push-up)", null, "200", null], ["Air squat", null, "300", null], ["Course à pied", null, "1,6 km", null]]},
    {"title": "Diane", "method": "for_time", "minutes": null,
     "notes": "21-15-9 répétitions de chaque mouvement, chronométré. Soulevé de terre 102 kg / 70 kg (225 / 155 lb).",
     "moves": [["Soulevé de terre", null, "21-15-9", "102 kg / 70 kg"], ["Handstand push-up", null, "21-15-9", null]]},
    {"title": "Elizabeth", "method": "for_time", "minutes": null,
     "notes": "21-15-9 répétitions de chaque mouvement, chronométré. Épaulés en squat 61 kg / 43 kg ; dips aux anneaux.",
     "moves": [["Épaulé (clean)", null, "21-15-9", "61 kg / 43 kg"], ["Dips (répulsions)", null, "21-15-9", null]]},
    {"title": "Jackie", "method": "for_time", "minutes": null,
     "notes": "Chronométré. Thrusters avec la barre seule : 20 kg / 15 kg (45 / 35 lb).",
     "moves": [["Rameur", null, "1000 m", null], ["Thruster", null, "50", "20 kg / 15 kg"], ["Traction (pull-up)", null, "30", null]]},
    {"title": "Chelsea", "method": "emom", "minutes": 30,
     "notes": "Chaque minute pendant 30 minutes. Score : le nombre de rounds complets avant d’échouer une minute.",
     "moves": [["Traction (pull-up)", null, "5", null], ["Pompe (push-up)", null, "10", null], ["Air squat", null, "15", null]]},
    {"title": "Angie", "method": "for_time", "minutes": null,
     "notes": "Chronométré. Terminer toutes les répétitions d’un mouvement avant de passer au suivant.",
     "moves": [["Traction (pull-up)", null, "100", null], ["Pompe (push-up)", null, "100", null], ["Redressement assis (sit-up)", null, "100", null], ["Air squat", null, "100", null]]},
    {"title": "Kelly", "method": "for_time", "minutes": null,
     "notes": "5 rounds, chronométré. Boîte 60 cm / 50 cm, balle 9 kg / 6 kg.",
     "moves": [["Course à pied", 5, "400 m", null], ["Box jump", 5, "30", "60 cm / 50 cm"], ["Wall ball", 5, "30", "9 kg / 6 kg"]]}
  ]$json$::jsonb)
  loop
    if exists (select 1 from public.workouts where is_benchmark and title = b->>'title') then
      continue;
    end if;

    insert into public.workouts (title, method, duration_minutes, notes, created_by, is_benchmark)
    values (b->>'title', b->>'method', nullif(b->>'minutes', '')::integer, b->>'notes', v_admin, true)
    returning id into v_wod;

    v_pos := 0;
    for m in select * from jsonb_array_elements(b->'moves') loop
      select id into v_ex from public.exercises where name = m->>0 and center_id is null limit 1;
      if v_ex is null then raise exception 'mouvement introuvable pour %: %', b->>'title', m->>0; end if;
      v_pos := v_pos + 1;
      insert into public.workout_exercises (workout_id, exercise_id, position, sets, reps, weight)
      values (v_wod, v_ex, v_pos, nullif(m->>1, '')::integer, m->>2, nullif(m->>3, ''));
    end loop;
  end loop;
end
$$;

-- Retour arrière :
--   delete from public.workouts where is_benchmark;
--   drop trigger workouts_benchmark_guard on public.workouts; drop function public.wodbud_benchmark_guard();
--   alter table public.workouts drop column is_benchmark;
