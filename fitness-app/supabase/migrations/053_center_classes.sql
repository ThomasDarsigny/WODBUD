-- 053 — Travail d'équipe (8.1) : le proprio et les entraîneurs chefs voient
-- tous les cours de leur centre, avec leurs membres et leur programmation.
-- Lecture seulement : modifier un cours reste à son entraîneur (l'assignation
-- par un chef viendra au point 8.3).

-- Le cours appartient à un centre dont je suis proprio ou chef.
create function public.is_class_lead(p_class_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.classes c
     where c.id = p_class_id
       and c.center_id is not null
       and public.is_center_lead(c.center_id)
  );
$$;

drop policy "classes: lire" on public.classes;
create policy "classes: lire" on public.classes for select to authenticated
  using (
    coach_id = (select auth.uid())
    or exists (select 1 from public.class_members cm where cm.class_id = classes.id and cm.athlete_id = (select auth.uid()))
    or (center_id is not null and public.is_center_lead(center_id))
  );

drop policy "class_members: lire" on public.class_members;
create policy "class_members: lire" on public.class_members for select to authenticated
  using (
    athlete_id = (select auth.uid())
    or public.is_class_member(class_id)
    or public.is_class_coach(class_id)
    or public.is_class_lead(class_id)
  );

drop policy "class_plans: lire" on public.class_plans;
create policy "class_plans: lire" on public.class_plans for select to authenticated
  using (
    public.is_class_coach(class_id)
    or public.is_class_member(class_id)
    or public.is_class_lead(class_id)
    or (select public.is_admin())
  );

-- Vue d'ensemble pour le proprio et les chefs : chaque cours du centre, son
-- entraîneur, le nombre de membres et la prochaine séance programmée.
create function public.get_center_classes(p_center uuid)
returns table (
  class_id uuid, name text, schedule text, coach_id uuid, coach_name text,
  members_count bigint, next_plan_date date, created_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select c.id, c.name, c.schedule, c.coach_id, p.full_name,
         (select count(*) from public.class_members cm where cm.class_id = c.id),
         (select min(cp.scheduled_date) from public.class_plans cp where cp.class_id = c.id and cp.scheduled_date >= current_date),
         c.created_at
    from public.classes c
    left join public.profiles p on p.id = c.coach_id
   where c.center_id = p_center
     and public.is_center_lead(p_center)
   order by p.full_name nulls last, c.name;
$$;

revoke execute on function public.get_center_classes(uuid) from anon;
revoke execute on function public.is_class_lead(uuid) from anon;
