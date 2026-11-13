-- 069 — Présences (phase 3, unité 3.2). Une présence = un membre, un cours,
-- un jour (au plus une par jour). Elle dit comment elle a été prise :
--   qr     le membre a scanné le QR affiché par le coach à la salle
--   self   le membre a touché « Je suis là » autour de l'heure du cours
--   coach  le coach l'a cochée lui-même
--
-- Les membres ne s'inscrivent que par check_in(), qui vérifie l'adhésion au
-- cours, la date (aujourd'hui, à un jour près pour les fuseaux) et soit le
-- code du QR encore valide, soit un créneau d'horaire ce jour-là.
-- Le code du QR n'est lisible par personne : open_checkin() le crée ou le
-- rend au coach (ou aux responsables du centre), valable 3 heures.

create table public.class_attendance (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_date date not null,
  method text not null check (method in ('qr', 'self', 'coach')),
  checked_in_at timestamptz not null default now(),
  unique (class_id, user_id, session_date)
);
create index class_attendance_class_date_idx on public.class_attendance (class_id, session_date desc);
create index class_attendance_user_idx on public.class_attendance (user_id, session_date desc);

alter table public.class_attendance enable row level security;

create policy "class_attendance: lire" on public.class_attendance for select to authenticated
  using (user_id = (select auth.uid()) or public.is_class_coach(class_id) or public.is_class_lead(class_id));
-- Le coach coche un membre du cours ; les membres passent par check_in().
create policy "class_attendance: cocher" on public.class_attendance for insert to authenticated
  with check (
    (public.is_class_coach(class_id) or public.is_class_lead(class_id))
    and method = 'coach'
    and exists (select 1 from public.class_members cm where cm.class_id = class_attendance.class_id and cm.athlete_id = class_attendance.user_id)
  );
-- Le coach retire une présence ; un membre peut annuler la sienne le jour même (erreur de toucher).
create policy "class_attendance: retirer" on public.class_attendance for delete to authenticated
  using (public.is_class_coach(class_id) or public.is_class_lead(class_id) or (user_id = (select auth.uid()) and session_date >= current_date - 1));

revoke all on public.class_attendance from anon, public;
grant select, insert, delete on public.class_attendance to authenticated;

-- Codes de QR : aucune règle d'accès, donc illisibles hors des fonctions.
create table public.class_checkin_codes (
  class_id uuid primary key references public.classes(id) on delete cascade,
  code text not null check (char_length(code) between 16 and 64),
  expires_at timestamptz not null
);
alter table public.class_checkin_codes enable row level security;
revoke all on public.class_checkin_codes from anon, public, authenticated;

-- Le coach affiche le QR : le code en cours s'il vaut encore 30 minutes, sinon un neuf.
create function public.open_checkin(p_class uuid)
returns table (code text, expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_class_coach(p_class) or public.is_class_lead(p_class)) then
    raise exception 'not_allowed' using errcode = 'insufficient_privilege';
  end if;
  return query
    select c.code, c.expires_at from public.class_checkin_codes c
     where c.class_id = p_class and c.expires_at > now() + interval '30 minutes';
  if found then return; end if;
  return query
    insert into public.class_checkin_codes as c (class_id, code, expires_at)
    values (p_class, replace(gen_random_uuid()::text, '-', ''), now() + interval '3 hours')
    on conflict (class_id) do update set code = excluded.code, expires_at = excluded.expires_at
    returning c.code, c.expires_at;
end;
$$;
revoke execute on function public.open_checkin(uuid) from public, anon;
grant execute on function public.open_checkin(uuid) to authenticated;

-- Le membre s'enregistre. Réponses : ok, already, not_member, bad_date, bad_code, no_class.
create function public.check_in(p_class uuid, p_date date, p_code text default null)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_method text;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = 'insufficient_privilege'; end if;
  if not exists (select 1 from public.class_members where class_id = p_class and athlete_id = v_uid) then return 'not_member'; end if;
  if p_date is null or p_date < current_date - 1 or p_date > current_date + 1 then return 'bad_date'; end if;
  if p_code is not null then
    if not exists (select 1 from public.class_checkin_codes c where c.class_id = p_class and c.code = p_code and c.expires_at > now()) then
      return 'bad_code';
    end if;
    v_method := 'qr';
  else
    if not exists (select 1 from public.class_slots s where s.class_id = p_class and s.weekday = extract(isodow from p_date)) then
      return 'no_class';
    end if;
    v_method := 'self';
  end if;
  insert into public.class_attendance (class_id, user_id, session_date, method)
  values (p_class, v_uid, p_date, v_method)
  on conflict (class_id, user_id, session_date) do nothing;
  if found then return 'ok'; end if;
  -- Déjà là : un scan du QR confirme une présence déclarée soi-même.
  if v_method = 'qr' then
    update public.class_attendance set method = 'qr'
     where class_id = p_class and user_id = v_uid and session_date = p_date and method = 'self';
  end if;
  return 'already';
end;
$$;
revoke execute on function public.check_in(uuid, date, text) from public, anon;
grant execute on function public.check_in(uuid, date, text) to authenticated;
