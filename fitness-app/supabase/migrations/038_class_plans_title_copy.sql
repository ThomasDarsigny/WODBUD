-- ═══════════════════════════════════════════════════════════════════
-- Corrige 037 : la fiche du workout du coach n'est plus lisible par les
-- athlètes. La bibliothèque liste « tout workout lisible » : le WOD du coach
-- y apparaissait comme un modèle, et dans les listes de choix de l'athlète.
--
-- L'athlète garde ce dont il a besoin :
--   - les exercices (workout_exercises, règle de 037 inchangée) pour le
--     chrono et le mannequin ;
--   - le titre, désormais recopié dans sa copie quand le coach n'en a pas
--     saisi (titre du plan, sinon titre du workout).
-- ═══════════════════════════════════════════════════════════════════

drop policy "workouts: lire" on public.workouts;
create policy "workouts: lire" on public.workouts for select to authenticated
  using (created_by = (select auth.uid()) or (select public.is_admin()) or public.is_admin_authored(created_by));

create or replace function public.wodbud_class_plan_fanout() returns trigger
language plpgsql security definer set search_path to 'public' as $$
declare
  copy_title text := coalesce(new.title, (select w.title from workouts w where w.id = new.workout_id));
begin
  if tg_op = 'INSERT' then
    insert into scheduled_workouts (user_id, workout_id, title, notes, scheduled_date, class_plan_id)
    select cm.athlete_id, new.workout_id, copy_title, new.notes, new.scheduled_date, new.id
    from class_members cm
    where cm.class_id = new.class_id
    on conflict do nothing;
  elsif tg_op = 'UPDATE' then
    update scheduled_workouts
       set workout_id = new.workout_id, title = copy_title, notes = new.notes,
           scheduled_date = new.scheduled_date
     where class_plan_id = new.id;
  end if;
  return new;
end $$;

create or replace function public.wodbud_class_membership_plans() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin
  if tg_op = 'INSERT' then
    insert into scheduled_workouts (user_id, workout_id, title, notes, scheduled_date, class_plan_id)
    select new.athlete_id, cp.workout_id,
           coalesce(cp.title, (select w.title from workouts w where w.id = cp.workout_id)),
           cp.notes, cp.scheduled_date, cp.id
    from class_plans cp
    where cp.class_id = new.class_id and cp.scheduled_date >= current_date
    on conflict do nothing;
    return new;
  else
    delete from scheduled_workouts sw
     using class_plans cp
     where sw.class_plan_id = cp.id
       and cp.class_id = old.class_id
       and sw.user_id = old.athlete_id
       and sw.session_id is null
       and sw.scheduled_date >= current_date;
    return old;
  end if;
end $$;

revoke execute on function public.wodbud_class_plan_fanout() from public, anon, authenticated;
revoke execute on function public.wodbud_class_membership_plans() from public, anon, authenticated;
