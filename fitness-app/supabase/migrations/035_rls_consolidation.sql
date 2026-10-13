-- ═══════════════════════════════════════════════════════════════════
-- Nettoyage des règles d'accès (RLS) et des fonctions exposées.
--
-- 1. Règles en double fusionnées. Postgres combine déjà les règles
--    permissives d'une même action par OU : chaque nouvelle règle est le OU
--    exact des anciennes, l'accès effectif ne change pas. Le doublon était
--    dangereux, pas seulement lent : une vieille règle trop large a déjà
--    annulé un contrôle d'échéance des votes (voir 025).
--
-- 2. auth.uid() et is_admin() évalués une fois par requête —
--    `(select auth.uid())` — au lieu d'une fois par ligne.
--
-- 3. Règles dépendant de l'utilisateur réservées à `authenticated`. Pour un
--    visiteur anonyme, auth.uid() est nul et is_admin() faux : ces règles ne
--    lui accordaient jamais rien. Seules les tables de référence restent
--    lisibles publiquement (`using (true)`, inchangé).
--    Cela permet de retirer à `anon` l'exécution de is_admin() et consorts
--    sans casser ses lectures publiques.
--
-- Hors périmètre : les tables app_* (autre application sur ce projet,
-- ouvertes à anon en lecture/écriture) — à traiter séparément.
-- Empreinte de visibilité vérifiée avant/après pour admin, coach,
-- athlètes, compte sans données et anonyme : identique.
-- ═══════════════════════════════════════════════════════════════════

-- ── admin_users ─────────────────────────────────────────────────────
drop policy "admin_users_select_self" on public.admin_users;
drop policy "admin_users_insert_admin" on public.admin_users;
drop policy "admin_users_update_admin" on public.admin_users;
drop policy "admin_users_delete_admin" on public.admin_users;

create policy "admin_users: lire" on public.admin_users for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "admin_users: créer" on public.admin_users for insert to authenticated
  with check ((select public.is_admin()));
create policy "admin_users: modifier" on public.admin_users for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin_users: supprimer" on public.admin_users for delete to authenticated
  using ((select public.is_admin()));

-- ── class_members ───────────────────────────────────────────────────
drop policy "class_members_select_athlete" on public.class_members;
drop policy "class_members_select_classmates" on public.class_members;
drop policy "class_members_select_coach" on public.class_members;
drop policy "class_members_insert_athlete" on public.class_members;
drop policy "class_members_insert_coach" on public.class_members;
drop policy "class_members_delete_athlete" on public.class_members;
drop policy "class_members_delete_coach" on public.class_members;

create policy "class_members: lire" on public.class_members for select to authenticated
  using (athlete_id = (select auth.uid()) or public.is_class_member(class_id) or public.is_class_coach(class_id));
create policy "class_members: ajouter" on public.class_members for insert to authenticated
  with check (athlete_id = (select auth.uid()) or public.is_class_coach(class_id));
create policy "class_members: retirer" on public.class_members for delete to authenticated
  using (athlete_id = (select auth.uid()) or public.is_class_coach(class_id));

-- ── classes ─────────────────────────────────────────────────────────
drop policy "classes_select_coach" on public.classes;
drop policy "classes_select_member" on public.classes;
drop policy "classes_insert_coach" on public.classes;
drop policy "classes_update_coach" on public.classes;
drop policy "classes_delete_coach" on public.classes;

create policy "classes: lire" on public.classes for select to authenticated
  using (
    coach_id = (select auth.uid())
    or exists (select 1 from public.class_members cm
               where cm.class_id = classes.id and cm.athlete_id = (select auth.uid()))
  );
create policy "classes: créer" on public.classes for insert to authenticated
  with check (coach_id = (select auth.uid()));
create policy "classes: modifier" on public.classes for update to authenticated
  using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));
create policy "classes: supprimer" on public.classes for delete to authenticated
  using (coach_id = (select auth.uid()));

-- ── communities ─────────────────────────────────────────────────────
-- « lecture » valait auth.role() = 'authenticated' : toujours vrai pour ce rôle.
drop policy "communities: lecture" on public.communities;
drop policy "communities: créer" on public.communities;
drop policy "communities: modifier/supprimer les siennes" on public.communities;

create policy "communities: lire" on public.communities for select to authenticated
  using (true);
