-- ═══════════════════════════════════════════════════════════════════
-- Classement de la semaine d'un cours.
--
-- Les séances restent privées (workout_sessions : owner_or_admin). Cette
-- fonction ne renvoie qu'une somme de minutes par membre, jamais les séances.
--
-- Le début de semaine (lundi 0 h) est fourni par le client : seul lui connaît
-- le fuseau de l'utilisateur. Il est borné à 8 jours en arrière : la fonction
-- sert au classement hebdomadaire, pas à interroger l'historique d'un
-- coéquipier sur une période arbitraire.
--
-- Appelant non autorisé ou date hors borne : résultat vide, pas d'erreur.
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
    and p_since >= now() - interval '8 days'
    and (public.is_class_member(p_class_id) or public.is_class_coach(p_class_id) or public.is_admin());
$function$;

revoke execute on function public.get_class_leaderboard_since(uuid, timestamptz) from public, anon;
grant execute on function public.get_class_leaderboard_since(uuid, timestamptz) to authenticated;
