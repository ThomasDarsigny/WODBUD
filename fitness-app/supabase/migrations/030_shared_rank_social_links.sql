-- ═══════════════════════════════════════════════════════════════════
-- La page de rang partagée peut maintenant afficher les réseaux sociaux et
-- la photo de profil — la raison d'être des réseaux sociaux ("partager ses
-- accomplissements") était sans effet tant que la seule page publique de
-- l'app ne les affichait pas.
--
-- Changement de signature (colonnes en plus) : DROP + CREATE, pas
-- CREATE OR REPLACE, que Postgres refuse quand le type de retour change.
-- ═══════════════════════════════════════════════════════════════════

drop function if exists public.get_shared_rank(text);

create function public.get_shared_rank(p_token text)
 returns table(
   display_name text,
   rank_key text,
   total_minutes integer,
   current_streak integer,
   avatar_url text,
   social_links jsonb
 )
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select coalesce(p.full_name, 'Athlète WODBUD'),
         public.wodbud_rank_for_minutes(p.total_minutes),
         p.total_minutes,
         p.current_streak,
         p.avatar_url,
         p.social_links
  from public.rank_shares rs
  join public.profiles p on p.id = rs.user_id
  where rs.token = p_token and rs.revoked_at is null;
$function$;
