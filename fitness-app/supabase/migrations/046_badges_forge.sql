-- 046 — Collection de badges « Forge ».
--
-- Chaque badge reçoit un visuel (public/badges/<art>.svg) et une rareté
-- (commun → mythique). Les badges déjà gagnés sont conservés : on ne fait
-- qu'habiller le catalogue, renommer ceux qui correspondent exactement à la
-- collection et ajouter les badges que l'app sait désormais mesurer.

alter table public.badges
  add column if not exists art text,
  add column if not exists rarity text
    check (rarity is null or rarity in ('commun', 'rare', 'epique', 'legendaire', 'mythique'));

-- Nouveaux badges mesurables.
insert into public.badges (key, position, family, display_fr, display_en, display_es, condition_fr, condition_en, condition_es, icon, threshold, available) values
  ('wod_5',      55,  'volume',   'Habitude',         'Habit',        'Hábito',          '5 séances terminées',                      '5 sessions completed',             '5 sesiones completadas',                 'dumbbell', 5,  true),
  ('wod_30',     65,  'volume',   'Dévouement',       'Devotion',     'Dedicación',      '30 séances terminées',                     '30 sessions completed',            '30 sesiones completadas',                'dumbbell', 30, true),
  ('early_1',    121, 'horaires', 'Lève-tôt',         'Early bird',   'Madrugador',      'Commencer une séance avant 7 h',           'Start a session before 7 a.m.',    'Empezar una sesión antes de las 7',      'clock',    1,  true),
  ('late_1',     122, 'horaires', 'Nocturne',         'Night owl',    'Nocturno',        'Commencer une séance après 21 h',          'Start a session after 9 p.m.',     'Empezar una sesión después de las 21 h', 'clock',    1,  true),
  ('week_5',     125, 'horaires', 'Sans relâche',     'Relentless',   'Sin descanso',    '5 séances dans la même semaine',           '5 sessions in the same week',      '5 sesiones en la misma semana',          'flame',    5,  true),
  ('result_1',   245, 'suivi',    'Premier résultat', 'First result', 'Primer resultado','Noter un premier résultat sur un mouvement','Log a first result on a movement', 'Anotar un primer resultado',             'medal',    1,  true),
  ('pr_10',      252, 'suivi',    'Dépassement',      'Breakthrough', 'Superación',      'Battre 10 records personnels',             'Beat 10 personal records',         'Batir 10 récords personales',            'medal',    10, true),
  ('results_50', 255, 'suivi',    'Volume',           'Volume',       'Volumen',         '50 résultats notés',                       '50 results logged',                '50 resultados anotados',                 'medal',    50, true)
on conflict (key) do nothing;

-- Noms de la collection là où le critère est le même.
update public.badges set display_fr = 'Premier pas', display_en = 'First step',  display_es = 'Primer paso' where key = 'first_wod';
update public.badges set display_fr = 'Discipline',  display_en = 'Discipline',  display_es = 'Disciplina'  where key = 'wod_10';
update public.badges set display_fr = 'Machine',     display_en = 'Machine',     display_es = 'Máquina'     where key = 'wod_100';
update public.badges set display_fr = 'Légende',     display_en = 'Legend',      display_es = 'Leyenda'     where key = 'wod_250';
update public.badges set display_fr = 'Invincible',  display_en = 'Invincible',  display_es = 'Invencible'  where key = 'streak_100';

-- Les records existent depuis 044 : le badge devient atteignable.
update public.badges
   set available = true,
       condition_fr = 'Battre un record personnel (charge, temps ou répétitions)',
       condition_en = 'Beat a personal record (load, time or reps)',
       condition_es = 'Batir un récord personal (carga, tiempo o repeticiones)'
 where key = 'pr';

