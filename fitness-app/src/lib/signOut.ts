import { supabase } from './supabase'
import { clearAuthSessionCookies } from './authSessionCookies'
import { clearRoleCache } from './profileRole'
import { clearWorkoutDraft } from '../stores/workoutStore'

/**
 * Déconnexion : brouillon de WOD, rôle en cache et témoins de session effacés,
 * pour que rien du compte ne suive le suivant. L'appelant redirige ensuite.
 * Utilisée par les réglages et par l'administration.
 */
export async function signOut(): Promise<void> {
  clearWorkoutDraft()
  clearRoleCache()
  try { await supabase.auth.signOut() } catch { /* session déjà expirée */ }
  try { await clearAuthSessionCookies() } catch { /* ignore */ }
}
