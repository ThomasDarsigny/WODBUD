/**
 * Erreur de réseau (pas de connexion, serveur injoignable) plutôt qu'un refus
 * du serveur. supabase-js ne lance pas : il renvoie `{ error }` avec un
 * message du genre « TypeError: Failed to fetch ».
 */
export function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true
  const message = typeof err === 'object' && err && 'message' in err ? String((err as { message: unknown }).message) : String(err)
  return /failed to fetch|networkerror|load failed|network request failed|fetch failed/i.test(message)
}
