begin;

create table if not exists public.admin_users (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid null references public.profiles(id) on delete set null
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

grant select on table public.admin_users to authenticated;

alter table public.admin_users enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_muscles enable row level security;
alter table public.muscle_groups enable row level security;
alter table public.themes enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.session_exercises enable row level security;
alter table public.exercise_votes enable row level security;
alter table public.profiles enable row level security;

drop policy if exists admin_users_select_self on public.admin_users;
create policy admin_users_select_self
on public.admin_users
for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists admin_users_insert_admin on public.admin_users;
create policy admin_users_insert_admin
on public.admin_users
for insert
with check (public.is_admin());

drop policy if exists admin_users_update_admin on public.admin_users;
create policy admin_users_update_admin
on public.admin_users
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists admin_users_delete_admin on public.admin_users;
create policy admin_users_delete_admin
on public.admin_users
for delete
using (public.is_admin());

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin
on public.profiles
for select
using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin
on public.profiles
for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists muscle_groups_read_authenticated on public.muscle_groups;
create policy muscle_groups_read_authenticated
on public.muscle_groups
for select
using (auth.role() = 'authenticated');

drop policy if exists muscle_groups_admin_write on public.muscle_groups;
create policy muscle_groups_admin_write
on public.muscle_groups
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists exercises_read_authenticated on public.exercises;
create policy exercises_read_authenticated
on public.exercises
for select
using (auth.role() = 'authenticated');

drop policy if exists exercises_admin_write on public.exercises;
create policy exercises_admin_write
on public.exercises
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists exercise_muscles_read_authenticated on public.exercise_muscles;
create policy exercise_muscles_read_authenticated
on public.exercise_muscles
for select
using (auth.role() = 'authenticated');

drop policy if exists exercise_muscles_admin_write on public.exercise_muscles;
create policy exercise_muscles_admin_write
on public.exercise_muscles
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists themes_read_authenticated on public.themes;
create policy themes_read_authenticated
on public.themes
for select
using (auth.role() = 'authenticated');

drop policy if exists themes_admin_write on public.themes;
create policy themes_admin_write
on public.themes
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists workouts_select_owner_or_admin on public.workouts;
create policy workouts_select_owner_or_admin
on public.workouts
for select
using (created_by = auth.uid() or public.is_admin());

drop policy if exists workouts_insert_owner_or_admin on public.workouts;
create policy workouts_insert_owner_or_admin
on public.workouts
for insert
with check (created_by = auth.uid() or public.is_admin());

drop policy if exists workouts_update_owner_or_admin on public.workouts;
create policy workouts_update_owner_or_admin
on public.workouts
for update
using (created_by = auth.uid() or public.is_admin())
with check (created_by = auth.uid() or public.is_admin());

drop policy if exists workouts_delete_owner_or_admin on public.workouts;
create policy workouts_delete_owner_or_admin
on public.workouts
for delete
using (created_by = auth.uid() or public.is_admin());

drop policy if exists workout_exercises_owner_or_admin on public.workout_exercises;
create policy workout_exercises_owner_or_admin
on public.workout_exercises
for all
using (
  exists (
    select 1
    from public.workouts w
    where w.id = workout_exercises.workout_id
      and (w.created_by = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.workouts w
    where w.id = workout_exercises.workout_id
      and (w.created_by = auth.uid() or public.is_admin())
  )
);

drop policy if exists workout_sessions_owner_or_admin on public.workout_sessions;
create policy workout_sessions_owner_or_admin
on public.workout_sessions
for all
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists session_exercises_owner_or_admin on public.session_exercises;
create policy session_exercises_owner_or_admin
on public.session_exercises
for all
using (
  exists (
    select 1
    from public.workout_sessions ws
    where ws.id = session_exercises.session_id
      and (ws.user_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.workout_sessions ws
    where ws.id = session_exercises.session_id
      and (ws.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists exercise_votes_owner_or_admin on public.exercise_votes;
create policy exercise_votes_owner_or_admin
on public.exercise_votes
for all
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

commit;

-- Bootstrap: execute once in SQL editor with your real user id
-- insert into public.admin_users (user_id) values ('YOUR-USER-UUID');