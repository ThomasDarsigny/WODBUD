-- 074 · Statistiques d'usage, sans service tiers
--
-- De quoi mesurer le test au gym sans outil d'analyse externe ni suivi fin :
-- une ligne par compte, par jour et par plateforme où l'app a été ouverte
-- (« ce compte a utilisé WODBUD ce jour-là, sur le web / l'app installée /
-- Android / iPhone »). Ni page vue, ni clic, ni durée. Gardé 400 jours
-- (13 mois), purgé au passage.
--
-- Écriture : seulement par touch_usage (le compte connecté, le jour de
-- Montréal). Lecture : personne directement ; admin_usage_stats ne rend que
-- des totaux, réservés aux administrateurs.

create table public.usage_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  platform text not null check (platform in ('web', 'pwa', 'android', 'ios')),
  primary key (user_id, day, platform)
);
create index usage_days_day_idx on public.usage_days (day);

alter table public.usage_days enable row level security;
-- Aucune politique : ni lecture ni écriture directe, pour personne.
revoke all on public.usage_days from anon, authenticated;

create function public.touch_usage(p_platform text)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_user uuid := auth.uid();
  v_today date := (now() at time zone 'America/Toronto')::date;
begin
  if v_user is null or p_platform is null or p_platform not in ('web', 'pwa', 'android', 'ios') then
    return;
  end if;
  insert into public.usage_days (user_id, day, platform)
  values (v_user, v_today, p_platform)
  on conflict do nothing;
  delete from public.usage_days where day < v_today - 400;
end;
$$;

revoke execute on function public.touch_usage(text) from public, anon;
grant execute on function public.touch_usage(text) to authenticated;

-- Totaux pour l'administration : comptes actifs, nouveaux comptes, séances,
-- présences, WODs, plateformes, semaines, et centres (pour le test au gym).
-- Jamais une ligne par personne.
create function public.admin_usage_stats(p_weeks integer default 8)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  v_today date := (now() at time zone 'America/Toronto')::date;
  v_weeks integer := least(greatest(coalesce(p_weeks, 8), 1), 26);
  v_monday date := date_trunc('week', v_today)::date;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'active_7d', (select count(distinct user_id) from public.usage_days where day > v_today - 7),
    'active_30d', (select count(distinct user_id) from public.usage_days where day > v_today - 30),
    'platforms_30d', (
      select coalesce(jsonb_object_agg(platform, users), '{}'::jsonb)
      from (select platform, count(distinct user_id) as users from public.usage_days where day > v_today - 30 group by platform) p
    ),
    'new_accounts_30d', (select count(*) from public.profiles where created_at > now() - interval '30 days'),
    'accounts', (select count(*) from public.profiles),
    'sessions_7d', (select count(*) from public.workout_sessions where performed_at > now() - interval '7 days' and coalesce(active_minutes, 0) > 0),
    'checkins_7d', (select count(*) from public.class_attendance where session_date > v_today - 7),
    'wods_30d', (select count(*) from public.workouts where created_at > now() - interval '30 days' and not coalesce(is_benchmark, false)),
    'plans_30d', (select count(*) from public.class_plans where created_at > now() - interval '30 days'),
    'weekly_active', (
      select coalesce(jsonb_agg(jsonb_build_object('week', w.week, 'users', (
        select count(distinct u.user_id) from public.usage_days u where u.day >= w.week and u.day < w.week + 7
      )) order by w.week), '[]'::jsonb)
      from (select (v_monday - 7 * g)::date as week from generate_series(0, v_weeks - 1) g) w
    ),
    'centers', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', c.name,
        'members', (select count(*) from public.center_members m where m.center_id = c.id),
        'active_7d', (
          select count(distinct u.user_id) from public.usage_days u
          join public.center_members m on m.user_id = u.user_id and m.center_id = c.id
          where u.day > v_today - 7
        )
      ) order by c.created_at), '[]'::jsonb)
      from public.centers c
    )
  );
end;
$$;

revoke execute on function public.admin_usage_stats(integer) from public, anon;
grant execute on function public.admin_usage_stats(integer) to authenticated;
