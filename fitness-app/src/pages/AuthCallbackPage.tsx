import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { usePageMeta } from '../hooks/usePageMeta'

type State = 'working' | 'confirmed' | 'error'

// Un code ne s'échange qu'une fois : le mode strict de React monte la page
// deux fois en développement.
const exchanges = new Map<string, Promise<unknown>>()
function exchangeOnce(code: string): Promise<unknown> {
  let p = exchanges.get(code)
  if (!p) {
    p = supabase.auth.exchangeCodeForSession(code).then(({ error }) => { if (error) throw error })
    exchanges.set(code, p)
  }
  return p
}

/**
 * Retour de connexion (A2, lib/authCallback.ts) : Google ou Apple depuis
 * l'app, ou lien de confirmation du courriel. Le code devient une session,
 * puis on va à l'accueil du compte.
 *
 * Sans le secret de départ (lien du courriel ouvert sur un autre appareil ou
 * dans le navigateur), l'échange échoue mais l'adresse est confirmée :
 * Supabase l'a vérifiée avant de renvoyer ici. On invite alors à se connecter.
 */
export default function AuthCallbackPage() {
  const { t } = useTranslation('common')
  usePageMeta(`${t('auth_callback.title')} | WODBUD`)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const code = params.get('code')
  const failed = params.get('error')
  const oauth = params.get('flow') === 'oauth'
  // Sans code : erreur pour Google / Apple ; lien du courriel déjà vérifié.
  const [state, setState] = useState<State>(failed || !code ? (failed || oauth ? 'error' : 'confirmed') : 'working')

  useEffect(() => {
    if (failed || !code) return
    let alive = true
    exchangeOnce(code)
      .then(() => { if (alive) navigate('/entraineur_dashboard', { replace: true }) })
      // Lien du courriel : revenu avec un code, l'adresse est déjà vérifiée
      // par Supabase ; l'échange échoue seulement faute du secret (autre
      // appareil, navigateur). Google / Apple : un vrai échec.
      .catch(() => { if (alive) setState(oauth ? 'error' : 'confirmed') })
    return () => { alive = false }
  }, [code, failed, oauth, navigate])

  return (
    <main className="wb-auth-page">
      <div className="wb-auth-wrap">
        <div className="wb-auth-logo" aria-hidden="true">WOD<span>BUD</span></div>
        <section className="wb-auth-card" aria-labelledby="auth-callback-title">
          {state === 'working' ? (
            <h1 id="auth-callback-title" className="wb-auth-title" role="status">{t('auth_callback.working')}</h1>
          ) : (
            <>
              <h1 id="auth-callback-title" className="wb-auth-title">{t(state === 'confirmed' ? 'auth_callback.confirmed_title' : 'auth_callback.error_title')}</h1>
              <p className="wb-auth-sub" role={state === 'error' ? 'alert' : undefined}>
                {t(state === 'confirmed' ? 'auth_callback.confirmed_text' : failed === 'access_denied' ? 'auth_callback.cancelled_text' : 'auth_callback.error_text')}
              </p>
              <Link to="/login" replace className="wb-btn wb-btn--primary wb-btn--block">{t('auth_callback.to_login')}</Link>
            </>
          )}
        </section>
      </div>
    </main>
  )
}
