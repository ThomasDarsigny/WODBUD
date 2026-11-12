-- 056 — Engagement (6.2) : inviter quelqu'un qui a déjà WODBUD par une
-- notification push. L'invitant donne un courriel ; la fonction `push`
-- (service role) retrouve le compte, vérifie les droits et envoie.
--
-- Vie privée : la réponse est la même que le compte existe ou non (pas de
-- moyen de savoir qui est inscrit). Anti-spam : une seule notification par
-- personne et par cours ou communauté, et 30 invitations par jour au plus
-- pour un même invitant.

create table public.invite_notifications (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  target_kind text not null check (target_kind in ('class', 'community')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  unique (recipient_id, target_kind, target_id)
);

create index invite_notifications_sender_idx on public.invite_notifications (sender_id, created_at);

-- Aucune règle d'accès : seule la fonction `push` (service role) lit et écrit.
alter table public.invite_notifications enable row level security;

-- Compte correspondant à un courriel, pour la fonction `push` seulement.
create function public.wodbud_user_id_by_email(p_email text)
returns uuid
language sql stable security definer set search_path = public, auth
as $$
  select id from auth.users where lower(email) = lower(trim(p_email)) limit 1;
$$;

revoke execute on function public.wodbud_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.wodbud_user_id_by_email(text) to service_role;
