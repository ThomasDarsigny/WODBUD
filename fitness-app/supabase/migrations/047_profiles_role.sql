-- 047 — Rôle choisi à l'inscription : coach ou athlète.
--
-- Après la création du compte, l'écran « Bienvenue » demande comment la
-- personne utilise WODBUD ; la réponse décide de l'espace où elle arrive.
-- `onboarding` garde les réponses complémentaires (type de lieu, taille du
-- groupe, objectif…) pour adapter l'app plus tard ; rien n'en dépend encore.

alter table public.profiles
  add column if not exists role text check (role is null or role in ('coach', 'athlete')),
  add column if not exists onboarding jsonb not null default '{}'::jsonb,
  add column if not exists onboarded_at timestamptz;

-- Comptes existants : on déduit le rôle de ce qu'ils font déjà, pour ne pas
-- leur reposer la question. Les autres répondront une fois.
update public.profiles p
   set role = 'coach', onboarded_at = now()
 where p.role is null
   and (exists (select 1 from public.classes c where c.coach_id = p.id)
        or exists (select 1 from public.workouts w where w.created_by = p.id)
        or exists (select 1 from public.admin_users a where a.user_id = p.id));

update public.profiles p
   set role = 'athlete', onboarded_at = now()
 where p.role is null
   and exists (select 1 from public.class_members cm where cm.athlete_id = p.id);
