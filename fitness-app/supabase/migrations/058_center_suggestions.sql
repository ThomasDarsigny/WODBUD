-- 058 — Engagement (6.4, 6.5) : boîte à suggestions d'un centre. Un membre
-- écrit à son centre, en son nom ou anonymement ; le proprio et les
-- entraîneurs la lisent (6.5) et la marquent traitée.
--
-- Anonymat : l'auteur est gardé (anti-abus, et pour qu'il relise ses
-- messages), mais l'équipe ne lit la boîte qu'à travers
-- get_center_suggestions, qui masque le nom quand c'est demandé. Aucune
-- lecture directe de la table pour l'équipe.

create table public.center_suggestions (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  message text not null check (char_length(trim(message)) between 1 and 2000),
  anonymous boolean not null default false,
  status text not null default 'new' check (status in ('new', 'done')),
  created_at timestamptz not null default now(),
  handled_at timestamptz,
  handled_by uuid references public.profiles(id) on delete set null
);

create index center_suggestions_center_idx on public.center_suggestions (center_id, status, created_at desc);
create index center_suggestions_user_idx on public.center_suggestions (user_id, created_at desc);

alter table public.center_suggestions enable row level security;

-- Écrire à un centre dont on fait partie.
create policy "center_suggestions: écrire" on public.center_suggestions for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.center_role(center_id) is not null
    and status = 'new' and handled_at is null and handled_by is null
  );

-- Relire seulement ses propres messages.
create policy "center_suggestions: relire les siennes" on public.center_suggestions for select to authenticated
  using (user_id = (select auth.uid()));

-- Anti-abus : 5 suggestions par jour au plus et par personne.
create function public.wodbud_suggestion_rate_limit()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (select count(*) from public.center_suggestions
       where user_id = new.user_id and created_at > now() - interval '1 day') >= 5 then
    raise exception 'suggestion_rate_limited';
  end if;
  return new;
end;
$$;

create trigger center_suggestions_rate before insert on public.center_suggestions
  for each row execute function public.wodbud_suggestion_rate_limit();

-- Boîte de réception de l'équipe (proprio, chefs, entraîneurs).
create function public.get_center_suggestions(p_center uuid, p_status text default 'new')
returns table (id uuid, message text, anonymous boolean, author_name text, status text, created_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select s.id, s.message, s.anonymous,
         case when s.anonymous then null else p.full_name end,
         s.status, s.created_at
    from public.center_suggestions s
    left join public.profiles p on p.id = s.user_id
   where s.center_id = p_center
     and public.is_center_staff(p_center)
     and (p_status is null or s.status = p_status)
   order by s.created_at desc
   limit 200;
$$;

-- Marquer une suggestion traitée (ou la rouvrir).
create function public.set_center_suggestion_status(p_id uuid, p_status text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_center uuid;
begin
  if p_status not in ('new', 'done') then raise exception 'invalid_status'; end if;
  select center_id into v_center from public.center_suggestions where id = p_id;
  if v_center is null or not public.is_center_staff(v_center) then raise exception 'not_allowed'; end if;
  update public.center_suggestions
     set status = p_status,
         handled_at = case when p_status = 'done' then now() else null end,
         handled_by = case when p_status = 'done' then auth.uid() else null end
   where id = p_id;
end;
$$;

revoke execute on function public.get_center_suggestions(uuid, text) from public, anon;
revoke execute on function public.set_center_suggestion_status(uuid, text) from public, anon;
grant execute on function public.get_center_suggestions(uuid, text) to authenticated;
grant execute on function public.set_center_suggestion_status(uuid, text) to authenticated;
