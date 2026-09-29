-- ═══════════════════════════════════════════════════════════════════
-- Étoffe la famille de badges « communaute » : 4 → 10.
--
-- Uniquement des faits déjà mesurables avec les tables existantes — aucune
-- fonctionnalité de communauté n'existe encore (voir la branche `commu`,
-- pas construite). Ces badges récompensent l'appartenance et la
-- participation au sein du modèle actuel (classes, votes, partage de rang),
-- pas une fonctionnalité qui n'existe pas.
-- ═══════════════════════════════════════════════════════════════════

insert into public.badges
  (key, position, family, display_fr, display_en, display_es,
   condition_fr, condition_en, condition_es, icon, threshold, available)
values
  ('rank_shared', 175, 'communaute', 'Ambassadeur', 'Ambassador', 'Embajador',
   'A partagé son rang publiquement', 'Shared their rank publicly', 'Compartió su rango públicamente', 'rank', 1, true),
  ('vote_50', 185, 'communaute', 'Pilier du scrutin', 'Ballot Regular', 'Pilar del escrutinio',
   '50 votes déposés', '50 votes cast', '50 votos emitidos', 'vote', 50, true),
  ('multi_class_voter', 187, 'communaute', 'Voix partout', 'Voice Everywhere', 'Voz en todas partes',
   'A voté dans 3 cours différents', 'Voted in 3 different classes', 'Votó en 3 clases diferentes', 'vote', 3, true),
  ('class_veteran', 193, 'communaute', 'Vétéran', 'Veteran', 'Veterano',
   'Membre d''un cours depuis 6 mois', 'Member of a class for 6 months', 'Miembro de una clase desde hace 6 meses', 'calendar', 180, true),
  ('multi_class', 196, 'communaute', 'Multi-boîtes', 'Multi-Box', 'Multi-box',
   'Membre de 2 cours ou plus', 'Member of 2 or more classes', 'Miembro de 2 o más clases', 'classes', 2, true),
  ('year_2', 205, 'communaute', 'Deux ans', 'Two Years', 'Dos años',
   '730 jours depuis l''inscription', '730 days since signup', '730 días desde el registro', 'star', 730, true);

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
  -- Ajouts communauté
  v_rank_shared        boolean;
  v_class_tenured       boolean;
  v_multi_class          integer;
  v_multi_class_voter    integer;
begin
  if p_user is null then
    return;
  end if;

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
      ('vote_50',      v_votes       >= 50),
      ('joined',       v_joined),
      ('year_1',       v_age_days    >= 365),
      ('year_2',       v_age_days    >= 730),
      ('coach_class',  v_c_classes   >= 1),
      ('coach_10wod',  v_c_workouts  >= 10),
      ('coach_vote',   v_c_votes     >= 10),
      ('coach_20',     v_c_athletes  >= 20),
      ('rank_shared',        v_rank_shared),
      ('class_veteran',      v_class_tenured),
      ('multi_class',        v_multi_class       >= 2),
      ('multi_class_voter',  v_multi_class_voter >= 3)
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
