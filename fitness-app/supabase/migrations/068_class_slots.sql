-- 068 — Horaire récurrent des cours (phase 3, unité 3.1). Jusqu'ici l'horaire
-- d'un cours était un texte libre (« Lun-Mer-Ven 6 h »). Un créneau dit
-- maintenant quel jour (1 = lundi … 7 = dimanche, comme ISO), à quelle heure
-- (heure locale de la salle) et combien de temps.
--
-- Lecture : le coach du cours, ses membres, les responsables du centre
-- (et l'admin). Écriture : le coach du cours et les responsables du centre,
-- qui font l'horaire de la salle. Au plus 28 créneaux par cours.

create table public.class_slots (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  start_time time not null,
  duration_minutes smallint not null default 60 check (duration_minutes between 15 and 240),
  created_at timestamptz not null default now(),
  unique (class_id, weekday, start_time)
);

alter table public.class_slots enable row level security;

create policy "class_slots: lire" on public.class_slots for select to authenticated
  using (public.is_class_coach(class_id) or public.is_class_member(class_id) or public.is_class_lead(class_id) or (select public.is_admin()));
create policy "class_slots: créer" on public.class_slots for insert to authenticated
  with check (public.is_class_coach(class_id) or public.is_class_lead(class_id));
create policy "class_slots: modifier" on public.class_slots for update to authenticated
  using (public.is_class_coach(class_id) or public.is_class_lead(class_id))
  with check (public.is_class_coach(class_id) or public.is_class_lead(class_id));
create policy "class_slots: supprimer" on public.class_slots for delete to authenticated
  using (public.is_class_coach(class_id) or public.is_class_lead(class_id));

revoke all on public.class_slots from anon, public;
grant select, insert, update, delete on public.class_slots to authenticated;

-- Garde-fou : un horaire raisonnable, pas un tableau sans fin.
create function public.wodbud_class_slots_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.class_slots where class_id = new.class_id) >= 28 then
    raise exception 'class_slots_limit' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
revoke execute on function public.wodbud_class_slots_limit() from public, anon, authenticated;

create trigger class_slots_limit before insert on public.class_slots
  for each row execute function public.wodbud_class_slots_limit();
