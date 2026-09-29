-- ═══════════════════════════════════════════════════════════════════
-- Corrige un trou laissé par 024 dans le même souffle qui l'a créé.
--
-- Les policies RLS permissives s'additionnent (OR), elles ne se remplacent
-- pas. « exercise_votes_owner_or_admin » (ALL, user_id = auth.uid() OR
-- is_admin()) restait active après 024 et couvrait déjà INSERT/DELETE sans
-- aucune condition d'échéance : elle contournait donc entièrement les
-- nouvelles policies « votes: voter » / « votes: retirer son vote », qui ne
-- s'appliquent que quand aucune autre policy ne dit déjà oui.
--
-- Remplacée par un accès admin inconditionnel (ALL, is_admin() seul) : les
-- admins gardent la main peu importe l'état du vote, et les propriétaires
-- passent désormais uniquement par les deux policies gated de 024. Rien à
-- ajouter pour SELECT/UPDATE : la lecture a déjà sa policy dédiée
-- (« votes: voir ceux de mes seances »), et exercise_votes n'est jamais
-- modifié par UPDATE dans le code — un changement de vote passe par
-- DELETE + INSERT (voir castVote dans classStore.ts).
-- ═══════════════════════════════════════════════════════════════════

drop policy if exists "exercise_votes_owner_or_admin" on public.exercise_votes;
create policy "exercise_votes_admin_write" on public.exercise_votes
  for all
  using (is_admin())
  with check (is_admin());
