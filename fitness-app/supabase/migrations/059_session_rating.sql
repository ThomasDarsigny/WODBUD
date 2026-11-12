-- 059 — Engagement (6.6) : noter l'entraînement à la fin d'une séance, de 1
-- à 5. La note vit sur la séance (workout_sessions), donc sous les règles
-- d'accès existantes : chacun note et relit ses propres séances. La vue des
-- WODs préférés d'un centre (6.7) les agrégera sans exposer qui a noté quoi.

alter table public.workout_sessions
  add column rating smallint check (rating between 1 and 5),
  add column rated_at timestamptz;

create index workout_sessions_rated_idx on public.workout_sessions (workout_id) where rating is not null;
