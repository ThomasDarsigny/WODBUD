import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePageMeta } from '../hooks/usePageMeta'
import { supabase } from '../lib/supabase'
import { getLocalUser } from '../lib/currentUser'
import { homeFor, rememberRole } from '../lib/profileRole'
import { acceptInvite, clearPendingInvite, isStaff, previewInvite, savePendingInvite, type CenterRole } from '../lib/center'

type State =
  | { kind: 'loading' }
  | { kind: 'invalid' }
  | { kind: 'ready'; centerName: string; role: CenterRole; signedIn: boolean }

/**
 * Lien d'invitation d'un centre : membre (lien permanent) ou équipe (lien à
 * usage unique). Déconnecté, on garde le lien le temps de créer son compte ;
 * Bienvenue nous ramène ici ensuite.
 */
export default function CenterJoinPage() {
  const { token = '' } = useParams<{ token: string }>()
  const { t } = useTranslation('common')
  usePageMeta(`${t('center.join_title')} | WODBUD`)
  const navigate = useNavigate()
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [preview, { data: { session } }] = await Promise.all([
        previewInvite(token).catch(() => null),
        supabase.auth.getSession()
      ])
      if (!alive) return
      if (!preview?.valid) {
        clearPendingInvite()
        setState({ kind: 'invalid' })
        return
      }
      if (!session) savePendingInvite(token)
      setState({ kind: 'ready', centerName: preview.centerName, role: preview.role, signedIn: Boolean(session) })
    })()
    return () => { alive = false }
  }, [token])

  async function join() {
    setJoining(true)
    setError(null)
    try {
      const joined = await acceptInvite(token)
      clearPendingInvite()
      const profile = isStaff(joined.role) ? 'center' : 'member'
      const { data } = await getLocalUser()
      if (data.user) rememberRole(data.user.id, profile)
      navigate(homeFor(profile), { replace: true })
    } catch {
      setError(t('center.join_failed'))
      setJoining(false)
    }
  }

  return (
    <main className="wb-welcome">
      <div className="wb-welcome-inner">
        <div className="wb-auth-logo" aria-hidden="true">WOD<span>BUD</span></div>
        <section className="wb-welcome-card">
          {state.kind === 'loading' && <p className="wb-welcome-sub">{t('status.loading')}</p>}

          {state.kind === 'invalid' && (
            <>
              <h1>{t('center.invalid_title')}</h1>
              <p className="wb-welcome-sub">{t('center.invalid_body')}</p>
              <Link to="/" className="wb-btn wb-btn--ghost wb-btn--block">{t('center.back_home')}</Link>
            </>
          )}

          {state.kind === 'ready' && (
            <>
              <img className="wb-center-join-art" src={`/badges/${isStaff(state.role) ? 'sifflet' : 'membre'}.svg`} alt="" width={88} height={88} />
              <p className="wb-ph-tag">{t('center.invited_tag')}</p>
              <h1>{state.centerName}</h1>
              <p className="wb-welcome-sub">{t(`center.invited_as_${state.role}`)}</p>

              {error && <p className="wb-rec-error" role="alert">{error}</p>}

              {state.signedIn ? (
                <button type="button" className="wb-btn wb-btn--primary wb-btn--lg wb-btn--block" onClick={() => { void join() }} disabled={joining}>
                  {joining ? t('status.loading') : t('center.join_cta', { name: state.centerName })}
                </button>
              ) : (
                <div className="wb-center-join-auth">
                  <Link to="/signup" className="wb-btn wb-btn--primary wb-btn--lg wb-btn--block">{t('center.signup_cta')}</Link>
                  <Link to="/login" className="wb-btn wb-btn--ghost wb-btn--block">{t('center.login_cta')}</Link>
                  <p className="wb-welcome-note">{t('center.kept_note')}</p>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  )
}
