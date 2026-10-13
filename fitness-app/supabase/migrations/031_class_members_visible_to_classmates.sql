-- ═══════════════════════════════════════════════════════════════════
-- Le classement d'un cours était vide côté athlète : `class_members_select_athlete`
-- (athlete_id = auth.uid()) ne laissait voir que sa propre inscription.
-- `profiles_select_classmates` en dépendait aussi — sa sous-requête sur
-- class_members passe par la même RLS — donc aucun coéquipier n'était lisible.
--
-- Une policy sur class_members qui lit class_members bouclerait (récursion
-- RLS) : on passe par une fonction security definer, comme is_class_coach.
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.is_class_member(p_class_id uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.class_members cm
    where cm.class_id = p_class_id
      and cm.athlete_id = auth.uid()
  );
$function$;

revoke execute on function public.is_class_member(uuid) from public, anon;
grant execute on function public.is_class_member(uuid) to authenticated;

create policy "class_members_select_classmates" on public.class_members
  for select using (public.is_class_member(class_id));
