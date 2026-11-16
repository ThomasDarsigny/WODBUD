import { supabase } from './supabase'
import { clearAuthSessionCookies } from './authSessionCookies'
import { clearRoleCache } from './profileRole'
import { clearWorkoutDraft } from '../stores/workoutStore'
import { isNativeApp } from './platform'

/**
 * Déconnexion : brouillon de WOD, rôle en cache et témoins de session effacés,
 * pour que rien du compte ne suive le suivant. L'appelant redirige ensuite.
 * Utilisée par les réglages et par l'administration.
 */
export async function signOut(): Promise<void> {
  clearWorkoutDraft()
  clearRoleCache()
  // App des boutiques : ce téléphone cesse de recevoir les notifications du
  // compte, tant que la session permet encore d'effacer son jeton (A4).
  if (isNativeApp()) {
    try { await (await import('./nativePush')).forgetDevice() } catch { /* hors ligne : la fonction push le retirera */ }
  }
  try { await supabase.auth.signOut() } catch { /* session déjà expirée */ }
  try { await clearAuthSessionCookies() } catch { /* ignore */ }
}