-- Visuel et rareté de chaque badge.
update public.badges b
   set art = v.art, rarity = v.rarity
  from (values
  ('first_wod', 'premier-pas', 'commun'),
  ('wod_5', 'habitude', 'commun'),
  ('wod_10', 'discipline', 'rare'),
  ('wod_30', 'devouement', 'epique'),
  ('wod_100', 'machine', 'legendaire'),
  ('result_1', 'premiere-serie', 'commun'),
  ('wod_50', 'perseverance', 'epique'),
  ('results_50', 'volume', 'epique'),
  ('pr', 'record-personnel', 'rare'),
  ('pr_10', 'depassement', 'legendaire'),
  ('streak_3', 'eveil', 'commun'),
  ('streak_30', 'evolution', 'epique'),
  ('long_90', 'puissance', 'epique'),
  ('streak_7', 'constance', 'rare'),
  ('year_1', 'transformation', 'legendaire'),
  ('early_1', 'leve-tot', 'rare'),
  ('late_1', 'nocturne', 'rare'),
  ('week_5', 'sans-relache', 'epique'),
  ('streak_100', 'invincible', 'mythique'),
  ('wod_250', 'legende', 'mythique'),
  ('long_45', 'chrono', 'rare'),
  ('weekend', 'week-end', 'rare'),
  ('gear_3', 'polyvalent', 'commun'),
  ('gear_all', 'arsenal', 'legendaire'),
  ('cardio_1', 'souffle', 'commun'),
  ('cardio_20', 'souffle-long', 'rare'),
  ('vote_1', 'urne', 'commun'),
  ('rank_shared', 'porte-voix', 'commun'),
  ('vote_25', 'bulletin', 'rare'),
  ('vote_50', 'pilier', 'epique'),
  ('multi_class_voter', 'voix-partout', 'rare'),
  ('joined', 'membre', 'commun'),
  ('class_veteran', 'veteran', 'epique'),
  ('multi_class', 'multi-boites', 'rare'),
  ('community_challenge', 'defi', 'epique'),
  ('community_wod_10', 'fidele', 'rare'),
  ('year_2', 'deux-ans', 'legendaire'),
  ('coach_class', 'sifflet', 'commun'),
  ('coach_10wod', 'architecte', 'rare'),
  ('coach_vote', 'tribune', 'rare'),
  ('coach_20', 'plein-la-box', 'epique'),
  ('attendance', 'presence', 'rare')
  ) as v(key, art, rarity)
 where b.key = v.key;

-- Évaluation : les critères d'avant, plus records, résultats, horaires et
-- semaines chargées. Les heures s'entendent dans le fuseau de l'app.
create or replace function public.wodbud_recalc_badges(p_user uuid default auth.uid())
returns setof text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
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
  v_rank_shared         boolean;
  v_class_tenured       boolean;
  v_multi_class         integer;
  v_multi_class_voter   integer;
  v_community_challenge boolean;
  v_community_wods      integer;
  -- Ajouts « Forge » (046)
  v_results     integer;
  v_prs         integer;
  v_early       boolean;
  v_late        boolean;
  v_busy_week   integer;
