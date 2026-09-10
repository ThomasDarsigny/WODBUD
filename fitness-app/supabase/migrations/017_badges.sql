-- ═══════════════════════════════════════════════════════════════════
-- Badges de réussite.
--
-- Distincts des rangs : les rangs mesurent le temps cumulé et forment une
-- échelle linéaire ; les badges récompensent des faits ponctuels et non
-- ordonnés. Aucun badge ne porte sur `profiles.total_minutes`, sinon les
-- deux systèmes se dévalueraient l'un l'autre.
--
-- Le catalogue vit en base, comme `ranks` : ajouter un badge est une ligne
-- SQL, pas un déploiement.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.badges (
  key           text primary key,
  position      integer not null,
  family        text    not null,
  display_fr    text    not null,
  display_en    text    not null,
  display_es    text    not null,
  condition_fr  text    not null,
  condition_en  text    not null,
  condition_es  text    not null,
  icon          text    not null,
  -- Seuil, pour afficher une progression « 7 / 10 » plutôt qu'un binaire.
  threshold     integer,
  -- false = défini mais pas encore décernable, faute de donnée à mesurer.
  -- Affiché « à venir » et non « verrouillé » : la nuance compte pour
  -- l'utilisateur, qui ne doit pas chercher comment débloquer l'impossible.
  available     boolean not null default true
);

create table if not exists public.user_badges (
  user_id     uuid not null references auth.users(id) on delete cascade,
  badge_key   text not null references public.badges(key) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, badge_key)
);

create index if not exists user_badges_user_idx on public.user_badges(user_id);

alter table public.badges      enable row level security;
alter table public.user_badges enable row level security;

drop policy if exists "badges: lecture publique" on public.badges;
create policy "badges: lecture publique" on public.badges
  for select using (true);

drop policy if exists "user_badges: voir les siens" on public.user_badges;
create policy "user_badges: voir les siens" on public.user_badges
  for select using (user_id = auth.uid() or public.is_admin());

-- Aucune policy d'écriture : seule la fonction SECURITY DEFINER ci-dessous
-- décerne. Un client ne peut pas s'auto-attribuer un badge.

-- ═══════════════════════════════════════════════════════════════════
-- Évaluation. Renvoie les clés NOUVELLEMENT débloquées, pour que le client
-- puisse célébrer au lieu de simplement rafraîchir une grille.
-- ═══════════════════════════════════════════════════════════════════
create or replace function public.wodbud_recalc_badges(p_user uuid default auth.uid())
returns setof text
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Le jour de la semaine dépend du fuseau : en UTC, une séance du vendredi
  -- 20 h à Montréal tombe le samedi. Les utilisateurs sont au Québec.
  tz constant text := 'America/Toronto';

  v_sessions    integer;
  v_longest     integer;
  v_max_minutes integer;
  v_weekend     integer;
  v_gear        integer;
  v_cardio      integer;
  v_votes       integer;
  v_joined      boolean;
  v_age_days    integer;
  v_c_classes   integer;
  v_c_workouts  integer;
  v_c_votes     integer;
  v_c_athletes  integer;
begin
  if p_user is null then
    return;
  end if;

  select count(*) into v_sessions
    from workout_sessions where user_id = p_user;

  select coalesce(longest_streak, 0) into v_longest
    from profiles where id = p_user;

  -- active_minutes est la mesure qui alimente déjà les rangs ; duration sert
  -- de repli pour les séances importées sans chrono.
  select coalesce(max(coalesce(active_minutes, duration_minutes, 0)), 0)
    into v_max_minutes
    from workout_sessions where user_id = p_user;

  select count(*) into v_weekend
    from workout_sessions
   where user_id = p_user
     and extract(isodow from (performed_at at time zone tz)) in (6, 7);

  select count(distinct w.method) into v_gear
    from workout_sessions s
    join workouts w on w.id = s.workout_id
   where s.user_id = p_user and w.method is not null;

  select count(*) into v_cardio
    from workout_sessions
   where user_id = p_user and activity_exercise_id is not null;

  select count(*) into v_votes
    from exercise_votes where user_id = p_user;

  select exists (select 1 from class_members where athlete_id = p_user)
    into v_joined;

  select coalesce(extract(day from (now() - created_at))::integer, 0)
    into v_age_days
    from profiles where id = p_user;

  select count(*) into v_c_classes  from classes       where coach_id   = p_user;
  select count(*) into v_c_workouts from workouts      where created_by = p_user;
  select count(*) into v_c_votes    from vote_sessions where coach_id   = p_user;

  select count(distinct cm.athlete_id) into v_c_athletes
    from class_members cm
    join classes c on c.id = cm.class_id
   where c.coach_id = p_user;

  return query
  with evaluated(key, earned) as (
    values
      ('streak_3',     v_longest     >= 3),
      ('streak_7',     v_longest     >= 7),
      ('streak_30',    v_longest     >= 30),
      ('streak_100',   v_longest     >= 100),
      ('first_wod',    v_sessions    >= 1),
      ('wod_10',       v_sessions    >= 10),
      ('wod_50',       v_sessions    >= 50),
      ('wod_100',      v_sessions    >= 100),
      ('wod_250',      v_sessions    >= 250),
      ('long_45',      v_max_minutes >= 45),
      ('long_90',      v_max_minutes >= 90),
      ('weekend',      v_weekend     >= 10),
      ('gear_3',       v_gear        >= 3),
      ('gear_all',     v_gear        >= 10),
      ('cardio_1',     v_cardio      >= 1),
      ('cardio_20',    v_cardio      >= 20),
      ('vote_1',       v_votes       >= 1),
      ('vote_25',      v_votes       >= 25),
      ('joined',       v_joined),
      ('year_1',       v_age_days    >= 365),
      ('coach_class',  v_c_classes   >= 1),
      ('coach_10wod',  v_c_workouts  >= 10),
      ('coach_vote',   v_c_votes     >= 10),
      ('coach_20',     v_c_athletes  >= 20)
  ),
  inserted as (
    insert into user_badges (user_id, badge_key)
    select p_user, e.key
      from evaluated e
      join badges b on b.key = e.key and b.available
     where e.earned
    on conflict (user_id, badge_key) do nothing
    returning badge_key
  )
  select badge_key from inserted;
end;
$$;

revoke all on function public.wodbud_recalc_badges(uuid) from public;
grant execute on function public.wodbud_recalc_badges(uuid) to authenticated;

comment on function public.wodbud_recalc_badges is
  'Évalue les badges d''un utilisateur depuis les données existantes et décerne ceux qui manquent. Renvoie les clés nouvellement débloquées.';
