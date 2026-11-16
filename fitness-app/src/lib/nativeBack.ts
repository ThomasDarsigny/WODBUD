/**
 * Bouton (ou geste) retour d'Android dans l'app des boutiques.
 *
 * - Une fenêtre ouverte (useBackToClose) se ferme d'abord : elle a poussé
 *   une entrée d'historique, revenir en arrière la referme.
 * - Sur un écran d'accueil, l'app passe en arrière-plan, comme les apps
 *   d'Android : on ne revient pas à l'écran de connexion déjà franchi, et
 *   rouvrir l'app retrouve l'écran laissé.
 * - Ailleurs, on revient à l'écran précédent ; sans écran précédent (app
 *   ouverte par un lien), on passe aussi en arrière-plan.
 */
export type BackAction = 'back' | 'minimize'

const HOME_PATHS = new Set([
  '/',
  '/login',
  '/entraineur_dashboard',
  '/bienvenue',
  '/dashboard',
  '/dashboard/today',
  '/dashboard/admin',
  '/athlete'
])

export function backAction({ path, overlay, canGoBack }: { path: string; overlay: boolean; canGoBack: boolean }): BackAction {
  if (overlay) return 'back'
  const normalized = path.length > 1 ? path.replace(/\/+$/, '') : path
  if (HOME_PATHS.has(normalized)) return 'minimize'
  return canGoBack ? 'back' : 'minimize'
}
