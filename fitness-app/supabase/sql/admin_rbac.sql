-- ============================================================
-- FORGEX — RESET COMPLET + REBUILD
-- Coller entier dans Supabase SQL Editor > Run
-- ============================================================


-- ============================================================
-- PARTIE 1 : DROP TOUT (ordre inverse des dépendances)
-- ============================================================

-- Triggers
drop trigger if exists on_auth_user_created    on auth.users;
drop trigger if exists workouts_updated_at     on workouts;

-- Functions
drop function if exists handle_new_user()   cascade;
drop function if exists update_updated_at() cascade;

-- Policies (drop implicite via DROP TABLE, mais on nettoie au cas où)
drop policy if exists "muscle_groups: lecture publique"     on muscle_groups;
drop policy if exists "profiles: voir le sien"              on profiles;
drop policy if exists "profiles: modifier le sien"          on profiles;
drop policy if exists "exercises: lecture publique"         on exercises;
drop policy if exists "exercises: créer"                    on exercises;
drop policy if exists "exercises: modifier les siens"       on exercises;
drop policy if exists "exercises: supprimer les siens"      on exercises;
drop policy if exists "exercise_muscles: lecture publique"  on exercise_muscles;
drop policy if exists "exercise_muscles: gérer les siens"   on exercise_muscles;
drop policy if exists "themes: lecture publique"            on themes;
drop policy if exists "themes: créer"                       on themes;
drop policy if exists "themes: modifier les siens"          on themes;
drop policy if exists "themes: supprimer les siens"         on themes;
drop policy if exists "workouts: voir les siens"            on workouts;
drop policy if exists "workouts: créer"                     on workouts;
drop policy if exists "workouts: modifier les siens"        on workouts;
drop policy if exists "workouts: supprimer les siens"       on workouts;
drop policy if exists "workout_exercises: voir les siens"   on workout_exercises;
drop policy if exists "workout_exercises: gérer les siens"  on workout_exercises;
drop policy if exists "Coach manages own workouts"          on workouts;
drop policy if exists "Coach manages own workout exercises" on workout_exercises;
drop policy if exists "sessions: voir les siennes"          on workout_sessions;
drop policy if exists "sessions: créer"                     on workout_sessions;
drop policy if exists "sessions: modifier les siennes"      on workout_sessions;
drop policy if exists "sessions: supprimer les siennes"     on workout_sessions;
drop policy if exists "session_exercises: gérer les siens"  on session_exercises;
drop policy if exists "votes: voir tous"                    on exercise_votes;
drop policy if exists "votes: voter"                        on exercise_votes;
drop policy if exists "votes: retirer son vote"             on exercise_votes;

-- Tables (ordre inverse des FK)
drop table if exists exercise_votes    cascade;
drop table if exists session_exercises cascade;
drop table if exists workout_sessions  cascade;
drop table if exists workout_exercises cascade;
drop table if exists workouts          cascade;
drop table if exists themes            cascade;
drop table if exists exercise_muscles  cascade;
drop table if exists exercises         cascade;
drop table if exists muscle_groups     cascade;
drop table if exists profiles          cascade;


-- ============================================================
-- PARTIE 2 : REBUILD — Tables
-- ============================================================

-- Extension uuid (au cas où)
create extension if not exists "uuid-ossp";


-- ----------------------------------------------------------
-- PROFILES
-- ----------------------------------------------------------
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  language    text not null default 'fr' check (language in ('fr', 'en', 'es')),
  created_at  timestamptz not null default now()
);


-- ----------------------------------------------------------
-- MUSCLE GROUPS (données partagées, lecture publique)
-- ----------------------------------------------------------
create table muscle_groups (
  id          uuid primary key default uuid_generate_v4(),
  name_key    text not null unique,  -- clé i18n ex: "quadriceps"
  body_region text not null check (body_region in ('upper', 'lower', 'core', 'full'))
);

