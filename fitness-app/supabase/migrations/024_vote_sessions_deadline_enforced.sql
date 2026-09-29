-- ═══════════════════════════════════════════════════════════════════
-- Fait respecter l'échéance d'un vote côté base, pas seulement côté écran.
--
-- Jusqu'ici, « votes: voter » ne vérifiait que auth.uid() = user_id : rien
-- n'empêchait un appel direct à l'API d'ajouter un vote sur une session
-- fermée par le coach, ni après la date d'échéance. L'écran cachait le
-- formulaire, mais l'API restait ouverte — vérifié en production : « Vote
-- de Delphine » a une échéance au 10 juin 2026, toujours status='open',
-- encore votable via l'API le 29 septembre.
--
-- `deadline` est un timestamptz, mais le formulaire n'envoie qu'une date
-- (minuit UTC ce jour-là) : on ajoute 24h de marge pour garder la journée
-- choisie ouverte en entier, plutôt que de fermer en pleine journée locale.
-- Même logique côté client dans src/lib/voteSessions.ts — les deux doivent
-- rester en phase si la marge change un jour.
-- ═══════════════════════════════════════════════════════════════════

drop policy if exists "votes: voter" on public.exercise_votes;
create policy "votes: voter" on public.exercise_votes
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.vote_sessions vs
      where vs.id = exercise_votes.vote_session_id
        and vs.status = 'open'
        and (vs.deadline is null or vs.deadline + interval '24 hours' > now())
    )
  );

drop policy if exists "votes: retirer son vote" on public.exercise_votes;
create policy "votes: retirer son vote" on public.exercise_votes
  for delete
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.vote_sessions vs
      where vs.id = exercise_votes.vote_session_id
        and vs.status = 'open'
        and (vs.deadline is null or vs.deadline + interval '24 hours' > now())
    )
  );
