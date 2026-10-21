/**
 * Fournisseurs de connexion activés dans Supabase (Authentication → Providers).
 *
 * Lu sur /auth/v1/settings, la même source que celle de Supabase : un
 * bouton « Continuer avec Apple » n'apparaît que lorsque Apple est vraiment
 * configuré, sans réglage à maintenir à la main dans le code.
 */
export interface AuthProviders {
  google: boolean
  apple: boolean
}

let cache: Promise<AuthProviders> | null = null

export function fetchAuthProviders(): Promise<AuthProviders> {
  if (cache) return cache
  const url = import.meta.env.VITE_SUPABASE_URL as string
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  cache = fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((d: { external?: Record<string, boolean> }) => ({
      google: Boolean(d.external?.google),
      apple: Boolean(d.external?.apple)
    }))
    .catch(() => {
      // Hors ligne ou réponse inattendue : on garde Google (configuré
      // depuis toujours) et on n'affiche pas un bouton Apple incertain.
      cache = null
      return { google: true, apple: false }
    })
  return cache
}
