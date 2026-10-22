-- 044 — Résultats par mouvement : records personnels et progression.
--
-- Une ligne = un résultat noté par l'athlète sur un mouvement : une charge
-- (kg, éventuellement × répétitions), un nombre de répétitions, ou un temps.
-- Le record se calcule à la lecture (meilleure charge, 1RM estimé, meilleur
-- temps) : rien n'est dénormalisé, donc rien ne peut se désynchroniser.
--
-- Les résultats restent privés et ne touchent ni aux minutes ni aux rangs :
-- c'est un carnet, pas un classement. Ils peuvent se rattacher à une séance
-- chronométrée de l'athlète, ou être notés à part (un test de 1RM).

create table public.exercise_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  session_id uuid references public.workout_sessions(id) on delete set null,
  weight_kg numeric(6, 2) check (weight_kg is null or (weight_kg > 0 and weight_kg <= 600)),
  reps integer check (reps is null or reps between 1 and 2000),
  seconds integer check (seconds is null or seconds between 1 and 86400),
  performed_at timestamptz not null default now(),
  notes text check (notes is null or char_length(notes) <= 280),
  created_at timestamptz not null default now(),
  constraint exercise_results_has_value check (weight_kg is not null or reps is not null or seconds is not null),
  constraint exercise_results_not_future check (performed_at <= created_at + interval '5 minutes')
);

create index exercise_results_user_exercise_idx
  on public.exercise_results (user_id, exercise_id, performed_at desc);
create index exercise_results_session_idx
  on public.exercise_results (session_id) where session_id is not null;

alter table public.exercise_results enable row level security;
revoke all on public.exercise_results from anon;

create policy "exercise_results: lire les siens" on public.exercise_results
  for select to authenticated using (user_id = (select auth.uid()));

-- Une séance rattachée doit être la sienne.
create policy "exercise_results: ajouter" on public.exercise_results
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and (
      session_id is null
      or exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = (select auth.uid()))
    )
  );

create policy "exercise_results: modifier les siens" on public.exercise_results
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (
      session_id is null
      or exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = (select auth.uid()))
    )
  );

create policy "exercise_results: supprimer les siens" on public.exercise_results
  for delete to authenticated using (user_id = (select auth.uid()));