insert into muscle_groups (name_key, body_region) values
  ('chest',           'upper'),
  ('back',            'upper'),
  ('shoulders',       'upper'),
  ('biceps',          'upper'),
  ('triceps',         'upper'),
  ('forearms',        'upper'),
  ('abs',             'core'),
  ('obliques',        'core'),
  ('lower_back',      'core'),
  ('glutes',          'lower'),
  ('quadriceps',      'lower'),
  ('hamstrings',      'lower'),
  ('calves',          'lower'),
  ('cardio_upper',    'upper'),
  ('cardio_lower',    'lower'),
  ('full_body',       'full');


-- ----------------------------------------------------------
-- EXERCISES
-- ----------------------------------------------------------
create table exercises (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  description text,
  video_path  text,                    -- chemin Supabase Storage
  video_url   text,                    -- URL publique générée
  category    text not null check (category in (
                'strength', 'olympic', 'gymnastics', 'cardio', 'mobility', 'accessory'
              )),
  body_region text not null check (body_region in ('upper', 'lower', 'full')),
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Muscles d'un exercice (primary + secondary via role)
create table exercise_muscles (
  exercise_id     uuid not null references exercises(id) on delete cascade,
  muscle_group_id uuid not null references muscle_groups(id) on delete cascade,
  role            text not null check (role in ('primary', 'secondary')),
  primary key (exercise_id, muscle_group_id)
);


-- ----------------------------------------------------------
-- THEMES
-- ----------------------------------------------------------
create table themes (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  color       text not null default '#FF4D00',
  description text,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);


-- ----------------------------------------------------------
-- WORKOUTS (templates de séances)
-- ----------------------------------------------------------
create table workouts (
  id               uuid primary key default uuid_generate_v4(),
  title            text not null,
  method           text not null default 'amrap' check (method in (
                     'amrap', 'emom', 'for_time', 'rounds', 'strength', 'tabata', 'custom'
                   )),
  duration_minutes int,
  notes            text,
  theme_id         uuid references themes(id) on delete set null,
  created_by       uuid not null references profiles(id) on delete cascade,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Exercices dans un workout, ordonnés
create table workout_exercises (
  id           uuid primary key default uuid_generate_v4(),
  workout_id   uuid not null references workouts(id) on delete cascade,
  exercise_id  uuid not null references exercises(id) on delete cascade,
  position     int not null default 1,
  sets         int,
  reps         text,      -- "10", "10-12", "max", etc.
  weight       text,      -- "60kg", "BW", "70%1RM"
  rest_seconds int,
  notes        text
);


-- ----------------------------------------------------------
-- WORKOUT SESSIONS (instances réelles d'une séance)
-- ----------------------------------------------------------
create table workout_sessions (
  id           uuid primary key default uuid_generate_v4(),
  workout_id   uuid references workouts(id) on delete set null,
  user_id      uuid not null references profiles(id) on delete cascade,
  performed_at timestamptz not null default now(),
  notes        text
);

-- Exercices réalisés dans une session
create table session_exercises (
  id             uuid primary key default uuid_generate_v4(),
  session_id     uuid not null references workout_sessions(id) on delete cascade,
  exercise_id    uuid not null references exercises(id) on delete cascade,
  sets_completed int,
  notes          text
);


-- ----------------------------------------------------------
-- EXERCISE VOTES
-- ----------------------------------------------------------
create table exercise_votes (
  id          uuid primary key default uuid_generate_v4(),
  exercise_id uuid not null references exercises(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  workout_id  uuid references workouts(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (exercise_id, user_id, workout_id)
);


-- ============================================================
-- PARTIE 3 : INDEX
-- ============================================================

create index on exercises        (created_by);
create index on exercises        (category);
create index on exercises        (body_region);
create index on exercise_muscles (exercise_id);
create index on exercise_muscles (muscle_group_id);
create index on workout_exercises (workout_id);
create index on workout_exercises (workout_id, position);
create index on workout_sessions  (user_id);
create index on workout_sessions  (performed_at desc);
create index on session_exercises (session_id);
create index on exercise_votes    (workout_id);
create index on exercise_votes    (exercise_id);


-- ============================================================
-- PARTIE 4 : FONCTIONS & TRIGGERS
-- ============================================================

-- Auto-profil à l'inscription
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Auto-update updated_at sur exercises et workouts
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger exercises_updated_at
  before update on exercises
  for each row execute function set_updated_at();

create trigger workouts_updated_at
  before update on workouts
  for each row execute function set_updated_at();


-- ============================================================
-- PARTIE 5 : RLS
-- ============================================================

alter table profiles          enable row level security;
alter table muscle_groups     enable row level security;
alter table exercises         enable row level security;
alter table exercise_muscles  enable row level security;
alter table themes            enable row level security;
alter table workouts          enable row level security;
alter table workout_exercises enable row level security;
alter table workout_sessions  enable row level security;
alter table session_exercises enable row level security;
alter table exercise_votes    enable row level security;


-- MUSCLE_GROUPS : lecture publique
create policy "muscle_groups: lecture publique"
  on muscle_groups for select using (true);

-- PROFILES
create policy "profiles: voir le sien"
  on profiles for select using (auth.uid() = id);
create policy "profiles: modifier le sien"
  on profiles for update using (auth.uid() = id);

-- EXERCISES : lecture publique, écriture par le créateur
create policy "exercises: lecture publique"
  on exercises for select using (true);
create policy "exercises: créer"
  on exercises for insert with check (auth.uid() = created_by);
create policy "exercises: modifier les siens"
  on exercises for update using (auth.uid() = created_by);
create policy "exercises: supprimer les siens"
  on exercises for delete using (auth.uid() = created_by);

-- EXERCISE_MUSCLES
create policy "exercise_muscles: lecture publique"
  on exercise_muscles for select using (true);
create policy "exercise_muscles: gérer les siens"
  on exercise_muscles for all
  using (
    exists (
      select 1 from exercises e
      where e.id = exercise_id and e.created_by = auth.uid()
    )
  );

-- THEMES
create policy "themes: lecture publique"
  on themes for select using (true);
create policy "themes: créer"
  on themes for insert with check (auth.uid() = created_by);
create policy "themes: modifier les siens"
  on themes for update using (auth.uid() = created_by);
create policy "themes: supprimer les siens"
  on themes for delete using (auth.uid() = created_by);

-- WORKOUTS
create policy "workouts: voir les siens"
  on workouts for select using (auth.uid() = created_by);
create policy "workouts: créer"
  on workouts for insert with check (auth.uid() = created_by);
create policy "workouts: modifier les siens"
  on workouts for update using (auth.uid() = created_by);
create policy "workouts: supprimer les siens"
  on workouts for delete using (auth.uid() = created_by);

-- WORKOUT_EXERCISES
create policy "workout_exercises: voir les siens"
  on workout_exercises for select
  using (
    exists (
      select 1 from workouts w
      where w.id = workout_id and w.created_by = auth.uid()
    )
  );
create policy "workout_exercises: gérer les siens"
  on workout_exercises for all
  using (
    exists (
      select 1 from workouts w
      where w.id = workout_id and w.created_by = auth.uid()
    )
  );

-- WORKOUT_SESSIONS
create policy "sessions: voir les siennes"
  on workout_sessions for select using (auth.uid() = user_id);
create policy "sessions: créer"
  on workout_sessions for insert with check (auth.uid() = user_id);
create policy "sessions: modifier les siennes"
  on workout_sessions for update using (auth.uid() = user_id);
create policy "sessions: supprimer les siennes"
  on workout_sessions for delete using (auth.uid() = user_id);

-- SESSION_EXERCISES
create policy "session_exercises: gérer les siens"
  on session_exercises for all
  using (
    exists (
      select 1 from workout_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );

-- EXERCISE_VOTES
create policy "votes: voir tous"
  on exercise_votes for select using (true);
create policy "votes: voter"
  on exercise_votes for insert with check (auth.uid() = user_id);
create policy "votes: retirer son vote"
  on exercise_votes for delete using (auth.uid() = user_id);