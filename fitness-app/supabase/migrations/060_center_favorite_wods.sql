-- 060 — Engagement (6.7) : les WODs préférés d'un centre, pour son équipe.
-- On agrège les notes (059) que les gens du centre ont données aux WODs écrits
-- par l'équipe du centre. Seules des moyennes sortent, jamais qui a noté quoi ;
-- et sous 3 notes, la moyenne n'est pas donnée (elle trahirait l'avis d'une
-- ou deux personnes identifiables).

create function public.get_center_favorite_wods(p_center uuid)
returns table (
  workout_id uuid, title text, author_name text,
  ratings bigint, average numeric, sessions bigint, last_done timestamptz
)
language sql stable security definer set search_path = public
as $$
  with team as (
    select user_id from public.center_members
     where center_id = p_center and role in ('owner', 'head_coach', 'coach')
  ),
  people as (
    select user_id from public.center_members where center_id = p_center
  ),
  s as (
    select ws.workout_id, ws.rating, ws.performed_at
      from public.workout_sessions ws
      join people on people.user_id = ws.user_id
      join public.workouts w on w.id = ws.workout_id
      join team on team.user_id = w.created_by
  )
  select w.id, w.title, p.full_name,
         count(s.rating),
         case when count(s.rating) >= 3 then round(avg(s.rating)::numeric, 1) end,
         count(*),
         max(s.performed_at)
    from s
    join public.workouts w on w.id = s.workout_id
    left join public.profiles p on p.id = w.created_by
   where public.is_center_staff(p_center)
   group by w.id, w.title, p.full_name
   order by (count(s.rating) >= 3) desc, avg(s.rating) desc nulls last, count(*) desc
   limit 20;
$$;

revoke execute on function public.get_center_favorite_wods(uuid) from public, anon;
grant execute on function public.get_center_favorite_wods(uuid) to authenticated;
