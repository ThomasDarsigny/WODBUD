-- 049 — Base d'exercices des centres.
--
-- L'entraîneur chef (ou le proprio-chef) crée un exercice : il est utilisable
-- tout de suite dans son centre. L'équipe WODBUD le relit, peut le corriger,
-- puis le publie dans la base commune (center_id remis à null) ; l'auteur en
-- est averti. Les vidéos officielles restent faites par WODBUD.
--
--   center_id         null = base commune ; sinon, visible dans ce centre seulement
--   origin_center_id  centre qui l'a proposé (gardé après la publication)
--   review_status     pending (à relire) · published (passé dans la base
--                     commune) · private (WODBUD le laisse au centre) ;
--                     null pour les exercices créés par WODBUD
--
-- Champs demandés pour la validation : muscles (exercise_muscles),
-- équipement, consignes techniques (description) et niveau. Le chef joint une photo ou une
-- courte vidéo de référence, privée : seule l'équipe WODBUD la voit, dans un
-- compartiment de stockage fermé (exercise-references).

alter table public.exercises
  add column center_id uuid references public.centers(id) on delete cascade,
  add column origin_center_id uuid references public.centers(id) on delete set null,
  add column review_status text check (review_status is null or review_status in ('pending', 'published', 'private')),
  add column level text check (level is null or level in ('beginner', 'intermediate', 'advanced')),
  add column equipment text[] not null default '{}',
  add column published_at timestamptz,
  add column reviewed_by uuid references public.profiles(id) on delete set null;

create index exercises_center_idx on public.exercises(center_id) where center_id is not null;
create index exercises_review_idx on public.exercises(review_status) where review_status = 'pending';

