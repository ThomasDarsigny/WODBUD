-- 043 — Communautés : rôles, défis, fil d'activité, classements, WOD
-- de la communauté, badges, profil d'un membre.
--
-- Règle de confidentialité, partout : les minutes, séances, badges et rang
-- d'un membre ne sortent que s'il partage son rang dans CETTE communauté
-- (`share_rank`, 042), et seulement vers les autres membres. Les défis
-- comptent donc uniquement les minutes de ceux qui partagent.

-- ── Rôles ───────────────────────────────────────────────────────────
-- Le créateur (`communities.created_by`) est propriétaire ; il peut nommer
-- des co-admins. Propriétaire et co-admins modèrent.

alter table public.community_members
  add column role text not null default 'member' check (role in ('member', 'admin'));

create or replace function public.is_community_member(p_community uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.community_members
    where community_id = p_community and user_id = (select auth.uid())
  );
$$;

create or replace function public.is_community_owner(p_community uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.communities
    where id = p_community and created_by = (select auth.uid())
  );
$$;

create or replace function public.is_community_admin(p_community uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_community_owner(p_community)
      or exists (
           select 1 from public.community_members
           where community_id = p_community and user_id = (select auth.uid()) and role = 'admin'
         )
      or public.is_admin();
$$;

revoke execute on function public.is_community_member(uuid), public.is_community_owner(uuid), public.is_community_admin(uuid) from public, anon;
grant execute on function public.is_community_member(uuid), public.is_community_owner(uuid), public.is_community_admin(uuid) to authenticated;

-- Le propriétaire change les rôles ; chacun ne change que son propre partage.
create policy "community_members: propriétaire gère les rôles" on public.community_members
  for update to authenticated
  using (public.is_community_owner(community_id))
  with check (public.is_community_owner(community_id));

create or replace function public.wodbud_guard_community_member()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is null or public.is_admin() then
    return new;
  end if;
  if new.community_id is distinct from old.community_id or new.user_id is distinct from old.user_id then
    raise exception 'Membre non modifiable.' using errcode = 'check_violation';
  end if;
  if new.role is distinct from old.role and not public.is_community_owner(old.community_id) then
    raise exception 'Seul le propriétaire change les rôles.' using errcode = 'check_violation';
  end if;
  if new.share_rank is distinct from old.share_rank and old.user_id <> (select auth.uid()) then
    raise exception 'Chacun décide seul de partager son rang.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke execute on function public.wodbud_guard_community_member() from public, anon, authenticated;

create trigger wodbud_community_members_guard
  before update on public.community_members
  for each row execute function public.wodbud_guard_community_member();

-- Retirer : soi-même ; un co-admin retire un membre, jamais le propriétaire.
drop policy "community_members: quitter ou retirer" on public.community_members;
create policy "community_members: quitter ou retirer" on public.community_members
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_admin())
    or (
      public.is_community_admin(community_id)
      and not exists (
        select 1 from public.communities c
        where c.id = community_id and c.created_by = community_members.user_id
      )
    )
  );

-- ── Défis ───────────────────────────────────────────────────────────

create table public.community_challenges (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  target_minutes integer not null check (target_minutes between 1 and 1000000),
  starts_on date not null,
  ends_on date not null,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on and ends_on - starts_on <= 92)
);
create index community_challenges_community_idx on public.community_challenges (community_id);

alter table public.community_challenges enable row level security;
revoke all on public.community_challenges from anon;

create policy "community_challenges: lire" on public.community_challenges
  for select to authenticated using (true);
create policy "community_challenges: admin crée" on public.community_challenges
  for insert to authenticated with check (public.is_community_admin(community_id));
create policy "community_challenges: admin supprime" on public.community_challenges
  for delete to authenticated using (public.is_community_admin(community_id));

create or replace function public.get_community_challenges(p_community uuid)
returns table (
  id uuid, title text, target_minutes integer, starts_on date, ends_on date,
  progress_minutes integer, contributors integer
)
language sql stable security definer set search_path = '' as $$
  select ch.id, ch.title, ch.target_minutes, ch.starts_on, ch.ends_on,
         coalesce(agg.minutes, 0)::integer,
         coalesce(agg.people, 0)::integer
  from public.community_challenges ch
  left join lateral (
    select sum(s.active_minutes) as minutes, count(distinct s.user_id) filter (where s.active_minutes > 0) as people
    from public.workout_sessions s
    join public.community_members cm on cm.user_id = s.user_id
                                    and cm.community_id = ch.community_id
                                    and cm.share_rank
    where (s.started_at at time zone 'America/Toronto')::date between ch.starts_on and ch.ends_on
  ) agg on true
  where ch.community_id = p_community
    and public.is_community_member(p_community)
  order by (ch.ends_on >= (now() at time zone 'America/Toronto')::date) desc, ch.ends_on desc;
