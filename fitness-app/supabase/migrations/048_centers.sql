-- 048 — Centres : le côté business.
--
-- Un centre (box, salle, coach indépendant) a une équipe et des membres :
--   owner       proprio-chef : tous les droits (gestion et programmation) ;
--   head_coach  entraîneur chef : programme, crée les exercices, gère l'équipement ;
--   coach       entraîneur : donne les cours, suit ses membres ;
--   member      membre du centre.
-- On n'entre dans un centre que par invitation (lien) : les entraîneurs ne
-- s'inscrivent pas seuls, leur centre les invite avec leur rôle.
--
-- `profiles.role` devient le profil choisi à l'inscription — centre, membre
-- ou perso — et ne décide que de l'espace d'arrivée. Les droits viennent de
-- `center_members`, jamais de `profiles.role` (que chacun peut modifier).
--
-- L'équipement est demandé à tous : celui du centre (inventaire) vaut pour
-- ses membres ; un compte perso déclare ce qu'il a à la maison.

-- ─── Tables ─────────────────────────────────────────────────────────

create table public.centers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  equipment text[] not null default '{}',
  venue text check (venue is null or venue in ('box', 'gym', 'independent', 'online')),
  group_size text check (group_size is null or group_size in ('1-10', '11-30', '31-100', '100+')),
  created_at timestamptz not null default now()
);

create table public.center_members (
  center_id uuid not null references public.centers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'head_coach', 'coach', 'member')),
  joined_at timestamptz not null default now(),
  primary key (center_id, user_id)
);

create index center_members_user_idx on public.center_members(user_id);

-- Liens d'invitation. Celui des membres est permanent (sans échéance ni
-- limite) ; ceux de l'équipe servent une fois et expirent après 7 jours.
create table public.center_invites (
  token text primary key default encode(extensions.gen_random_bytes(12), 'hex'),
  center_id uuid not null references public.centers(id) on delete cascade,
  role text not null check (role in ('head_coach', 'coach', 'member')),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  max_uses integer check (max_uses is null or max_uses > 0),
  uses integer not null default 0,
  revoked_at timestamptz
);

create index center_invites_center_idx on public.center_invites(center_id);

alter table public.classes
  add column center_id uuid references public.centers(id) on delete set null;

alter table public.profiles
  add column equipment text[] not null default '{}';

-- ─── Aides (security definer : lisent center_members sans boucler sur RLS) ──

create function public.center_role(p_center uuid)
returns text
language sql stable security definer set search_path = public
as $$
  select role from public.center_members
   where center_id = p_center and user_id = auth.uid();
$$;

create function public.is_center_staff(p_center uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.center_role(p_center) in ('owner', 'head_coach', 'coach'), false);
$$;

create function public.is_center_lead(p_center uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.center_role(p_center) in ('owner', 'head_coach'), false);
$$;

-- ─── Accès ──────────────────────────────────────────────────────────

alter table public.centers enable row level security;
alter table public.center_members enable row level security;
alter table public.center_invites enable row level security;

-- Création par create_center() seulement : pas de politique d'insertion.
create policy "centers: lire" on public.centers
  for select using (public.center_role(id) is not null or (select public.is_admin()));

create policy "centers: modifier" on public.centers
  for update using (public.is_center_lead(id)) with check (public.is_center_lead(id));

create policy "centers: supprimer" on public.centers
  for delete using (owner_id = (select auth.uid()));

-- Les membres voient l'équipe et eux-mêmes, pas les autres membres ;
-- l'équipe voit tout le monde.
create policy "center_members: lire" on public.center_members
  for select using (
    user_id = (select auth.uid())
    or public.is_center_staff(center_id)
    or (role <> 'member' and public.center_role(center_id) is not null)
    or (select public.is_admin())
  );

-- Seul le proprio change un rôle, jamais celui du proprio ni vers proprio.
revoke update on public.center_members from anon, authenticated;
grant update (role) on public.center_members to authenticated;

create policy "center_members: changer un rôle" on public.center_members
  for update using (public.center_role(center_id) = 'owner' and role <> 'owner')
  with check (role in ('head_coach', 'coach', 'member'));

-- On quitte soi-même, ou le proprio retire quelqu'un. Le proprio ne part pas.
create policy "center_members: quitter ou retirer" on public.center_members
  for delete using (
    role <> 'owner'
    and (user_id = (select auth.uid()) or public.center_role(center_id) = 'owner')
  );

-- L'équipe partage le lien des membres ; le chef invite des entraîneurs ;
-- seul le proprio invite un entraîneur chef.
create policy "center_invites: lire" on public.center_invites
  for select using (
    public.is_center_lead(center_id)
    or (role = 'member' and public.is_center_staff(center_id))
  );

create policy "center_invites: créer" on public.center_invites
  for insert with check (
    created_by = (select auth.uid())
    and (
      (role = 'member' and public.is_center_staff(center_id))
      or (role = 'coach' and public.is_center_lead(center_id))
      or (role = 'head_coach' and public.center_role(center_id) = 'owner')
    )
  );

revoke update on public.center_invites from anon, authenticated;
grant update (revoked_at) on public.center_invites to authenticated;

create policy "center_invites: révoquer" on public.center_invites
  for update using (public.is_center_lead(center_id)) with check (public.is_center_lead(center_id));

-- ─── Créer un centre ────────────────────────────────────────────────

