-- 072 · Formulaire de contact du site (/contact)
--
-- Un visiteur, avec ou sans compte, écrit à l'équipe WODBUD : nom, courriel,
-- sujet (un centre intéressé, un membre, une question, la presse, autre),
-- nom du centre facultatif, message. Rien d'autre n'est gardé.
--
-- Écriture : seulement par send_contact_message, qui valide, tronque et limite
-- la fréquence (3 messages par heure pour une même adresse, 60 par heure en
-- tout). Conservation : 12 mois, purge au passage.
-- Lecture et traitement : administrateurs seulement (section « Messages du
-- site » de l'administration).

create table public.contact_messages (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 200),
  topic text not null check (topic in ('center', 'member', 'question', 'press', 'other')),
  organization text check (char_length(organization) <= 120),
  message text not null check (char_length(message) between 10 and 4000),
  locale text check (char_length(locale) <= 10),
  status text not null default 'new' check (status in ('new', 'done')),
  handled_at timestamptz,
  handled_by uuid references auth.users (id) on delete set null
);

create index contact_messages_status_idx on public.contact_messages (status, created_at desc);
create index contact_messages_email_recent_idx on public.contact_messages (lower(email), created_at desc);

alter table public.contact_messages enable row level security;

create policy "contact_messages: lire (admin)" on public.contact_messages
  for select to authenticated using ((select public.is_admin()));
create policy "contact_messages: traiter (admin)" on public.contact_messages
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
-- Aucune politique d'insertion : seule la fonction ci-dessous écrit.
revoke all on public.contact_messages from anon;

-- Réponse : 'ok', 'invalid' (champ manquant ou courriel mal formé) ou
-- 'rate_limited'. Pas d'exception : le formulaire affiche un message clair.
create or replace function public.send_contact_message(
  p_name text,
  p_email text,
  p_topic text,
  p_message text,
  p_organization text default null,
  p_locale text default null
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if coalesce(btrim(p_name), '') = ''
     or char_length(btrim(coalesce(p_message, ''))) < 10
     or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     or char_length(v_email) > 200
     or p_topic is null or p_topic not in ('center', 'member', 'question', 'press', 'other') then
    return 'invalid';
  end if;

  if (select count(*) from contact_messages
      where lower(email) = v_email and created_at > now() - interval '1 hour') >= 3
     or (select count(*) from contact_messages where created_at > now() - interval '1 hour') >= 60 then
    return 'rate_limited';
  end if;

  delete from contact_messages where created_at < now() - interval '12 months';

  insert into contact_messages (user_id, name, email, topic, organization, message, locale)
  values (auth.uid(), left(btrim(p_name), 120), v_email, p_topic,
          nullif(left(btrim(coalesce(p_organization, '')), 120), ''),
          left(btrim(p_message), 4000), left(p_locale, 10));
  return 'ok';
end $$;

revoke all on function public.send_contact_message(text, text, text, text, text, text) from public;
grant execute on function public.send_contact_message(text, text, text, text, text, text) to anon, authenticated;
