-- 052 — Liens entre exercices : progression, régression, adaptation.
--
--   harder      « to » est une variante plus dure de « from » ;
--               le lien se lit aussi à l'envers : « from » est plus facile que « to ».
--   adaptation  « to » remplace « from » quand une zone du corps (zone) fait mal :
--               il la sollicite moins. Pas de lecture à l'envers.
--
-- On ne stocke que le sens « plus dur » : « plus facile » s'en déduit, un seul
-- lien à saisir et rien à garder en double. Liens de WODBUD (center_id null,
-- entre exercices de la base commune) ou d'un centre (ses exercices et ceux de
-- la base commune), créés par le proprio ou un entraîneur chef.

create table public.exercise_links (
  id uuid primary key default gen_random_uuid(),
  from_exercise_id uuid not null references public.exercises(id) on delete cascade,
  to_exercise_id uuid not null references public.exercises(id) on delete cascade,
  kind text not null check (kind in ('harder', 'adaptation')),
  zone text check (zone is null or zone in ('shoulder', 'elbow', 'wrist', 'neck', 'back', 'hip', 'knee', 'ankle')),
  center_id uuid references public.centers(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (from_exercise_id <> to_exercise_id),
  check ((kind = 'adaptation') = (zone is not null))
);

-- Un même lien une seule fois par portée (WODBUD ou un centre).
create unique index exercise_links_unique on public.exercise_links (
  from_exercise_id, to_exercise_id, kind, coalesce(zone, ''), coalesce(center_id, '00000000-0000-0000-0000-000000000000'::uuid)
);
create index exercise_links_from_idx on public.exercise_links(from_exercise_id);
create index exercise_links_to_idx on public.exercise_links(to_exercise_id);

-- Un lien de WODBUD ne relie que la base commune ; celui d'un centre, ses
-- exercices ou ceux de la base commune — jamais ceux d'un autre centre.
create function public.wodbud_exercise_link_scope()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if exists (
    select 1 from public.exercises e
     where e.id in (new.from_exercise_id, new.to_exercise_id)
       and e.center_id is not null
       and e.center_id is distinct from new.center_id
  ) then
    raise exception 'exercise_out_of_scope';
  end if;
  return new;
end;
$$;

create trigger exercise_links_scope before insert or update on public.exercise_links
  for each row execute function public.wodbud_exercise_link_scope();

alter table public.exercise_links enable row level security;

create policy "exercise_links: lire" on public.exercise_links
  for select using (
    center_id is null
    or public.center_role(center_id) is not null
    or (select public.is_admin())
  );

create policy "exercise_links: créer" on public.exercise_links
  for insert with check (
    created_by = (select auth.uid())
    and (
      (center_id is null and (select public.is_admin()))
      or (center_id is not null and public.is_center_lead(center_id))
    )
  );

create policy "exercise_links: supprimer" on public.exercise_links
  for delete using (
    (center_id is null and (select public.is_admin()))
    or (center_id is not null and public.is_center_lead(center_id))
  );

-- Variantes d'un exercice, dans les deux sens, avec les droits de la personne
-- (security invoker : les règles d'accès des liens et des exercices s'appliquent).
create function public.get_exercise_variants(p_exercise uuid)
returns table (link_id uuid, exercise_id uuid, name text, kind text, zone text, center_id uuid)
language sql stable security invoker set search_path = public
as $$
  select l.id, e.id, e.name, 'harder', null::text, l.center_id
    from public.exercise_links l join public.exercises e on e.id = l.to_exercise_id
   where l.from_exercise_id = p_exercise and l.kind = 'harder'
  union all
  select l.id, e.id, e.name, 'easier', null::text, l.center_id
    from public.exercise_links l join public.exercises e on e.id = l.from_exercise_id
   where l.to_exercise_id = p_exercise and l.kind = 'harder'
  union all
  select l.id, e.id, e.name, 'adaptation', l.zone, l.center_id
    from public.exercise_links l join public.exercises e on e.id = l.to_exercise_id
   where l.from_exercise_id = p_exercise and l.kind = 'adaptation'
  order by 4, 5 nulls first, 3;
$$;
