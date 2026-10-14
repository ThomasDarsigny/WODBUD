-- ═══════════════════════════════════════════════════════════════════
-- Planification par le coach.
--
-- Le coach programme une séance pour tout un cours (`class_plans`). Chaque
-- athlète en reçoit une copie personnelle dans `scheduled_workouts`
-- (`class_plan_id`) : « À venir », « Commencer », « ✓ Fait » et le lien au
-- journal (034) fonctionnent donc tels quels, et le coach mesure qui a fait
-- la séance en comptant les copies accomplies.
--
-- Copies tenues à jour par déclencheurs (security definer : le coach
-- n'écrit jamais directement dans la planification d'un athlète) :
--   - plan créé / modifié → copies créées / mises à jour ;
--   - plan supprimé → copies supprimées (cascade) ; les séances faites
--     restent dans le journal ;
--   - athlète qui rejoint le cours → reçoit les plans à venir ;
--   - athlète qui quitte → perd ses copies à venir non faites.
-- ═══════════════════════════════════════════════════════════════════

create table public.class_plans (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  coach_id uuid not null references auth.users(id) on delete cascade,
  workout_id uuid references public.workouts(id) on delete set null,
  title text,
  notes text,
  scheduled_date date not null,
  created_at timestamptz not null default now()
);
create index class_plans_class_date_idx on public.class_plans (class_id, scheduled_date);
create index class_plans_workout_idx on public.class_plans (workout_id);

alter table public.class_plans enable row level security;

create policy "class_plans: lire" on public.class_plans for select to authenticated
  using (public.is_class_coach(class_id) or public.is_class_member(class_id) or (select public.is_admin()));
create policy "class_plans: créer" on public.class_plans for insert to authenticated
  with check (coach_id = (select auth.uid()) and public.is_class_coach(class_id));
create policy "class_plans: modifier" on public.class_plans for update to authenticated
  using (public.is_class_coach(class_id)) with check (public.is_class_coach(class_id));
create policy "class_plans: supprimer" on public.class_plans for delete to authenticated
  using (public.is_class_coach(class_id));

alter table public.scheduled_workouts
  add column class_plan_id uuid references public.class_plans(id) on delete cascade;
create unique index scheduled_workouts_class_plan_user_key
  on public.scheduled_workouts (class_plan_id, user_id)
  where class_plan_id is not null;

-- ── Copies ──────────────────────────────────────────────────────────
create function public.wodbud_class_plan_fanout() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin
  if tg_op = 'INSERT' then
    insert into scheduled_workouts (user_id, workout_id, title, notes, scheduled_date, class_plan_id)
    select cm.athlete_id, new.workout_id, new.title, new.notes, new.scheduled_date, new.id
    from class_members cm
    where cm.class_id = new.class_id
    on conflict do nothing;
  elsif tg_op = 'UPDATE' then
    update scheduled_workouts
       set workout_id = new.workout_id, title = new.title, notes = new.notes,
           scheduled_date = new.scheduled_date
     where class_plan_id = new.id;
  end if;
  return new;
end $$;

create trigger class_plans_fanout
  after insert or update on public.class_plans
  for each row execute function public.wodbud_class_plan_fanout();

create function public.wodbud_class_membership_plans() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin
  if tg_op = 'INSERT' then
    insert into scheduled_workouts (user_id, workout_id, title, notes, scheduled_date, class_plan_id)
    select new.athlete_id, cp.workout_id, cp.title, cp.notes, cp.scheduled_date, cp.id
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

create trigger class_members_plans
  after insert or delete on public.class_members
  for each row execute function public.wodbud_class_membership_plans();

revoke execute on function public.wodbud_class_plan_fanout() from public, anon, authenticated;
revoke execute on function public.wodbud_class_membership_plans() from public, anon, authenticated;

-- ── Lecture des copies par le coach ─────────────────────────────────
-- La règle « gérer les siens » (all) est scindée : le coach lit les copies
-- de ses plans pour savoir qui a fait la séance, sans pouvoir les modifier.
drop policy "scheduled_workouts: gérer les siens" on public.scheduled_workouts;

create policy "scheduled_workouts: lire" on public.scheduled_workouts for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_admin())
    or exists (select 1 from public.class_plans cp
               where cp.id = scheduled_workouts.class_plan_id and public.is_class_coach(cp.class_id))
  );
create policy "scheduled_workouts: créer" on public.scheduled_workouts for insert to authenticated
  with check (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "scheduled_workouts: modifier" on public.scheduled_workouts for update to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()))
  with check (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "scheduled_workouts: supprimer" on public.scheduled_workouts for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- ── Le WOD planifié est lisible par les athlètes du cours ───────────
-- Sans ça, l'athlète lancerait un chrono sans liste d'exercices : le
-- workout appartient au coach.
drop policy "workouts: lire" on public.workouts;
create policy "workouts: lire" on public.workouts for select to authenticated
  using (
    created_by = (select auth.uid())
    or (select public.is_admin())
    or public.is_admin_authored(created_by)
    or exists (select 1 from public.class_plans cp
               where cp.workout_id = workouts.id and public.is_class_member(cp.class_id))
  );

drop policy "workout_exercises: lire" on public.workout_exercises;
create policy "workout_exercises: lire" on public.workout_exercises for select to authenticated
  using (
    exists (select 1 from public.workouts w
            where w.id = workout_exercises.workout_id
              and (w.created_by = (select auth.uid()) or (select public.is_admin())
                   or public.is_admin_authored(w.created_by)))
    or exists (select 1 from public.class_plans cp
               where cp.workout_id = workout_exercises.workout_id and public.is_class_member(cp.class_id))
  );