begin
  if p_user is null or (p_user <> auth.uid() and not public.is_admin()) then return; end if;

  select count(*) into v_sessions
    from workout_sessions where user_id = p_user;

  select coalesce(longest_streak, 0) into v_longest
    from profiles where id = p_user;

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

  -- Partage de rang : un fait acquis, même si le lien a été révoqué depuis.
  select exists (select 1 from rank_shares where user_id = p_user)
    into v_rank_shared;

  select exists (
      select 1 from class_members
       where athlete_id = p_user and joined_at <= now() - interval '180 days'
    ) into v_class_tenured;

  select count(distinct class_id) into v_multi_class
    from class_members where athlete_id = p_user;

  select count(distinct vs.class_id) into v_multi_class_voter
    from exercise_votes ev
    join vote_sessions vs on vs.id = ev.vote_session_id
   where ev.user_id = p_user;

  -- Défi relevé : un défi d'une de ses communautés a atteint sa cible
  -- (minutes des membres qui partagent leur rang, pendant la période) et
  -- on y a contribué.
  select exists (
      select 1
        from community_challenges ch
        join community_members me on me.community_id = ch.community_id
                                 and me.user_id = p_user and me.share_rank
       where exists (
               select 1 from workout_sessions s
                where s.user_id = p_user
                  and (s.started_at at time zone tz)::date between ch.starts_on and ch.ends_on
                  and s.active_minutes > 0)
         and (select coalesce(sum(s.active_minutes), 0)
                from workout_sessions s
                join community_members cm on cm.user_id = s.user_id
                                         and cm.community_id = ch.community_id
                                         and cm.share_rank
               where (s.started_at at time zone tz)::date between ch.starts_on and ch.ends_on
             ) >= ch.target_minutes
    ) into v_community_challenge;

  -- WOD de communauté : séances faites sur un WOD épinglé dans une de
  -- ses communautés, après son épinglage.
  select count(distinct s.id) into v_community_wods
    from workout_sessions s
    join community_wods cw on cw.workout_id = s.workout_id and s.started_at >= cw.pinned_at
    join community_members cm on cm.community_id = cw.community_id and cm.user_id = p_user
   where s.user_id = p_user;

  -- Résultats notés (044).
  select count(*) into v_results
    from exercise_results where user_id = p_user;

  -- Records battus : un résultat qui dépasse le meilleur des résultats
  -- précédents sur le même mouvement, dans la même famille (charge, temps,
  -- répétitions) — la même règle que l'app (lib/records.ts, isNewRecord).
  select count(*) into v_prs
    from (
      select r.weight_kg, r.seconds, r.reps,
             max(r.weight_kg) over w as prev_w,
             min(r.seconds) filter (where r.weight_kg is null) over w as prev_s,
             max(r.reps) filter (where r.weight_kg is null and r.seconds is null) over w as prev_r
        from exercise_results r
       where r.user_id = p_user
      window w as (partition by r.exercise_id order by r.performed_at, r.created_at
                   rows between unbounded preceding and 1 preceding)
    ) x
   where (x.weight_kg is not null and x.prev_w is not null and x.weight_kg > x.prev_w)
      or (x.weight_kg is null and x.seconds is not null and x.prev_s is not null and x.seconds < x.prev_s)
      or (x.weight_kg is null and x.seconds is null and x.reps is not null and x.prev_r is not null and x.reps > x.prev_r);

  -- Horaires : séance réelle (au moins une minute active) commencée tôt ou tard.
  select exists (
      select 1 from workout_sessions
       where user_id = p_user and active_minutes > 0
         and extract(hour from (started_at at time zone tz)) < 7
    ) into v_early;

  select exists (
      select 1 from workout_sessions
       where user_id = p_user and active_minutes > 0
         and extract(hour from (started_at at time zone tz)) >= 21
    ) into v_late;

  -- Semaine la plus chargée (lundi → dimanche).
  select coalesce(max(n), 0) into v_busy_week
    from (
      select count(*) as n
        from workout_sessions
       where user_id = p_user and active_minutes > 0
       group by date_trunc('week', started_at at time zone tz)
    ) w;

  return query
  with evaluated(key, earned) as (
    values
      ('streak_3',     v_longest     >= 3),
      ('streak_7',     v_longest     >= 7),
      ('streak_30',    v_longest     >= 30),
      ('streak_100',   v_longest     >= 100),
      ('first_wod',    v_sessions    >= 1),
      ('wod_5',        v_sessions    >= 5),
      ('wod_10',       v_sessions    >= 10),
      ('wod_30',       v_sessions    >= 30),
      ('wod_50',       v_sessions    >= 50),
      ('wod_100',      v_sessions    >= 100),
      ('wod_250',      v_sessions    >= 250),
      ('long_45',      v_max_minutes >= 45),
      ('long_90',      v_max_minutes >= 90),
      ('weekend',      v_weekend     >= 10),
      ('early_1',      v_early),
      ('late_1',       v_late),
      ('week_5',       v_busy_week   >= 5),
      ('gear_3',       v_gear        >= 3),
      ('gear_all',     v_gear        >= 10),
      ('cardio_1',     v_cardio      >= 1),
      ('cardio_20',    v_cardio      >= 20),
      ('vote_1',       v_votes       >= 1),
      ('vote_25',      v_votes       >= 25),
      ('vote_50',      v_votes       >= 50),
      ('joined',       v_joined),
      ('year_1',       v_age_days    >= 365),
      ('year_2',       v_age_days    >= 730),
      ('coach_class',  v_c_classes   >= 1),
      ('coach_10wod',  v_c_workouts  >= 10),
      ('coach_vote',   v_c_votes     >= 10),
      ('coach_20',     v_c_athletes  >= 20),
      ('rank_shared',         v_rank_shared),
      ('class_veteran',       v_class_tenured),
      ('multi_class',         v_multi_class       >= 2),
      ('multi_class_voter',   v_multi_class_voter >= 3),
      ('community_challenge', v_community_challenge),
      ('community_wod_10',    v_community_wods >= 10),
      ('result_1',     v_results     >= 1),
      ('results_50',   v_results     >= 50),
      ('pr',           v_prs         >= 1),
      ('pr_10',        v_prs         >= 10)
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
$function$;
