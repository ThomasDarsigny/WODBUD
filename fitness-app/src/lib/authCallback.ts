/**
 * Retour de connexion (A2) : Google ou Apple, et lien de confirmation du
 * courriel, reviennent sur la page /auth/callback avec un code à échanger
 * contre une session (PKCE).
 *
 * Dans l'app des boutiques, Google et Apple s'ouvrent dans Chrome (onglet
 * personnalisé) : ils refusent une page intégrée. Ils reviennent par
 * com.wodbud.app://auth/callback, une adresse que seule l'app ouvre ; le
 * code n'y sert à rien sans le secret (code verifier) gardé par l'app qui a
 * commencé la connexion. Le lien du courriel revient, lui, par
 * https://<site>/auth/callback, ouvert dans l'app par les App Links (A3).
 */

export const AUTH_CALLBACK_PATH = '/auth/callback'
/** Adresse de retour de Google et d'Apple dans l'app (à autoriser dans Supabase Auth). */
export const OAUTH_REDIRECT_URL = 'com.wodbud.app://auth/callback'

/**
 * Page de l'app pour un retour com.wodbud.app://auth/callback, marquée
 * `flow=oauth` ; null pour toute autre adresse.
 */
export function authCallbackPath(url: string): string | null {
  // Lu sans `new URL` : avant Chrome 130, les WebView d'Android lisent une
  // adresse à schéma propre autrement (hôte vide, chemin « //auth/callback »).
  const match = /^com\.wodbud\.app:\/\/auth\/callback\/?(\?[^#]*)?(#.*)?$/i.exec(url.trim())
  if (!match) return null
  const params = new URLSearchParams((match[1] ?? '').slice(1))
  // Erreurs du fournisseur : dans la requête (PKCE) ou, plus rarement, l'ancre.
  for (const [k, v] of new URLSearchParams((match[2] ?? '').slice(1))) if (!params.has(k)) params.set(k, v)
  params.set('flow', 'oauth')
  return `${AUTH_CALLBACK_PATH}?${params.toString()}`
}
