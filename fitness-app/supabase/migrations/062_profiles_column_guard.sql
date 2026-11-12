-- 062 — Chacun ne modifie que ses propres champs « utilisateur » sur profiles.
--
-- La politique « profiles: modifier » laisse un compte modifier sa ligne, et
-- `authenticated` avait le droit UPDATE sur toute la table : par l'API REST,
-- on pouvait donc réécrire ses minutes, ses séries (qui décident du rang et
-- des badges) ou son segment. On remplace ce droit par une liste de colonnes.
--
-- Colonnes que l'app écrit elle-même (et seulement celles-là) :
--   full_name, avatar_url, language, theme_pref, social_links  — Réglages
--   equipment                                                  — Réglages, Bienvenue
--   ai_avatar, ai_tone                                         — assistant IA (061)
--   role, onboarding, onboarded_at                             — Bienvenue (saveMyRole)
--   badges_seen_at, rank_seen_key                              — « vu » des badges et du rang
--
-- `role` reste modifiable : il ne sert qu'à choisir l'espace d'arrivée
-- (center, member, perso, bornés par profiles_role_check) ; les droits d'un
-- centre viennent de center_members, jamais de profiles.role.
--
-- Restent hors d'atteinte : id, created_at, total_minutes, current_streak,
-- longest_streak (trigger wodbud_recalc_profile_totals) et segment.
-- Les fonctions security definer (totaux, création ou invitation d'un centre,
-- handle_new_user) appartiennent à postgres et ne sont pas touchées ; le
-- service role non plus.
--
-- Toute nouvelle colonne que l'utilisateur doit pouvoir modifier devra être
-- ajoutée par un `grant insert (colonne), update (colonne)` dans sa migration.

revoke insert, update on public.profiles from anon, authenticated;

-- La ligne est créée par handle_new_user ; la politique « créer le sien »
-- reste, mais un profil recréé par l'API part des valeurs par défaut.
grant insert (
  id,
  full_name,
  avatar_url,
  language,
  theme_pref,
  social_links,
  equipment,
  ai_avatar,
  ai_tone,
  role,
  onboarding,
  onboarded_at,
  badges_seen_at,
  rank_seen_key
) on public.profiles to authenticated;

grant update (
  full_name,
  avatar_url,
  language,
  theme_pref,
  social_links,
  equipment,
  ai_avatar,
  ai_tone,
  role,
  onboarding,
  onboarded_at,
  badges_seen_at,
  rank_seen_key
) on public.profiles to authenticated;
