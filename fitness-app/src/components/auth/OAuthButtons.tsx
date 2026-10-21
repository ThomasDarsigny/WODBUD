import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { fetchAuthProviders, type AuthProviders } from '../../lib/authProviders'

type Provider = 'apple' | 'google'

/**
 * Boutons « Continuer avec Apple / Google » des écrans de connexion et
 * d'inscription.
 *
 * Apple en premier et au moins aussi visible que Google : c'est la règle de
 * l'App Store dès qu'une connexion tierce est proposée (guideline 4.8).
 * Chaque bouton n'apparaît que si le fournisseur est activé dans Supabase.
 */
export default function OAuthButtons({ disabled, onError }: { disabled?: boolean; onError: (message: string) => void }) {
  const { t } = useTranslation('common')
  const [providers, setProviders] = useState<AuthProviders | null>(null)
  const [pending, setPending] = useState<Provider | null>(null)

  useEffect(() => {
    let mounted = true
    fetchAuthProviders().then((p) => { if (mounted) setProviders(p) })
    return () => { mounted = false }
  }, [])

  async function signIn(provider: Provider) {
    setPending(provider)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/entraineur_dashboard` }
    })
    // En cas de succès le navigateur part vers le fournisseur : on ne
    // remet l'état à zéro que si quelque chose a échoué.
    if (error) {
      setPending(null)
      onError(error.message)
    }
  }

  // Réserve la place de Google pendant la lecture, pour éviter un saut.
  if (!providers) return <div style={{ minHeight: 48 }} aria-hidden="true" />

  const busy = disabled || pending !== null

  return (
    <div style={{ display: 'grid', gap: '0.6rem' }}>
      {providers.apple && (
        <button type="button" onClick={() => { void signIn('apple') }} disabled={busy} className="wb-oauth wb-oauth-apple">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path fill="currentColor" d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
          </svg>
          {pending === 'apple' ? t('auth_ui.apple_redirect') : t('auth_ui.continue_apple')}
        </button>
      )}
      {providers.google && (
        <button type="button" onClick={() => { void signIn('google') }} disabled={busy} className="wb-oauth wb-oauth-google">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path fill="#4285F4" d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.87c2.27-2.09 3.58-5.17 3.58-8.65Z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.87-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.29v3.1A12 12 0 0 0 12 24Z" />
            <path fill="#FBBC05" d="M5.29 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4A12 12 0 0 0 0 12c0 1.94.46 3.77 1.29 5.4l4-3.1Z" />
            <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.6 4.58 1.8l3.43-3.43A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.29 6.6l4 3.1C6.23 6.88 8.88 4.77 12 4.77Z" />
          </svg>
          {pending === 'google' ? t('auth_ui.google_redirect') : t('auth_ui.continue_google')}
        </button>
      )}
    </div>
  )
}
