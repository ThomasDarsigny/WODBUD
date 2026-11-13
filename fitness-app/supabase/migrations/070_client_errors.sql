-- 070 · Suivi des erreurs (phase 4, 4.5)
--
-- Les erreurs JavaScript rencontrées par les utilisateurs, sans service tiers :
-- le message, la page (sans paramètres, jetons et identifiants masqués côté
-- client), la version de l'app et le navigateur. Rien d'autre.
--
-- Écriture : seulement par log_client_error, qui valide, tronque et limite la
-- fréquence (20 par compte et par heure ; 300 par heure pour l'ensemble des
-- visiteurs sans compte). Conservation : 90 jours, purge au passage.
-- Lecture : administrateurs seulement.

create table public.client_errors (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('error', 'unhandledrejection', 'render')),
  message text not null check (char_length(message) between 1 and 500),
  stack text check (char_length(stack) <= 4000),
  path text check (char_length(path) <= 200),
  app_version text check (char_length(app_version) <= 40),
  user_agent text check (char_length(user_agent) <= 200)
);

create index client_errors_created_at_idx on public.client_errors (created_at desc);
create index client_errors_user_recent_idx on public.client_errors (user_id, created_at desc);

alter table public.client_errors enable row level security;

create policy "client_errors: lire (admin)" on public.client_errors
  for select to authenticated using ((select public.is_admin()));
-- Aucune politique d'écriture : seule la fonction ci-dessous insère.

create or replace function public.log_client_error(
  p_kind text,
  p_message text,
  p_stack text default null,
  p_path text default null,
  p_app_version text default null,
  p_user_agent text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if p_kind is null or p_kind not in ('error', 'unhandledrejection', 'render') then return; end if;
  if coalesce(btrim(p_message), '') = '' then return; end if;

  if v_uid is not null then
    if (select count(*) from client_errors
        where user_id = v_uid and created_at > now() - interval '1 hour') >= 20 then return; end if;
  else
    if (select count(*) from client_errors
        where user_id is null and created_at > now() - interval '1 hour') >= 300 then return; end if;
  end if;

  delete from client_errors where created_at < now() - interval '90 days';

  insert into client_errors (user_id, kind, message, stack, path, app_version, user_agent)
  values (v_uid, p_kind, left(btrim(p_message), 500), left(p_stack, 4000), left(p_path, 200),
          left(p_app_version, 40), left(p_user_agent, 200));
end $$;

revoke all on function public.log_client_error(text, text, text, text, text, text) from public;
grant execute on function public.log_client_error(text, text, text, text, text, text) to anon, authenticated;
