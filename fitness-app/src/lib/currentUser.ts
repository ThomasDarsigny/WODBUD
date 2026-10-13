import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'

/**
 * Utilisateur connecté, lu dans la session locale.
 *
 * `supabase.auth.getUser()` interroge le serveur (/auth/v1/user) en tenant le
 * verrou d'authentification de supabase-js : une réponse lente bloque alors
 * toutes les autres requêtes de l'app. Côté client, l'utilisateur ne sert
 * qu'à filtrer ou afficher — la RLS revérifie le jeton à chaque requête.
 *
 * Même forme de retour que `getUser()`, pour le remplacer tel quel.
 */
export async function getLocalUser(): Promise<{ data: { user: User | null }; error: Error | null }> {
  const { data, error } = await supabase.auth.getSession()
  return { data: { user: data.session?.user ?? null }, error }
}
