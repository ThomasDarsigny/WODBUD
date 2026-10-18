-- 042 — Liste des membres d'une communauté et partage de rang.
--
-- `profiles` n'est pas lisible entre membres d'une communauté (seulement
-- entre camarades de cours) : la liste passe par get_community_members(),
-- qui ne sort que le nom et l'avatar.
--
-- Le rang (rang, minutes, série, badges) est en plus, et sur accord :
-- `share_rank`, par communauté, décidé par chaque membre. Il n'est montré
-- qu'aux autres membres de la communauté, jamais au simple visiteur.

alter table public.community_members
  add column share_rank boolean not null default false;

create policy "community_members: modifier le sien" on public.community_members
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace function public.get_community_members(p_community uuid)
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  joined_at timestamptz,
  is_me boolean,
  share_rank boolean,
  rank_key text,
  total_minutes integer,
  current_streak integer,
  badges bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select (select auth.uid()) as uid,
           exists (
             select 1 from public.community_members
             where community_id = p_community and user_id = (select auth.uid())
           ) as is_member
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
         case when visible then (select count(*) from public.user_badges ub where ub.user_id = cm.user_id) end
  from public.community_members cm
  join public.profiles p on p.id = cm.user_id
  cross join me
  cross join lateral (
    select me.is_member and (cm.share_rank or cm.user_id = me.uid) as visible
  ) v
  where cm.community_id = p_community
    and me.uid is not null
  order by v.visible desc, case when v.visible then p.total_minutes end desc nulls last, cm.joined_at;
$$;

revoke execute on function public.get_community_members(uuid) from public, anon;
grant execute on function public.get_community_members(uuid) to authenticated;