create policy "communities: créer" on public.communities for insert to authenticated
  with check (created_by = (select auth.uid()) or (select public.is_admin()));
create policy "communities: modifier" on public.communities for update to authenticated
  using (created_by = (select auth.uid()) or (select public.is_admin()))
  with check (created_by = (select auth.uid()) or (select public.is_admin()));
create policy "communities: supprimer" on public.communities for delete to authenticated
  using (created_by = (select auth.uid()) or (select public.is_admin()));

-- ── community_members ───────────────────────────────────────────────
drop policy "community_members: lecture" on public.community_members;
drop policy "community_members: rejoindre" on public.community_members;
drop policy "community_members: quitter ou retirer" on public.community_members;

create policy "community_members: lire" on public.community_members for select to authenticated
  using (true);
create policy "community_members: rejoindre" on public.community_members for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "community_members: quitter ou retirer" on public.community_members for delete to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.communities c
               where c.id = community_members.community_id and c.created_by = (select auth.uid()))
    or (select public.is_admin())
  );

-- ── exercise_methods ────────────────────────────────────────────────
drop policy "exercise_methods: gérer les siens" on public.exercise_methods;
drop policy "exercise_methods_admin_write" on public.exercise_methods;
-- « exercise_methods: lecture publique » (select, true) est conservée.

create policy "exercise_methods: créer" on public.exercise_methods for insert to authenticated
  with check (
    exists (select 1 from public.exercises e
            where e.id = exercise_methods.exercise_id and e.created_by = (select auth.uid()))
    or (select public.is_admin())
  );
create policy "exercise_methods: modifier" on public.exercise_methods for update to authenticated
  using (
    exists (select 1 from public.exercises e
            where e.id = exercise_methods.exercise_id and e.created_by = (select auth.uid()))
    or (select public.is_admin())
  )
  with check (
    exists (select 1 from public.exercises e
            where e.id = exercise_methods.exercise_id and e.created_by = (select auth.uid()))
    or (select public.is_admin())
  );
create policy "exercise_methods: supprimer" on public.exercise_methods for delete to authenticated
  using (
    exists (select 1 from public.exercises e
            where e.id = exercise_methods.exercise_id and e.created_by = (select auth.uid()))
    or (select public.is_admin())
  );

-- ── Tables de référence : lecture publique, écriture admin ─────────
-- exercise_muscles, exercises, movement_types, muscle_groups, themes (partiel),
-- training_methods. Les lectures « authenticated » en double sont retirées :
-- la lecture publique (true) les couvre déjà.
drop policy "exercise_muscles_admin_write" on public.exercise_muscles;
drop policy "exercise_muscles_read_authenticated" on public.exercise_muscles;
create policy "exercise_muscles: créer" on public.exercise_muscles for insert to authenticated
  with check ((select public.is_admin()));
create policy "exercise_muscles: modifier" on public.exercise_muscles for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "exercise_muscles: supprimer" on public.exercise_muscles for delete to authenticated
  using ((select public.is_admin()));

drop policy "exercises_admin_write" on public.exercises;
drop policy "exercises_read_authenticated" on public.exercises;
create policy "exercises: créer" on public.exercises for insert to authenticated
  with check ((select public.is_admin()));
create policy "exercises: modifier" on public.exercises for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "exercises: supprimer" on public.exercises for delete to authenticated
  using ((select public.is_admin()));

drop policy "movement_types_admin_write" on public.movement_types;
create policy "movement_types: créer" on public.movement_types for insert to authenticated
  with check ((select public.is_admin()));
create policy "movement_types: modifier" on public.movement_types for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "movement_types: supprimer" on public.movement_types for delete to authenticated
  using ((select public.is_admin()));

drop policy "muscle_groups_admin_write" on public.muscle_groups;
drop policy "muscle_groups_read_authenticated" on public.muscle_groups;
create policy "muscle_groups: créer" on public.muscle_groups for insert to authenticated
  with check ((select public.is_admin()));
create policy "muscle_groups: modifier" on public.muscle_groups for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "muscle_groups: supprimer" on public.muscle_groups for delete to authenticated
  using ((select public.is_admin()));

drop policy "training_methods_admin_write" on public.training_methods;
create policy "training_methods: créer" on public.training_methods for insert to authenticated
  with check ((select public.is_admin()));
