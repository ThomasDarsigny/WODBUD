-- ═══════════════════════════════════════════════════════════════════
-- Relier la planification au journal réel.
--
-- Une séance programmée retient la séance effectuée qui l'a accomplie.
-- Supprimer la séance effectuée remet le plan à « non fait » (set null),
-- elle ne supprime pas le plan.
--
-- Une séance effectuée n'accomplit qu'un seul plan : sinon une même course
-- cocherait deux entrées prévues le même jour.
-- ═══════════════════════════════════════════════════════════════════

alter table public.scheduled_workouts
  add column session_id uuid references public.workout_sessions(id) on delete set null;

create unique index scheduled_workouts_session_id_key
  on public.scheduled_workouts (session_id)
  where session_id is not null;
