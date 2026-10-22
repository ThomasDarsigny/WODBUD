-- 045 — Suivi des athlètes par le coach.
--
-- Pour chaque inscrit d'un cours : dernière séance, séances et minutes sur
-- 7 et 30 jours, série en cours. Réservé au coach du cours (et aux admins) :
-- un athlète ne voit pas l'assiduité de ses camarades, seulement le
-- classement en minutes (032/033). Les séances elles-mêmes restent privées —
-- ni WOD, ni notes, ni résultats ne sortent d'ici, seulement des comptes.

create or replace function public.get_class_followup(p_class_id uuid)
returns table(
  athlete_id uuid,
  full_name text,
  avatar_url text,
  joined_at timestamptz,
  last_session_at timestamptz,
  sessions_7d integer,
  minutes_7d integer,
  sessions_30d integer,
  minutes_30d integer,
  current_streak integer
)
language sql
stable security definer
set search_path to 'public'
as $function$
  select cm.athlete_id,
         p.full_name,
         p.avatar_url,
         cm.joined_at,
         s.last_at,
         coalesce(s.n7, 0)::integer,
         coalesce(s.m7, 0)::integer,
         coalesce(s.n30, 0)::integer,
         coalesce(s.m30, 0)::integer,
         coalesce(p.current_streak, 0)::integer
  from public.class_members cm
  join public.profiles p on p.id = cm.athlete_id
  left join lateral (
    select max(ws.performed_at) as last_at,
           count(*) filter (where ws.performed_at >= now() - interval '7 days' and ws.active_minutes > 0) as n7,
           sum(ws.active_minutes) filter (where ws.performed_at >= now() - interval '7 days') as m7,
           count(*) filter (where ws.performed_at >= now() - interval '30 days' and ws.active_minutes > 0) as n30,
           sum(ws.active_minutes) filter (where ws.performed_at >= now() - interval '30 days') as m30
    from public.workout_sessions ws
    where ws.user_id = cm.athlete_id
      and ws.active_minutes > 0
  ) s on true
  where cm.class_id = p_class_id
    and (public.is_class_coach(p_class_id) or public.is_admin())
  order by s.last_at desc nulls last, p.full_name;
$function$;

revoke execute on function public.get_class_followup(uuid) from public, anon;
grant execute on function public.get_class_followup(uuid) to authenticated;