create function public.create_center(
  p_name text,
  p_equipment text[] default '{}',
  p_venue text default null,
  p_group_size text default null
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_center uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  insert into public.centers (name, owner_id, equipment, venue, group_size)
  values (btrim(p_name), v_uid, coalesce(p_equipment, '{}'), p_venue, p_group_size)
  returning id into v_center;

  insert into public.center_members (center_id, user_id, role)
  values (v_center, v_uid, 'owner');

  insert into public.center_invites (center_id, role, created_by)
  values (v_center, 'member', v_uid);

  -- Un coach qui avait déjà des cours les retrouve dans son centre, avec
  -- leurs membres.
  update public.classes set center_id = v_center
   where coach_id = v_uid and center_id is null;

  insert into public.center_members (center_id, user_id, role)
  select distinct v_center, cm.athlete_id, 'member'
    from public.class_members cm
    join public.classes c on c.id = cm.class_id
   where c.center_id = v_center and cm.athlete_id <> v_uid
  on conflict do nothing;

  update public.profiles
     set role = 'center', onboarded_at = coalesce(onboarded_at, now())
   where id = v_uid;

  return v_center;
end;
$$;

-- ─── Invitations ────────────────────────────────────────────────────

-- Aperçu d'un lien, même déconnecté : nom du centre et rôle proposé.
create function public.get_center_invite(p_token text)
returns table (center_name text, role text, valid boolean)
language sql stable security definer set search_path = public
as $$
  select c.name, i.role,
         i.revoked_at is null
         and (i.expires_at is null or i.expires_at > now())
         and (i.max_uses is null or i.uses < i.max_uses)
    from public.center_invites i
    join public.centers c on c.id = i.center_id
   where i.token = p_token;
$$;

grant execute on function public.get_center_invite(text) to anon, authenticated;

create function public.accept_center_invite(p_token text)
returns table (center_id uuid, role text)
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_inv public.center_invites%rowtype;
  v_current text;
  v_rank constant jsonb := '{"member": 0, "coach": 1, "head_coach": 2, "owner": 3}';
  v_role text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_inv from public.center_invites where token = p_token for update;
  if not found
     or v_inv.revoked_at is not null
     or (v_inv.expires_at is not null and v_inv.expires_at <= now())
     or (v_inv.max_uses is not null and v_inv.uses >= v_inv.max_uses) then
    raise exception 'invalid_invite';
  end if;

  select m.role into v_current
    from public.center_members m
   where m.center_id = v_inv.center_id and m.user_id = v_uid;

  -- On ne rétrograde jamais : un entraîneur qui rouvre le lien des membres
  -- reste entraîneur.
  if v_current is null then
    insert into public.center_members (center_id, user_id, role)
    values (v_inv.center_id, v_uid, v_inv.role);
    v_role := v_inv.role;
  elsif (v_rank ->> v_inv.role)::int > (v_rank ->> v_current)::int then
    update public.center_members m set role = v_inv.role
     where m.center_id = v_inv.center_id and m.user_id = v_uid;
    v_role := v_inv.role;
  else
    v_role := v_current;
  end if;

  update public.center_invites set uses = uses + 1 where token = p_token;

  -- Profil d'arrivée : l'équipe va côté centre ; un membre sans profil, ou
  -- perso, devient membre. Un proprio reste proprio.
  update public.profiles p
     set role = case
                  when v_role in ('owner', 'head_coach', 'coach') then 'center'
                  when p.role is null or p.role = 'perso' then 'member'
                  else p.role
                end,
         onboarded_at = coalesce(p.onboarded_at, now())
   where p.id = v_uid;

  return query select v_inv.center_id, v_role;
end;
$$;

-- Équipe et membres d'un centre, avec les noms (la lecture des profils est
-- fermée hors des cours) : réservé à l'équipe du centre.
create function public.get_center_team(p_center uuid)
returns table (user_id uuid, full_name text, avatar_url text, role text, joined_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select m.user_id, p.full_name, p.avatar_url, m.role, m.joined_at
    from public.center_members m
    join public.profiles p on p.id = m.user_id
   where m.center_id = p_center
     and public.is_center_staff(p_center)
   order by case m.role when 'owner' then 0 when 'head_coach' then 1 when 'coach' then 2 else 3 end,
            p.full_name;
$$;

-- ─── Cours rattachés au centre ──────────────────────────────────────

-- Un cours créé par quelqu'un de l'équipe appartient à son centre.
create function public.wodbud_class_center()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.center_id is null then
    select m.center_id into new.center_id
      from public.center_members m
     where m.user_id = new.coach_id and m.role <> 'member'
     order by m.joined_at
     limit 1;
  end if;
  return new;
end;
$$;

create trigger classes_center before insert on public.classes
  for each row execute function public.wodbud_class_center();

-- Rejoindre un cours d'un centre, c'est aussi devenir membre du centre.
create function public.wodbud_class_member_center()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.center_members (center_id, user_id, role)
  select c.center_id, new.athlete_id, 'member'
    from public.classes c
   where c.id = new.class_id and c.center_id is not null
  on conflict do nothing;
  return new;
end;
$$;

create trigger class_members_center after insert on public.class_members
  for each row execute function public.wodbud_class_member_center();

-- ─── Comptes existants ──────────────────────────────────────────────

-- Tout le monde repasse par l'écran Bienvenue (décision du client) : les
-- anciens profils coach / athlète ne correspondent plus aux nouveaux. Les
-- réponses d'accueil précédentes sont gardées dans `onboarding`.
alter table public.profiles drop constraint profiles_role_check;

update public.profiles set role = null, onboarded_at = null where role is not null;

alter table public.profiles
  add constraint profiles_role_check check (role is null or role in ('center', 'member', 'perso'));