create policy "training_methods: modifier" on public.training_methods for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "training_methods: supprimer" on public.training_methods for delete to authenticated
  using ((select public.is_admin()));

-- ── themes ──────────────────────────────────────────────────────────
drop policy "themes_admin_write" on public.themes;
drop policy "themes_read_authenticated" on public.themes;
drop policy "themes: créer" on public.themes;
drop policy "themes: modifier les siens" on public.themes;
drop policy "themes: supprimer les siens" on public.themes;
-- « themes: lecture publique » (select, true) est conservée.

create policy "themes: créer" on public.themes for insert to authenticated
  with check (created_by = (select auth.uid()) or (select public.is_admin()));
create policy "themes: modifier" on public.themes for update to authenticated
  using (created_by = (select auth.uid()) or (select public.is_admin()))
  with check (created_by = (select auth.uid()) or (select public.is_admin()));
create policy "themes: supprimer" on public.themes for delete to authenticated
  using (created_by = (select auth.uid()) or (select public.is_admin()));

-- ── exercise_votes ──────────────────────────────────────────────────
drop policy "exercise_votes_admin_write" on public.exercise_votes;
drop policy "votes: voir ceux de mes seances" on public.exercise_votes;
drop policy "votes: voter" on public.exercise_votes;
drop policy "votes: retirer son vote" on public.exercise_votes;

create policy "votes: lire" on public.exercise_votes for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.vote_sessions vs
               where vs.id = exercise_votes.vote_session_id and vs.coach_id = (select auth.uid()))
    or exists (select 1 from public.vote_sessions vs
               join public.class_members cm on cm.class_id = vs.class_id
               where vs.id = exercise_votes.vote_session_id and cm.athlete_id = (select auth.uid()))
    or (select public.is_admin())
  );
create policy "votes: voter" on public.exercise_votes for insert to authenticated
  with check (
    (user_id = (select auth.uid())
     and exists (select 1 from public.vote_sessions vs
                 where vs.id = exercise_votes.vote_session_id
                   and vs.status = 'open'
                   and (vs.deadline is null or vs.deadline + interval '24 hours' > now())))
    or (select public.is_admin())
  );
create policy "votes: modifier (admin)" on public.exercise_votes for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "votes: retirer son vote" on public.exercise_votes for delete to authenticated
  using (
    (user_id = (select auth.uid())
     and exists (select 1 from public.vote_sessions vs
                 where vs.id = exercise_votes.vote_session_id
                   and vs.status = 'open'
                   and (vs.deadline is null or vs.deadline + interval '24 hours' > now())))
    or (select public.is_admin())
  );

-- ── profiles ────────────────────────────────────────────────────────
drop policy "profiles are viewable by owner" on public.profiles;
drop policy "profiles: voir le sien" on public.profiles;
drop policy "profiles_select_classmates" on public.profiles;
drop policy "profiles_select_coach_reads_members" on public.profiles;
drop policy "profiles_select_own_or_admin" on public.profiles;
drop policy "profiles can be inserted by owner" on public.profiles;
drop policy "profiles can be updated by owner" on public.profiles;
drop policy "profiles: modifier le sien" on public.profiles;
drop policy "profiles_update_own_or_admin" on public.profiles;

create policy "profiles: lire" on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or (select public.is_admin())
    or exists (select 1 from public.class_members my_cm
               join public.class_members their_cm on their_cm.class_id = my_cm.class_id
               where my_cm.athlete_id = (select auth.uid()) and their_cm.athlete_id = profiles.id)
    or exists (select 1 from public.class_members cm
               join public.classes c on c.id = cm.class_id
               where cm.athlete_id = profiles.id and c.coach_id = (select auth.uid()))
  );
create policy "profiles: créer le sien" on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy "profiles: modifier" on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

