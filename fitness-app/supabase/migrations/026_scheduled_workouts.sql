-- ═══════════════════════════════════════════════════════════════════
-- Journal — volet « séances programmées ».
--
-- `workout_sessions` enregistre ce qui a été fait (performed_at, toujours
-- dans le passé au moment de l'écriture). Il ne peut pas aussi porter ce
-- qui est prévu : une séance programmée n'a ni durée, ni minutes actives,
-- ni exercices cochés — la forcer dans ce schéma créerait des lignes à
-- moitié vides plutôt qu'une vraie liste de planification.
--
-- Volontairement personnel (user_id = auth.uid(), même modèle de
-- confidentialité que workout_sessions) et pas diffusé à une classe : un
-- coach ne voit pas la planification d'un athlète, un athlète ne voit pas
-- celle d'un autre. Programmer une séance de classe entière est une
-- fonctionnalité distincte, pas couverte ici.
-- ═══════════════════════════════════════════════════════════════════

create table public.scheduled_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Optionnel : un plan futur n'est pas toujours déjà un WOD construit
  -- ("courir 5km dimanche" n'a pas besoin d'un workout_id).
  workout_id uuid references public.workouts(id) on delete set null,
  title text,
  scheduled_date date not null,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.scheduled_workouts enable row level security;

create policy "scheduled_workouts_owner_or_admin" on public.scheduled_workouts
  for all
  using (auth.uid() = user_id or is_admin())
  with check (auth.uid() = user_id or is_admin());

create index scheduled_workouts_user_date_idx
  on public.scheduled_workouts (user_id, scheduled_date);
