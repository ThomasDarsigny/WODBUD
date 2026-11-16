-- 073 · Notifications de l'app des boutiques (A4)
--
-- Les notifications web (push_subscriptions, 039) n'existent pas dans l'app
-- emballée : Android passe par Firebase Cloud Messaging (FCM), plus tard iOS
-- par Apple. Un appareil s'y inscrit avec un jeton ; la fonction Edge `push`
-- envoie à ces jetons en plus des abonnements web.
--
-- Un jeton désigne une installation de l'app : le compte connecté dessus en
-- devient propriétaire (deux comptes sur le même téléphone : le dernier
-- inscrit reçoit). L'écriture passe donc par register_device_token, qui
-- valide et réattribue ; chacun lit et supprime les siens. 10 appareils au
-- plus par compte, les plus anciens partent. La fonction `push` retire un
-- jeton que FCM déclare périmé (app désinstallée).

create table public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null unique check (char_length(token) between 20 and 4096),
  platform text not null check (platform in ('android', 'ios')),
  created_at timestamptz not null default now(),
  -- clock_timestamp() et non now() : deux inscriptions dans la même
  -- transaction restent ordonnées (le plafond de 10 garde les plus récentes).
  last_seen_at timestamptz not null default clock_timestamp()
);
create index device_tokens_user_idx on public.device_tokens (user_id, last_seen_at desc);

alter table public.device_tokens enable row level security;

create policy "device_tokens: lire les siens" on public.device_tokens
  for select to authenticated using (user_id = (select auth.uid()));
create policy "device_tokens: supprimer les siens" on public.device_tokens
  for delete to authenticated using (user_id = (select auth.uid()));
-- Aucune politique d'insertion ni de modification : seule la fonction ci-dessous écrit.
revoke all on public.device_tokens from anon;

create function public.register_device_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_platform is null or p_platform not in ('android', 'ios')
     or p_token is null or char_length(p_token) not between 20 and 4096 then
    raise exception 'invalid_device_token' using errcode = '22023';
  end if;

  insert into public.device_tokens (user_id, token, platform)
  values (v_user, p_token, p_platform)
  on conflict (token) do update
    set user_id = excluded.user_id, platform = excluded.platform, last_seen_at = clock_timestamp();

  -- Le jeton qu'on vient d'inscrire n'est jamais celui qui part.
  delete from public.device_tokens
  where id in (
    select id from public.device_tokens
    where user_id = v_user and token <> p_token
    order by last_seen_at desc
    offset 9
  );
end;
$$;

revoke execute on function public.register_device_token(text, text) from public, anon;
grant execute on function public.register_device_token(text, text) to authenticated;
