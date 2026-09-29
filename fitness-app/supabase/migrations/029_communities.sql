-- ═══════════════════════════════════════════════════════════════════
-- Communautés — pouvoir en rejoindre, et partager ses accomplissements.
--
-- Volontairement ouvertes à tout compte, pas réservées à un segment
-- « gym » : `classes` (la fonctionnalité la plus proche) ne restreint déjà
-- personne — n'importe quel compte peut créer une classe et devenir coach
-- (classes_insert_coach : with_check coach_id = auth.uid(), sans condition).
-- Ajouter une restriction ici casserait cette cohérence pour une protection
-- de toute façon contournable (créer une classe jetable suffirait).
--
-- Différence avec `classes` : une classe n'est visible que par son coach et
-- ses membres (classes_select_coach / classes_select_member) — privé par
-- construction, on y entre par lien d'invitation. Une communauté doit être
-- browsable pour qu'on puisse la rejoindre, donc SELECT est ouvert à tout
-- compte connecté.
-- ═══════════════════════════════════════════════════════════════════

create table public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

alter table public.communities enable row level security;
alter table public.community_members enable row level security;

create policy "communities: lecture" on public.communities
  for select using (auth.role() = 'authenticated');

create policy "communities: créer" on public.communities
  for insert with check (created_by = auth.uid());

create policy "communities: modifier/supprimer les siennes" on public.communities
  for all using (created_by = auth.uid() or is_admin())
  with check (created_by = auth.uid() or is_admin());

create policy "community_members: lecture" on public.community_members
  for select using (auth.role() = 'authenticated');

create policy "community_members: rejoindre" on public.community_members
  for insert with check (user_id = auth.uid());

create policy "community_members: quitter ou retirer" on public.community_members
  for delete using (
    user_id = auth.uid()
    or exists (select 1 from public.communities c where c.id = community_id and c.created_by = auth.uid())
    or is_admin()
  );

-- Réseaux sociaux pour partager ses accomplissements — liste de
-- {platform, url}, pas une colonne par réseau : "autre" doit rester
-- possible sans migration à chaque nouvelle plateforme.
alter table public.profiles add column social_links jsonb not null default '[]'::jsonb;
