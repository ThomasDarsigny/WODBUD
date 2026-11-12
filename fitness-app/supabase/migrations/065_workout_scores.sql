-- 065 — Le score d'un WOD (phase 1, unité 1.1). Jusqu'ici une séance ne
-- gardait que des minutes et des étoiles. Un WOD se mesure selon sa méthode :
--   time         For Time : secondes (et « capped » si le temps limite est
--                tombé, avec les répétitions faites)
--   rounds_reps  AMRAP : rounds complets + répétitions du round entamé
--   reps         EMOM, Tabata, Rounds : répétitions totales
--   load         Force : charge en kg (la plus lourde réussie) et répétitions
-- Chaque score dit aussi s'il a été fait RX (tel que prescrit) ou adapté.
--
-- Une séance = au plus un score. Les règles d'accès suivent la séance :
-- chacun gère les siens. La lecture par la classe (tableau blanc, 1.4)
-- viendra par une fonction dédiée, pas par une règle large ici.

create table public.workout_scores (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.workout_sessions(id) on delete cascade,
  workout_id uuid not null references public.workouts(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  score_type text not null check (score_type in ('time', 'rounds_reps', 'reps', 'load')),
  seconds integer check (seconds is null or seconds between 1 and 86400),
  rounds integer check (rounds is null or rounds between 0 and 10000),
  reps integer check (reps is null or reps between 0 and 100000),
  load_kg numeric(6, 2) check (load_kg is null or load_kg between 0 and 2000),
  capped boolean not null default false,
  rx text not null default 'rx' check (rx in ('rx', 'scaled')),
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- La valeur attendue par le type doit être là ; les autres restent vides.
  check (
    (score_type = 'time' and seconds is not null and rounds is null and load_kg is null)
    or (score_type = 'rounds_reps' and rounds is not null and reps is not null and seconds is null and load_kg is null)
    or (score_type = 'reps' and reps is not null and seconds is null and rounds is null and load_kg is null)
    or (score_type = 'load' and load_kg is not null and seconds is null and rounds is null)
  )
);

create index workout_scores_workout_idx on public.workout_scores (workout_id, created_at desc);
create index workout_scores_user_idx on public.workout_scores (user_id, created_at desc);

alter table public.workout_scores enable row level security;

-- La séance doit être à moi : on ne note pas la séance d'un autre.
create policy "workout_scores: gérer les siens" on public.workout_scores for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = (select auth.uid()) and s.workout_id = workout_id)
  );

create function public.wodbud_touch_workout_score()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke execute on function public.wodbud_touch_workout_score() from public, anon, authenticated;

create trigger workout_scores_touch before update on public.workout_scores
  for each row execute function public.wodbud_touch_workout_score();

-- Retour arrière : drop table public.workout_scores; drop function public.wodbud_touch_workout_score();
