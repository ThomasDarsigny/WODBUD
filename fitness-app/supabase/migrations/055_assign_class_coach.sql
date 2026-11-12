-- 055 — Travail d'équipe (8.3) : le proprio ou un entraîneur chef assigne un
-- cours du centre à un entraîneur de l'équipe. Le cours change d'entraîneur
-- avec ses membres, sa programmation (déjà rattachée au cours) et ses votes
-- (qui suivent pour rester gérables par le nouvel entraîneur).

create function public.assign_class_coach(p_class uuid, p_coach uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_center uuid;
begin
  select center_id into v_center from public.classes where id = p_class;
  if v_center is null or not public.is_center_lead(v_center) then
    raise exception 'not_allowed';
  end if;
  if not exists (
    select 1 from public.center_members
     where center_id = v_center and user_id = p_coach
       and role in ('owner', 'head_coach', 'coach')
  ) then
    raise exception 'coach_not_in_team';
  end if;

  update public.classes set coach_id = p_coach where id = p_class;
  update public.vote_sessions set coach_id = p_coach where class_id = p_class;
end;
$$;

revoke execute on function public.assign_class_coach(uuid, uuid) from anon, public;
grant execute on function public.assign_class_coach(uuid, uuid) to authenticated;
