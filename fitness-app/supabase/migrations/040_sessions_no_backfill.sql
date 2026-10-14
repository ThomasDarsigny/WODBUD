-- 040 — Plus de séances consignées après coup.
--
-- Le « journal rapide » laissait entrer une durée et une date au choix :
-- n'importe qui pouvait gonfler ses minutes et grimper aux classements.
-- L'écran est retiré ; ce déclencheur ferme aussi la porte côté API.
--
-- À l'insertion (hors admin et hors service_role) :
--   - la fin de séance est l'heure du serveur, pas celle envoyée ;
--   - le début doit dater de moins de 12 h ;
--   - les minutes ne peuvent pas dépasser le temps écoulé depuis le début
--     (5 min de marge pour l'horloge du téléphone).
-- À la modification : seules les notes changent, plus les durées ni les dates.

create or replace function public.wodbud_guard_session()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_elapsed numeric;
begin
  -- Service role, SQL direct et admins : pas de garde.
  if (select auth.uid()) is null or public.is_admin() then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.started_at is distinct from old.started_at
       or new.ended_at is distinct from old.ended_at
       or new.performed_at is distinct from old.performed_at
       or new.duration_minutes is distinct from old.duration_minutes
       or new.active_minutes is distinct from old.active_minutes
       or new.user_id is distinct from old.user_id then
      raise exception 'Une séance enregistrée ne peut plus être modifiée.'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if new.started_at is null then
    raise exception 'Une séance doit être chronométrée.'
      using errcode = 'check_violation';
  end if;

  new.ended_at := now();
  v_elapsed := extract(epoch from (new.ended_at - new.started_at)) / 60;

  if v_elapsed < -5 or v_elapsed > 12 * 60 then
    raise exception 'Séance trop ancienne : seul le chrono enregistre des minutes.'
      using errcode = 'check_violation';
  end if;

  if new.active_minutes > ceil(v_elapsed) + 5
     or coalesce(new.duration_minutes, 0) > ceil(v_elapsed) + 5 then
    raise exception 'Durée supérieure au temps écoulé.'
      using errcode = 'check_violation';
  end if;

  new.performed_at := new.started_at;
  return new;
end;
$$;

revoke execute on function public.wodbud_guard_session() from public, anon, authenticated;

drop trigger if exists wodbud_sessions_guard on public.workout_sessions;
create trigger wodbud_sessions_guard
  before insert or update on public.workout_sessions
  for each row execute function public.wodbud_guard_session();