-- ── rank_shares, scheduled_workouts, user_badges (une seule règle) ──
drop policy "rank_shares: gérer le sien" on public.rank_shares;
create policy "rank_shares: gérer le sien" on public.rank_shares for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy "scheduled_workouts_owner_or_admin" on public.scheduled_workouts;
create policy "scheduled_workouts: gérer les siens" on public.scheduled_workouts for all to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()))
  with check (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy "user_badges: voir les siens" on public.user_badges;
create policy "user_badges: voir les siens" on public.user_badges for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- ── session_exercises ───────────────────────────────────────────────
-- « gérer les siens » est incluse dans « owner_or_admin ».
drop policy "session_exercises: gérer les siens" on public.session_exercises;
drop policy "session_exercises_owner_or_admin" on public.session_exercises;
create policy "session_exercises: gérer les siens" on public.session_exercises for all to authenticated
  using (exists (select 1 from public.workout_sessions ws
                 where ws.id = session_exercises.session_id
                   and (ws.user_id = (select auth.uid()) or (select public.is_admin()))))
  with check (exists (select 1 from public.workout_sessions ws
                      where ws.id = session_exercises.session_id
                        and (ws.user_id = (select auth.uid()) or (select public.is_admin()))));

-- ── vote_options ────────────────────────────────────────────────────
drop policy "vote_options_select_coach" on public.vote_options;
drop policy "vote_options_select_member" on public.vote_options;
drop policy "vote_options_write_coach" on public.vote_options;

create policy "vote_options: lire" on public.vote_options for select to authenticated
  using (
    exists (select 1 from public.vote_sessions vs
            where vs.id = vote_options.vote_session_id and vs.coach_id = (select auth.uid()))
    or exists (select 1 from public.vote_sessions vs
               join public.class_members cm on cm.class_id = vs.class_id
               where vs.id = vote_options.vote_session_id and cm.athlete_id = (select auth.uid()))
  );
create policy "vote_options: créer" on public.vote_options for insert to authenticated
  with check (exists (select 1 from public.vote_sessions vs
                      where vs.id = vote_options.vote_session_id and vs.coach_id = (select auth.uid())));
create policy "vote_options: modifier" on public.vote_options for update to authenticated
  using (exists (select 1 from public.vote_sessions vs
                 where vs.id = vote_options.vote_session_id and vs.coach_id = (select auth.uid())))
  with check (exists (select 1 from public.vote_sessions vs
                      where vs.id = vote_options.vote_session_id and vs.coach_id = (select auth.uid())));
create policy "vote_options: supprimer" on public.vote_options for delete to authenticated
  using (exists (select 1 from public.vote_sessions vs
                 where vs.id = vote_options.vote_session_id and vs.coach_id = (select auth.uid())));

-- ── vote_sessions ───────────────────────────────────────────────────
drop policy "vote_sessions_select_coach" on public.vote_sessions;
drop policy "vote_sessions_select_member" on public.vote_sessions;
drop policy "vote_sessions_insert_coach" on public.vote_sessions;
drop policy "vote_sessions_update_coach" on public.vote_sessions;
drop policy "vote_sessions_delete_coach" on public.vote_sessions;

create policy "vote_sessions: lire" on public.vote_sessions for select to authenticated
  using (
    coach_id = (select auth.uid())
    or exists (select 1 from public.class_members cm
               where cm.class_id = vote_sessions.class_id and cm.athlete_id = (select auth.uid()))
  );
create policy "vote_sessions: créer" on public.vote_sessions for insert to authenticated
  with check (coach_id = (select auth.uid()));
create policy "vote_sessions: modifier" on public.vote_sessions for update to authenticated
  using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));
create policy "vote_sessions: supprimer" on public.vote_sessions for delete to authenticated
  using (coach_id = (select auth.uid()));

-- ── workout_exercises ───────────────────────────────────────────────
drop policy "workout_exercises: gérer les siens" on public.workout_exercises;
drop policy "workout_exercises_owner_or_admin" on public.workout_exercises;
drop policy "workout_exercises: voir les siens" on public.workout_exercises;
drop policy "workout_exercises_select_admin_authored" on public.workout_exercises;

create policy "workout_exercises: lire" on public.workout_exercises for select to authenticated
  using (exists (select 1 from public.workouts w
                 where w.id = workout_exercises.workout_id
                   and (w.created_by = (select auth.uid()) or (select public.is_admin())
                        or public.is_admin_authored(w.created_by))));
create policy "workout_exercises: créer" on public.workout_exercises for insert to authenticated
  with check (exists (select 1 from public.workouts w
                      where w.id = workout_exercises.workout_id
                        and (w.created_by = (select auth.uid()) or (select public.is_admin()))));
create policy "workout_exercises: modifier" on public.workout_exercises for update to authenticated
  using (exists (select 1 from public.workouts w
                 where w.id = workout_exercises.workout_id
                   and (w.created_by = (select auth.uid()) or (select public.is_admin()))))
  with check (exists (select 1 from public.workouts w
                      where w.id = workout_exercises.workout_id
                        and (w.created_by = (select auth.uid()) or (select public.is_admin()))));
