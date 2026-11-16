import { Browser } from '@capacitor/browser'
import { supabase } from './supabase'
import { OAUTH_REDIRECT_URL } from './authCallback'

/**
 * Connexion Google ou Apple dans l'app des boutiques (A2) : la page du
 * fournisseur s'ouvre dans Chrome (onglet personnalisé), puis revient par
 * com.wodbud.app://auth/callback (authCallback.ts, nativeShell.ts).
 * Chargé seulement dans l'app.
 */
export async function nativeOAuth(provider: 'google' | 'apple'): Promise<void> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: OAUTH_REDIRECT_URL, skipBrowserRedirect: true }
  })
  if (error) throw error
  if (!data.url) throw new Error('oauth_url_missing')
  await Browser.open({ url: data.url })
}

/** L'onglet a été fermé sans revenir (connexion abandonnée). */
export function onBrowserClosed(listener: () => void): () => void {
  const handle = Browser.addListener('browserFinished', listener)
  return () => { void handle.then((h) => h.remove()) }
}

/** Ferme l'onglet au retour (iOS ; Android le ferme seul en revenant à l'app). */
export async function closeBrowser(): Promise<void> {
  try { await Browser.close() } catch { /* déjà fermé */ }
}
