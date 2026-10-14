-- ═══════════════════════════════════════════════════════════════════
-- Fermer les tables app_* (repas, poids, séances, réglages…).
--
-- Elles ne servent pas à WODBUD (aucune référence dans le code) et
-- avaient une règle `for all … using (true)` ouverte à `anon` : n'importe
-- qui possédant la clé publique du site pouvait lire, modifier ou effacer
-- leur contenu. Aucune autre application connue ne les utilise.
--
-- Réversible et sans perte : les données restent, seul l'accès par l'API
-- est retiré (RLS active sans règle = aucune ligne accessible ; le rôle
-- service garde l'accès). Pour rouvrir : recréer une règle adaptée.
-- ═══════════════════════════════════════════════════════════════════

drop policy "app_custom_exercises_all" on public.app_custom_exercises;
drop policy "app_custom_foods_all" on public.app_custom_foods;
drop policy "app_custom_workouts_all" on public.app_custom_workouts;
drop policy "app_food_logs_all" on public.app_food_logs;
drop policy "app_hidden_exercises_all" on public.app_hidden_exercises;
drop policy "app_hidden_workouts_all" on public.app_hidden_workouts;
drop policy "app_sessions_all" on public.app_sessions;
drop policy "app_set_logs_all" on public.app_set_logs;
drop policy "app_settings_all" on public.app_settings;
drop policy "app_weight_logs_all" on public.app_weight_logs;

revoke all on
  public.app_custom_exercises, public.app_custom_foods, public.app_custom_workouts,
  public.app_food_logs, public.app_hidden_exercises, public.app_hidden_workouts,
  public.app_sessions, public.app_set_logs, public.app_settings, public.app_weight_logs
from anon, authenticated;
