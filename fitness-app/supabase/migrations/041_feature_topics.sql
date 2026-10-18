-- 041 — Vote des thématiques à ajouter à l'app.
--
-- L'admin propose des thématiques (section admin) ; chaque compte choisit
-- UNE seule thématique au total — la clé primaire sur user_id le garantit,
-- changer d'avis remplace le choix. Les votes restent privés : seuls les
-- décomptes sortent, par get_feature_topics().

create table public.feature_topics (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text check (description is null or char_length(description) <= 500),
  status text not null default 'open' check (status in ('open', 'closed', 'done')),
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.feature_topic_votes (
  user_id uuid primary key default auth.uid() references public.profiles(id) on delete cascade,
  topic_id uuid not null references public.feature_topics(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index feature_topic_votes_topic_idx on public.feature_topic_votes (topic_id);

alter table public.feature_topics enable row level security;
alter table public.feature_topic_votes enable row level security;

revoke all on public.feature_topics, public.feature_topic_votes from anon;

create policy "feature_topics: lire" on public.feature_topics
  for select to authenticated using (true);
create policy "feature_topics: admin ajoute" on public.feature_topics
  for insert to authenticated with check ((select public.is_admin()));
create policy "feature_topics: admin modifie" on public.feature_topics
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "feature_topics: admin supprime" on public.feature_topics
  for delete to authenticated using ((select public.is_admin()));

-- Son propre choix seulement, et seulement vers une thématique ouverte.
create policy "feature_topic_votes: lire le sien" on public.feature_topic_votes
  for select to authenticated using (user_id = (select auth.uid()));
create policy "feature_topic_votes: voter" on public.feature_topic_votes
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.feature_topics t where t.id = topic_id and t.status = 'open')
  );
create policy "feature_topic_votes: changer" on public.feature_topic_votes
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.feature_topics t where t.id = topic_id and t.status = 'open')
  );
create policy "feature_topic_votes: retirer" on public.feature_topic_votes
  for delete to authenticated using (user_id = (select auth.uid()));

-- Thématiques + décompte + choix de l'appelant.
create or replace function public.get_feature_topics()
returns table (
  id uuid,
  title text,
  description text,
  status text,
  created_at timestamptz,
  votes bigint,
  is_mine boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.title, t.description, t.status, t.created_at,
         count(v.user_id) as votes,
         coalesce(bool_or(v.user_id = (select auth.uid())), false) as is_mine
  from public.feature_topics t
  left join public.feature_topic_votes v on v.topic_id = t.id
  where (select auth.uid()) is not null
  group by t.id
  order by (t.status = 'open') desc, count(v.user_id) desc, t.created_at desc;
$$;

revoke execute on function public.get_feature_topics() from public, anon;
grant execute on function public.get_feature_topics() to authenticated;