-- Peut modifier cet exercice : l'admin, ou le proprio / un chef de son centre
-- tant qu'il n'est pas dans la base commune.
create function public.can_edit_exercise(p_exercise uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_admin()
      or exists (
        select 1 from public.exercises e
         where e.id = p_exercise
           and e.center_id is not null
           and public.is_center_lead(e.center_id)
      );
$$;

-- ─── Accès aux exercices ────────────────────────────────────────────

drop policy "exercises: lecture publique" on public.exercises;
drop policy "exercises: créer" on public.exercises;
drop policy "exercises: modifier" on public.exercises;
drop policy "exercises: supprimer" on public.exercises;

-- La base commune reste publique (la landing la lit) ; les exercices d'un
-- centre ne sont visibles que de ce centre et de WODBUD.
create policy "exercises: lire" on public.exercises
  for select using (
    center_id is null
    or public.center_role(center_id) is not null
    or (select public.is_admin())
  );

create policy "exercises: créer" on public.exercises
  for insert with check (
    (select public.is_admin())
    or (
      center_id is not null
      and public.is_center_lead(center_id)
      and created_by = (select auth.uid())
      and review_status = 'pending'
      and origin_center_id = center_id
    )
  );

create policy "exercises: modifier" on public.exercises
  for update using (
    (select public.is_admin())
    or (center_id is not null and public.is_center_lead(center_id))
  )
  with check (
    (select public.is_admin())
    or (center_id is not null and public.is_center_lead(center_id))
  );

create policy "exercises: supprimer" on public.exercises
  for delete using (
    (select public.is_admin())
    or (center_id is not null and public.is_center_lead(center_id))
  );

-- Un chef corrige le contenu, jamais le statut de relecture ni le centre :
-- seule WODBUD publie.
create function public.wodbud_exercise_review_guard()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    new.center_id := old.center_id;
    new.origin_center_id := old.origin_center_id;
    new.review_status := old.review_status;
    new.published_at := old.published_at;
    new.reviewed_by := old.reviewed_by;
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;

create trigger exercises_review_guard before update on public.exercises
  for each row execute function public.wodbud_exercise_review_guard();

-- Muscles et méthodes : mêmes droits que l'exercice.
drop policy "exercise_muscles: créer" on public.exercise_muscles;
drop policy "exercise_muscles: modifier" on public.exercise_muscles;
drop policy "exercise_muscles: supprimer" on public.exercise_muscles;

create policy "exercise_muscles: créer" on public.exercise_muscles
  for insert with check (public.can_edit_exercise(exercise_id));
create policy "exercise_muscles: modifier" on public.exercise_muscles
  for update using (public.can_edit_exercise(exercise_id)) with check (public.can_edit_exercise(exercise_id));
create policy "exercise_muscles: supprimer" on public.exercise_muscles
  for delete using (public.can_edit_exercise(exercise_id));

drop policy "exercise_methods: créer" on public.exercise_methods;
drop policy "exercise_methods: modifier" on public.exercise_methods;
drop policy "exercise_methods: supprimer" on public.exercise_methods;

create policy "exercise_methods: créer" on public.exercise_methods
  for insert with check (public.can_edit_exercise(exercise_id));
create policy "exercise_methods: modifier" on public.exercise_methods
  for update using (public.can_edit_exercise(exercise_id)) with check (public.can_edit_exercise(exercise_id));
create policy "exercise_methods: supprimer" on public.exercise_methods
  for delete using (public.can_edit_exercise(exercise_id));

-- ─── Médias de référence (privés) ───────────────────────────────────

create table public.exercise_references (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  path text not null unique,
  kind text not null check (kind in ('photo', 'video')),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index exercise_references_exercise_idx on public.exercise_references(exercise_id);

alter table public.exercise_references enable row level security;

create policy "exercise_references: lire" on public.exercise_references
  for select using (public.can_edit_exercise(exercise_id));

create policy "exercise_references: ajouter" on public.exercise_references
  for insert with check (created_by = (select auth.uid()) and public.can_edit_exercise(exercise_id));

create policy "exercise_references: supprimer" on public.exercise_references
  for delete using (public.can_edit_exercise(exercise_id));

-- Compartiment fermé : chemin <exercise_id>/<fichier>. 60 Mo au plus — l'app
-- compresse la vidéo en 720p avant l'envoi (≈ 20 Mo la minute).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exercise-references', 'exercise-references', false, 62914560,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do nothing;

create function public.can_edit_exercise_path(p_name text)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  begin
    v_id := (storage.foldername(p_name))[1]::uuid;
  exception when others then
    return false;
  end;
  return public.can_edit_exercise(v_id);
end;
$$;

create policy "exercise-references: lire" on storage.objects
  for select using (bucket_id = 'exercise-references' and public.can_edit_exercise_path(name));

create policy "exercise-references: ajouter" on storage.objects
  for insert with check (bucket_id = 'exercise-references' and public.can_edit_exercise_path(name));

create policy "exercise-references: supprimer" on storage.objects
  for delete using (bucket_id = 'exercise-references' and public.can_edit_exercise_path(name));

-- ─── Relecture WODBUD ───────────────────────────────────────────────

-- File d'attente avec le nom du centre et de l'auteur (profils fermés).
create function public.get_exercise_review_queue()
returns table (
  exercise_id uuid, name text, center_name text, author_name text,
  created_at timestamptz, review_status text, references_count bigint
)
language sql stable security definer set search_path = public
as $$
  select e.id, e.name, c.name, p.full_name, e.created_at, e.review_status,
         (select count(*) from public.exercise_references r where r.exercise_id = e.id)
    from public.exercises e
    left join public.centers c on c.id = coalesce(e.center_id, e.origin_center_id)
    left join public.profiles p on p.id = e.created_by
   where public.is_admin()
     and e.review_status = 'pending'
   order by e.created_at;
$$;

-- Publier dans la base commune, ou laisser l'exercice à son centre.
create function public.review_center_exercise(p_exercise uuid, p_decision text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_decision not in ('published', 'private') then raise exception 'invalid_decision'; end if;

  update public.exercises
     set review_status = p_decision,
         center_id = case when p_decision = 'published' then null else center_id end,
         published_at = case when p_decision = 'published' then now() else published_at end,
         reviewed_by = auth.uid()
   where id = p_exercise and review_status = 'pending';

  if not found then raise exception 'not_pending'; end if;
end;
$$;
