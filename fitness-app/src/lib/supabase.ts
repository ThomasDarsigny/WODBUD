import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types.ts' // généré par Supabase CLI
import { isNativeApp } from './platform'
import { clearRestCache, createCachedFetch } from './restCache'
import { clearOffline } from './offlineCache'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
}

// App des boutiques : pas de service worker, les lectures sont gardées par
// le client lui-même (restCache.ts). Sur le site, le service worker s'en charge.
const nativeCaches = isNativeApp() && typeof caches !== 'undefined' ? caches : null

// App des boutiques : connexions Google / Apple et liens de courriel en PKCE
// (A2, authCallback.ts) : le code de retour ne vaut rien sans le secret gardé
// ici. Le site garde le flux par défaut.
const native = isNativeApp()

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  native
    ? {
        auth: { flowType: 'pkce' },
        ...(nativeCaches ? { global: { fetch: createCachedFetch({ restPrefix: `${supabaseUrl}/rest/v1/`, caches: nativeCaches }) } } : {})
      }
    : undefined
)

// Déconnexion (ou session perdue) : rien de ce compte ne reste sur l'appareil
// pour le suivant, sauf les séances pas encore envoyées (sessionUpload.ts).
supabase.auth.onAuthStateChange((event) => {
  if (event !== 'SIGNED_OUT') return
  clearOffline()
  if (nativeCaches) void clearRestCache(nativeCaches)
})
