-- 057 — Engagement (6.3) : tout le monde peut écrire au support WODBUD depuis
-- les réglages. L'équipe WODBUD (admin) lit les messages, voit le courriel
-- pour répondre, et les marque traités.

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('bug', 'question', 'idea', 'other')),
  message text not null check (char_length(trim(message)) between 1 and 4000),
  -- Contexte utile pour reproduire : page, langue, plateforme. Rien d'autre.
  context jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new', 'done')),
  created_at timestamptz not null default now(),
  handled_at timestamptz,
  handled_by uuid references public.profiles(id) on delete set null
);

create index support_messages_status_idx on public.support_messages (status, created_at desc);
create index support_messages_user_idx on public.support_messages (user_id, created_at desc);

alter table public.support_messages enable row level security;

create policy "support_messages: écrire" on public.support_messages for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'new' and handled_at is null and handled_by is null);

create policy "support_messages: lire" on public.support_messages for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "support_messages: traiter" on public.support_messages for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Anti-abus : 10 messages par jour au plus et par personne.
create function public.wodbud_support_rate_limit()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (select count(*) from public.support_messages
       where user_id = new.user_id and created_at > now() - interval '1 day') >= 10 then
    raise exception 'support_rate_limited';
  end if;
  return new;
end;
$$;

create trigger support_messages_rate before insert on public.support_messages
  for each row execute function public.wodbud_support_rate_limit();

-- Boîte de réception WODBUD : messages avec le nom et le courriel de l'auteur
-- (pour répondre). Réservée aux admins.
create function public.get_support_inbox(p_status text default 'new')
returns table (
  id uuid, kind text, message text, context jsonb, status text, created_at timestamptz,
  author_name text, author_email text
)
language sql stable security definer set search_path = public, auth
as $$
  select m.id, m.kind, m.message, m.context, m.status, m.created_at, p.full_name, u.email::text
    from public.support_messages m
    left join public.profiles p on p.id = m.user_id
    left join auth.users u on u.id = m.user_id
   where public.is_admin()
     and (p_status is null or m.status = p_status)
   order by m.created_at desc
   limit 200;
$$;

revoke execute on function public.get_support_inbox(text) from public, anon;
grant execute on function public.get_support_inbox(text) to authenticated;
