-- 050 — Import des exercices par les centres, et priorité des vidéos.
--
-- Un centre (proprio ou entraîneur chef) importe ses exercices en CSV, PDF ou
-- photos de feuilles ; WODBUD aussi, depuis l'admin. Chaque exercice trouvé
-- est compté : combien de fois il revient dans les feuilles (occurrences).
-- Ce qui existe déjà est relié à l'exercice existant au lieu d'être recréé.
--
-- Additionnées sur tous les imports de tous les centres, ces mentions donnent
-- à WODBUD la liste des vidéos officielles à tourner en priorité : les
-- exercices les plus utilisés qui n'ont pas encore de vidéo.

create table public.exercise_mentions (
  id uuid primary key default gen_random_uuid(),
  -- null = import fait par WODBUD.
  center_id uuid references public.centers(id) on delete cascade,
  -- null = pas relié (nom non importé et sans équivalent dans la base).
  exercise_id uuid references public.exercises(id) on delete set null,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  name_normalized text not null,
  occurrences integer not null default 1 check (occurrences between 1 and 10000),
  source text not null check (source in ('photo', 'pdf', 'csv')),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index exercise_mentions_exercise_idx on public.exercise_mentions(exercise_id);
create index exercise_mentions_center_idx on public.exercise_mentions(center_id);

alter table public.exercise_mentions enable row level security;

create policy "exercise_mentions: lire" on public.exercise_mentions
  for select using (
    (select public.is_admin())
    or (center_id is not null and public.is_center_lead(center_id))
  );

create policy "exercise_mentions: ajouter" on public.exercise_mentions
  for insert with check (
    created_by = (select auth.uid())
    and (
      (center_id is null and (select public.is_admin()))
      or (center_id is not null and public.is_center_lead(center_id))
    )
  );

-- Liste de WODBUD : les exercices sans vidéo officielle d'abord, puis les
-- plus mentionnés. Les noms non reliés sont regroupés par nom normalisé.
create function public.get_video_priorities(p_limit integer default 30)
returns table (
  exercise_id uuid, name text, total bigint, sources bigint, has_video boolean, in_common boolean
)
language sql stable security definer set search_path = public
as $$
  with g as (
    select m.exercise_id,
           coalesce(m.exercise_id::text, 'n:' || m.name_normalized) as k,
           min(m.name) as any_name,
           sum(m.occurrences)::bigint as total,
           count(distinct coalesce(m.center_id::text, 'wodbud'))::bigint as sources
      from public.exercise_mentions m
     group by m.exercise_id, coalesce(m.exercise_id::text, 'n:' || m.name_normalized)
  )
  select g.exercise_id,
         coalesce(e.name, g.any_name),
         g.total,
         g.sources,
         coalesce(e.video_url is not null or e.video_path is not null, false),
         coalesce(e.center_id is null, false)
    from g
    left join public.exercises e on e.id = g.exercise_id
   where public.is_admin()
   order by coalesce(e.video_url is not null or e.video_path is not null, false), g.total desc, 2
   limit greatest(1, least(p_limit, 200));
$$;
