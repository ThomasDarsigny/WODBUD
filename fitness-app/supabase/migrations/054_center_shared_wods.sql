-- 054 — Travail d'équipe (8.2) : les WODs sont partagés dans l'équipe du
-- centre. Le proprio, les chefs et les entraîneurs lisent les entraînements
-- de leurs collègues (pour les lancer, les programmer dans leur cours ou s'en
-- inspirer). Lecture seulement : seul l'auteur modifie ou supprime son WOD.
-- Les membres du centre ne sont pas concernés.

-- Cette personne et moi faisons partie de l'équipe (pas les membres) d'un même centre.
create function public.shares_center_staff(p_user uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select p_user is not null and exists (
    select 1
      from public.center_members me
      join public.center_members other on other.center_id = me.center_id
     where me.user_id = auth.uid()
       and other.user_id = p_user
       and me.role in ('owner', 'head_coach', 'coach')
       and other.role in ('owner', 'head_coach', 'coach')
  );
$$;

revoke execute on function public.shares_center_staff(uuid) from anon;

drop policy "workouts: lire" on public.workouts;
create policy "workouts: lire" on public.workouts for select to authenticated
  using (
    created_by = (select auth.uid())
    or (select public.is_admin())
    or public.is_admin_authored(created_by)
    or public.shares_center_staff(created_by)
  );

drop policy "workout_exercises: lire" on public.workout_exercises;
create policy "workout_exercises: lire" on public.workout_exercises for select to authenticated
  using (
    exists (
      select 1 from public.workouts w
       where w.id = workout_exercises.workout_id
         and (
           w.created_by = (select auth.uid())
           or (select public.is_admin())
           or public.is_admin_authored(w.created_by)
           or public.shares_center_staff(w.created_by)
         )
    )
    or exists (
      select 1 from public.class_plans cp
       where cp.workout_id = workout_exercises.workout_id and public.is_class_member(cp.class_id)
    )
    or exists (
      select 1 from public.community_wods cw
       where cw.workout_id = workout_exercises.workout_id and public.is_community_member(cw.community_id)
    )
  );
