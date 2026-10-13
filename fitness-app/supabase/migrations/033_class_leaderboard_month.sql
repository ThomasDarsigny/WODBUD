-- ═══════════════════════════════════════════════════════════════════
-- Classement du mois : la borne de get_class_leaderboard_since passe de
-- 8 à 32 jours, pour accepter le 1er du mois (31 jours + marge de fuseau).
-- Même logique que 032 : seule une somme par membre sort, les séances
-- restent privées, appelant non autorisé ou date hors borne → vide.
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.get_class_leaderboard_since(p_class_id uuid, p_since timestamptz)
 returns table(
   athlete_id uuid,
   full_name text,
   minutes integer,
   current_streak integer,
   longest_streak integer
 )
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select cm.athlete_id,
         p.full_name,
         coalesce((
           select sum(ws.active_minutes)
           from public.workout_sessions ws
           where ws.user_id = cm.athlete_id
             and ws.performed_at >= p_since
         ), 0)::integer,
         coalesce(p.current_streak, 0)::integer,
         coalesce(p.longest_streak, 0)::integer
  from public.class_members cm
  join public.profiles p on p.id = cm.athlete_id
  where cm.class_id = p_class_id
    and p_since >= now() - interval '32 days'
    and (public.is_class_member(p_class_id) or public.is_class_coach(p_class_id) or public.is_admin());
$function$;
