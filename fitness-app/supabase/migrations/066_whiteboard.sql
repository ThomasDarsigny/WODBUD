-- 066 — Le tableau blanc (phase 1, unité 1.4) : pour une séance programmée
-- dans mon cours, les scores de tous ceux qui l'ont faite, et un « bravo ».
--
-- Lecture : une fonction dédiée plutôt qu'une règle large sur workout_scores.
-- Elle ne rend que les scores attachés à ce plan de cours (la séance doit
-- être la copie reçue du plan), au coach du cours et à ses membres.
-- Les scores restent privés partout ailleurs.
--
-- Réactions : une table minuscule, un emoji par personne et par score.

create table public.score_reactions (
  score_id uuid not null references public.workout_scores(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  emoji text not null check (emoji in ('👏', '🔥', '💪')),
  created_at timestamptz not null default now(),
  primary key (score_id, user_id)
);
create index score_reactions_user_idx on public.score_reactions (user_id);
alter table public.score_reactions enable row level security;

-- Je peux réagir aux scores que le tableau blanc me montre (même cours).
create function public.can_see_score(p_score uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.workout_scores sc
      join public.scheduled_workouts sw on sw.session_id = sc.session_id
      join public.class_plans cp on cp.id = sw.class_plan_id
     where sc.id = p_score
       and (public.is_class_member(cp.class_id) or public.is_class_coach(cp.class_id) or public.is_class_lead(cp.class_id))
  );
$$;
revoke execute on function public.can_see_score(uuid) from public, anon;
grant execute on function public.can_see_score(uuid) to authenticated;

create policy "score_reactions: lire" on public.score_reactions for select to authenticated
  using (public.can_see_score(score_id));
create policy "score_reactions: réagir" on public.score_reactions for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_see_score(score_id));
create policy "score_reactions: retirer" on public.score_reactions for delete to authenticated
  using (user_id = (select auth.uid()));

-- Le tableau blanc d'un plan de cours : qui l'a fait, son score, ses bravos.
create function public.get_whiteboard(p_plan uuid)
returns table (
  score_id uuid, athlete_id uuid, full_name text, avatar_url text,
  score_type text, seconds integer, rounds integer, reps integer, load_kg numeric, capped boolean, rx text,
  note text, performed_at timestamptz,
  reactions integer, my_reaction text
)
language sql stable security definer set search_path = public as $$
  select sc.id, sc.user_id, p.full_name, p.avatar_url,
         sc.score_type, sc.seconds, sc.rounds, sc.reps, sc.load_kg, sc.capped, sc.rx,
         sc.note, ws.performed_at,
         (select count(*) from public.score_reactions r where r.score_id = sc.id)::integer,
         (select r.emoji from public.score_reactions r where r.score_id = sc.id and r.user_id = auth.uid())
    from public.class_plans cp
    join public.scheduled_workouts sw on sw.class_plan_id = cp.id and sw.session_id is not null
    join public.workout_sessions ws on ws.id = sw.session_id
    join public.workout_scores sc on sc.session_id = ws.id
    join public.profiles p on p.id = sc.user_id
   where cp.id = p_plan
     and (public.is_class_member(cp.class_id) or public.is_class_coach(cp.class_id) or public.is_class_lead(cp.class_id))
   order by
     -- RX avant adapté ; puis le meilleur score selon le type.
     (sc.rx = 'rx') desc,
     case when sc.score_type = 'time' then (case when sc.capped then 1 else 0 end) end,
     case when sc.score_type = 'time' and not sc.capped then sc.seconds end asc,
     case when sc.score_type = 'time' and sc.capped then -sc.reps end asc,
     case when sc.score_type = 'rounds_reps' then -(sc.rounds * 100000 + sc.reps) end asc,
     case when sc.score_type = 'reps' then -sc.reps end asc,
     case when sc.score_type = 'load' then -sc.load_kg end asc,
     ws.performed_at;
$$;
revoke execute on function public.get_whiteboard(uuid) from public, anon;
grant execute on function public.get_whiteboard(uuid) to authenticated;

-- Retour arrière : drop function public.get_whiteboard(uuid); drop table public.score_reactions; drop function public.can_see_score(uuid);