create policy "workout_exercises: supprimer" on public.workout_exercises for delete to authenticated
  using (exists (select 1 from public.workouts w
                 where w.id = workout_exercises.workout_id
                   and (w.created_by = (select auth.uid()) or (select public.is_admin()))));

-- ── workout_sessions ────────────────────────────────────────────────
-- Les quatre règles « les siennes » sont incluses dans owner_or_admin.
drop policy "workout_sessions_owner_or_admin" on public.workout_sessions;
drop policy "sessions: voir les siennes" on public.workout_sessions;
drop policy "sessions: créer" on public.workout_sessions;
drop policy "sessions: modifier les siennes" on public.workout_sessions;
drop policy "sessions: supprimer les siennes" on public.workout_sessions;
create policy "sessions: gérer les siennes" on public.workout_sessions for all to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()))
  with check (user_id = (select auth.uid()) or (select public.is_admin()));

-- ── workouts ────────────────────────────────────────────────────────
drop policy "workouts: voir les siens" on public.workouts;
drop policy "workouts_select_admin_authored" on public.workouts;
drop policy "workouts_select_owner_or_admin" on public.workouts;
drop policy "workouts: créer" on public.workouts;
drop policy "workouts_insert_owner_or_admin" on public.workouts;
drop policy "workouts: modifier les siens" on public.workouts;
drop policy "workouts_update_owner_or_admin" on public.workouts;
drop policy "workouts: supprimer les siens" on public.workouts;
drop policy "workouts_delete_owner_or_admin" on public.workouts;

create policy "workouts: lire" on public.workouts for select to authenticated
  using (created_by = (select auth.uid()) or (select public.is_admin()) or public.is_admin_authored(created_by));
create policy "workouts: créer" on public.workouts for insert to authenticated
  with check (created_by = (select auth.uid()) or (select public.is_admin()));
create policy "workouts: modifier" on public.workouts for update to authenticated
  using (created_by = (select auth.uid()) or (select public.is_admin()))
  with check (created_by = (select auth.uid()) or (select public.is_admin()));
create policy "workouts: supprimer" on public.workouts for delete to authenticated
  using (created_by = (select auth.uid()) or (select public.is_admin()));

-- ── storage : avatars ───────────────────────────────────────────────
-- La lecture était déjà couverte par « avatars: lecture publique ».
drop policy "avatars: gérer le sien" on storage.objects;
create policy "avatars: ajouter le sien" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: modifier le sien" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: supprimer le sien" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ═══════════════════════════════════════════════════════════════════
-- Fonctions exposées
-- ═══════════════════════════════════════════════════════════════════

-- Utilitaires des règles d'accès : plus aucune règle visible par anon ne
-- les appelle, il n'a donc plus besoin de les exécuter.
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_admin_authored(uuid) from public, anon;
revoke execute on function public.is_class_coach(uuid) from public, anon;
revoke execute on function public.is_class_member(uuid) from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.is_admin_authored(uuid) to authenticated, service_role;
grant execute on function public.is_class_coach(uuid) to authenticated, service_role;
grant execute on function public.is_class_member(uuid) to authenticated, service_role;

-- Fonction de déclencheur : Postgres l'exécute pour le déclencheur sans
-- vérifier ce droit, personne n'a à l'appeler directement.
revoke execute on function public.wodbud_set_vote_option_color() from public, anon, authenticated;

-- Recalcul des badges : un compte ne peut plus le lancer que pour lui-même
-- (ou un admin pour n'importe qui). Les appels sans utilisateur connecté
-- (service, déclencheurs) ne sont pas touchés : auth.uid() nul rend la
-- comparaison nulle, donc la garde ne bloque pas.
do $$
declare
  def text := pg_get_functiondef('public.wodbud_recalc_badges(uuid)'::regprocedure);
  guarded text;
begin
  guarded := regexp_replace(
    def,
    'if p_user is null then\s+return;\s+end if;',
    'if p_user is null or (p_user <> auth.uid() and not public.is_admin()) then return; end if;'
  );
  if guarded = def then
    raise exception 'wodbud_recalc_badges : garde attendue introuvable, migration à revoir';
  end if;
  execute guarded;
end $$;