$$;

-- ── Classement de la semaine / du mois ──────────────────────────────

create or replace function public.get_community_leaderboard_since(p_community uuid, p_since timestamptz)
returns table (user_id uuid, display_name text, avatar_url text, minutes integer, is_me boolean)
language sql stable security definer set search_path = '' as $$
  select cm.user_id,
         coalesce(nullif(btrim(p.full_name), ''), 'Athlète WODBUD'),
         p.avatar_url,
         coalesce((
           select sum(s.active_minutes) from public.workout_sessions s
           where s.user_id = cm.user_id and s.started_at >= p_since
         ), 0)::integer,
         cm.user_id = (select auth.uid())
  from public.community_members cm
  join public.profiles p on p.id = cm.user_id
  where cm.community_id = p_community
    and cm.share_rank
    and p_since >= now() - interval '32 days'
    and public.is_community_member(p_community)
  order by 4 desc, 2;
$$;

-- ── WOD de la communauté ────────────────────────────────────────────

create table public.community_wods (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  workout_id uuid not null references public.workouts(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  note text check (note is null or char_length(note) <= 300),
  pinned_by uuid default auth.uid() references public.profiles(id) on delete set null,
  pinned_at timestamptz not null default now()
);
create index community_wods_community_idx on public.community_wods (community_id, pinned_at desc);
create index community_wods_workout_idx on public.community_wods (workout_id);

alter table public.community_wods enable row level security;
revoke all on public.community_wods from anon;

create policy "community_wods: lire" on public.community_wods
  for select to authenticated using (true);
-- Un admin de la communauté épingle un de SES WODs.
create policy "community_wods: admin épingle" on public.community_wods
  for insert to authenticated with check (
    public.is_community_admin(community_id)
    and exists (select 1 from public.workouts w where w.id = workout_id and w.created_by = (select auth.uid()))
  );
create policy "community_wods: admin retire" on public.community_wods
  for delete to authenticated using (public.is_community_admin(community_id));

-- Les membres lisent les exercices du WOD épinglé (pour le lancer), sans
-- que la fiche du WOD n'entre dans leur bibliothèque.
drop policy "workout_exercises: lire" on public.workout_exercises;
create policy "workout_exercises: lire" on public.workout_exercises
  for select to authenticated using (
    exists (
      select 1 from public.workouts w
      where w.id = workout_exercises.workout_id
        and (w.created_by = (select auth.uid()) or (select public.is_admin()) or public.is_admin_authored(w.created_by))
    )
    or exists (
      select 1 from public.class_plans cp
      where cp.workout_id = workout_exercises.workout_id and public.is_class_member(cp.class_id)
    )
    or exists (
      select 1 from public.community_wods cw
      where cw.workout_id = workout_exercises.workout_id and public.is_community_member(cw.community_id)
    )
  );

create or replace function public.get_community_wod(p_community uuid)
returns table (
  id uuid, workout_id uuid, title text, note text, pinned_at timestamptz,
  done_by jsonb, i_did boolean
)
language sql stable security definer set search_path = '' as $$
  select cw.id, cw.workout_id, cw.title, cw.note, cw.pinned_at,
         coalesce((
           select jsonb_agg(jsonb_build_object(
                    'user_id', d.user_id, 'display_name', d.display_name,
                    'avatar_url', d.avatar_url, 'minutes', d.minutes)
                  order by d.minutes desc)
           from (
             select s.user_id,
                    coalesce(nullif(btrim(p.full_name), ''), 'Athlète WODBUD') as display_name,
                    p.avatar_url,
                    max(s.active_minutes) as minutes
             from public.workout_sessions s
             join public.community_members cm on cm.user_id = s.user_id
                                             and cm.community_id = cw.community_id
                                             and (cm.share_rank or cm.user_id = (select auth.uid()))
             join public.profiles p on p.id = s.user_id
             where s.workout_id = cw.workout_id and s.started_at >= cw.pinned_at
             group by s.user_id, p.full_name, p.avatar_url
           ) d
         ), '[]'::jsonb),
         exists (
           select 1 from public.workout_sessions s
           where s.workout_id = cw.workout_id and s.started_at >= cw.pinned_at
             and s.user_id = (select auth.uid())
         )
  from public.community_wods cw
  where cw.community_id = p_community
    and public.is_community_member(p_community)
  order by cw.pinned_at desc
  limit 1;
$$;

-- ── Fil d'activité et réactions ─────────────────────────────────────

create table public.community_reactions (
  community_id uuid not null references public.communities(id) on delete cascade,
  event_key text not null check (char_length(event_key) <= 120),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  emoji text not null check (emoji in ('fire', 'muscle', 'clap')),
  created_at timestamptz not null default now(),
  primary key (community_id, event_key, user_id, emoji)
);

alter table public.community_reactions enable row level security;
revoke all on public.community_reactions from anon;

create policy "community_reactions: lire" on public.community_reactions
  for select to authenticated using (public.is_community_member(community_id));
create policy "community_reactions: réagir" on public.community_reactions
  for insert to authenticated with check (
    user_id = (select auth.uid()) and public.is_community_member(community_id)
  );
create policy "community_reactions: retirer" on public.community_reactions
  for delete to authenticated using (user_id = (select auth.uid()));

-- Séances terminées, badges débloqués et changements de rang des membres
-- qui partagent, sur 30 jours.
create or replace function public.get_community_feed(p_community uuid, p_limit integer default 40)
returns table (
  event_key text, kind text, at timestamptz,
  user_id uuid, display_name text, avatar_url text, is_me boolean,
  title text, minutes integer, badge_key text, rank_key text,
  fire integer, muscle integer, clap integer, my_reactions text[]
)
language sql stable security definer set search_path = '' as $$
  with sharers as (
    select cm.user_id,
           coalesce(nullif(btrim(p.full_name), ''), 'Athlète WODBUD') as display_name,
           p.avatar_url
    from public.community_members cm
    join public.profiles p on p.id = cm.user_id
    where cm.community_id = p_community and cm.share_rank
      and public.is_community_member(p_community)
  ),
  sessions as (
    select s.*,
           sum(s.active_minutes) over (partition by s.user_id order by s.started_at, s.id) as cum
    from public.workout_sessions s
    where s.user_id in (select user_id from sharers)
  ),
  events as (
    select 'session:' || s.id as event_key, 'session' as kind, coalesce(s.ended_at, s.started_at) as at,
           s.user_id, coalesce(w.title, e.name) as title, s.active_minutes as minutes,
           null::text as badge_key, null::text as rank_key
    from sessions s
    left join public.workouts w on w.id = s.workout_id
    left join public.exercises e on e.id = s.activity_exercise_id
    where s.started_at >= now() - interval '30 days' and s.active_minutes > 0
    union all
    select 'rank:' || s.id, 'rank', coalesce(s.ended_at, s.started_at), s.user_id, null, null, null,
           public.wodbud_rank_for_minutes(s.cum::integer)
    from sessions s
    where s.started_at >= now() - interval '30 days'
      and public.wodbud_rank_for_minutes(s.cum::integer)
          is distinct from public.wodbud_rank_for_minutes((s.cum - s.active_minutes)::integer)
    union all
    select 'badge:' || ub.user_id || ':' || ub.badge_key, 'badge', ub.unlocked_at, ub.user_id, null, null, ub.badge_key, null
    from public.user_badges ub
    where ub.user_id in (select user_id from sharers)
      and ub.unlocked_at >= now() - interval '30 days'
  )
  select ev.event_key, ev.kind, ev.at, ev.user_id, sh.display_name, sh.avatar_url,
         ev.user_id = (select auth.uid()),
         ev.title, ev.minutes, ev.badge_key, ev.rank_key,
         count(r.*) filter (where r.emoji = 'fire')::integer,
         count(r.*) filter (where r.emoji = 'muscle')::integer,
         count(r.*) filter (where r.emoji = 'clap')::integer,
         coalesce(array_agg(r.emoji) filter (where r.user_id = (select auth.uid())), '{}')
  from events ev
  join sharers sh on sh.user_id = ev.user_id
  left join public.community_reactions r on r.community_id = p_community and r.event_key = ev.event_key
  group by ev.event_key, ev.kind, ev.at, ev.user_id, sh.display_name, sh.avatar_url, ev.title, ev.minutes, ev.badge_key, ev.rank_key
  order by ev.at desc
  limit least(greatest(p_limit, 1), 100);
$$;

-- ── Profil d'un membre ──────────────────────────────────────────────

create or replace function public.get_community_member_profile(p_community uuid, p_user uuid)
returns table (
  user_id uuid, display_name text, avatar_url text, role text, is_owner boolean,
  visible boolean, rank_key text, total_minutes integer, current_streak integer,
  longest_streak integer, social_links jsonb, badges jsonb
)
language sql stable security definer set search_path = '' as $$
  select cm.user_id,
         coalesce(nullif(btrim(p.full_name), ''), 'Athlète WODBUD'),
         p.avatar_url,
         cm.role,
         c.created_by = cm.user_id,
         v.visible,
         case when v.visible then public.wodbud_rank_for_minutes(p.total_minutes) end,
         case when v.visible then p.total_minutes end,
         case when v.visible then p.current_streak end,
         case when v.visible then p.longest_streak end,
         case when v.visible then p.social_links end,
         case when v.visible then coalesce((
           select jsonb_agg(jsonb_build_object('key', ub.badge_key, 'unlocked_at', ub.unlocked_at) order by ub.unlocked_at desc)
           from public.user_badges ub where ub.user_id = cm.user_id
         ), '[]'::jsonb) end
  from public.community_members cm
  join public.profiles p on p.id = cm.user_id
  join public.communities c on c.id = cm.community_id
  cross join lateral (
    select public.is_community_member(p_community)
           and (cm.share_rank or cm.user_id = (select auth.uid())) as visible
  ) v
  where cm.community_id = p_community and cm.user_id = p_user
    and (select auth.uid()) is not null;
$$;

-- La liste des membres renvoie aussi le rôle (pour les badges « admin »).
drop function public.get_community_members(uuid);
create function public.get_community_members(p_community uuid)
returns table (
  user_id uuid, display_name text, avatar_url text, joined_at timestamptz,
  is_me boolean, share_rank boolean, rank_key text, total_minutes integer,
  current_streak integer, badges bigint, role text, is_owner boolean
)
language sql stable security definer set search_path = '' as $$
  with me as (
    select (select auth.uid()) as uid, public.is_community_member(p_community) as is_member
  )
  select cm.user_id,
         coalesce(nullif(btrim(p.full_name), ''), 'Athlète WODBUD'),
         p.avatar_url,
         cm.joined_at,
         cm.user_id = me.uid,
         cm.share_rank,
         case when visible then public.wodbud_rank_for_minutes(p.total_minutes) end,
         case when visible then p.total_minutes end,
         case when visible then p.current_streak end,
         case when visible then (select count(*) from public.user_badges ub where ub.user_id = cm.user_id) end,
         cm.role,
         c.created_by = cm.user_id
  from public.community_members cm
  join public.profiles p on p.id = cm.user_id
  join public.communities c on c.id = cm.community_id
  cross join me
  cross join lateral (
    select me.is_member and (cm.share_rank or cm.user_id = me.uid) as visible
  ) v
  where cm.community_id = p_community
    and me.uid is not null
  order by v.visible desc, case when v.visible then p.total_minutes end desc nulls last, cm.joined_at;
$$;

revoke execute on function
  public.get_community_challenges(uuid),
  public.get_community_leaderboard_since(uuid, timestamptz),
  public.get_community_wod(uuid),
  public.get_community_feed(uuid, integer),
  public.get_community_member_profile(uuid, uuid),
  public.get_community_members(uuid)
from public, anon;
grant execute on function
  public.get_community_challenges(uuid),
  public.get_community_leaderboard_since(uuid, timestamptz),
  public.get_community_wod(uuid),
  public.get_community_feed(uuid, integer),
  public.get_community_member_profile(uuid, uuid),
  public.get_community_members(uuid)
to authenticated;

-- ── Badges de communauté ────────────────────────────────────────────

insert into public.badges
  (key, position, family, display_fr, display_en, display_es,
   condition_fr, condition_en, condition_es, icon, threshold, available)
values
  ('community_challenge', 197, 'communaute', 'Défi relevé', 'Challenge Crushed', 'Reto superado',
   'A contribué à un défi de communauté réussi', 'Helped a community challenge reach its goal', 'Contribuyó a un reto de comunidad cumplido', 'star', 1, true),
  ('community_wod_10', 198, 'communaute', 'Fidèle de la commu', 'Community Regular', 'Fiel a la comunidad',
   '10 WODs de communauté faits', '10 community WODs done', '10 WODs de comunidad hechos', 'classes', 10, true);

-- Badges : les deux nouveaux sont évalués par wodbud_recalc_badges.
CREATE OR REPLACE FUNCTION "public"."wodbud_recalc_badges"("p_user" "uuid" DEFAULT "auth"."uid"()) RETURNS SETOF "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
  -- Ajouts communautés (043)
  v_community_challenge  boolean;
  v_community_wods       integer;
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
      ('multi_class_voter',  v_multi_class_voter >= 3),
      ('community_challenge', v_community_challenge),
      ('community_wod_10',    v_community_wods >= 10)
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
