import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { authErrorMessage } from '../lib/authErrors'
import { usePageMeta } from '../hooks/usePageMeta'
import { isInstalledApp } from '../lib/platform'
import OAuthButtons from '../components/auth/OAuthButtons'
import Field from '../components/ui/Field'

export default function SignupPage() {
  const { t } = useTranslation('common')
  usePageMeta(`${t('auth.signup')} | WODBUD`)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Les deux mots de passe diffèrent : le champ de confirmation est marqué et reprend le focus.
  const [mismatch, setMismatch] = useState(false)
  const confirmRef = useRef<HTMLInputElement>(null)
  // Compte créé, courriel de confirmation envoyé : on attend la validation.
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [resent, setResent] = useState(false)
  const navigate = useNavigate()

  const handleEmailSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setMismatch(true)
      setError(t('auth_ui.password_mismatch'))
      confirmRef.current?.focus()
      return
    }
    setMismatch(false)
    setIsSubmitting(true)

    const { data: signed, error: signupError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/entraineur_dashboard`,
        // Lu par le déclencheur handle_new_user pour remplir profiles.full_name.
        data: { full_name: fullName.trim() }
      }
    })

    setIsSubmitting(false)

    if (signupError) {
      setError(authErrorMessage(signupError, t))
      return
    }

    // Sans confirmation de courriel, la session est déjà ouverte : on passe
    // directement aux questions. Sinon, le lien du courriel y mènera.
    if (signed.session) {
      navigate('/bienvenue', { replace: true })
      return
    }
    setSentTo(email.trim())
  }

  async function resend() {
    if (!sentTo) return
    setError(null)
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: sentTo,
      options: { emailRedirectTo: `${window.location.origin}/entraineur_dashboard` }
    })
    if (resendError) setError(authErrorMessage(resendError, t))
    else setResent(true)
  }

  if (sentTo) {
    return (
      <main className="wb-auth-page">
        <div className="wb-auth-wrap">
          <div className="wb-auth-logo" aria-hidden="true">WOD<span>BUD</span></div>
          <section className="wb-auth-card wb-check-mail" aria-labelledby="check-title">
            <span className="wb-check-mail-icon" aria-hidden="true">✉</span>
            <h1 id="check-title" className="wb-auth-title">{t('welcome.check_title')}</h1>
            <p className="wb-auth-sub">{t('welcome.check_body', { email: sentTo })}</p>
            <p className="wb-auth-note">{t('welcome.check_next')}</p>
            {error && <p className="wb-rec-error" role="alert">{error}</p>}
            {/* Zone vivante : « Courriel renvoyé » est annoncé, même si le bouton se désactive. */}
            <div aria-live="polite">
              <button type="button" className="wb-btn wb-btn--secondary" onClick={() => { void resend() }} disabled={resent}>
                {resent ? `✓ ${t('welcome.resent')}` : t('welcome.resend')}
              </button>
            </div>
            <Link to="/login" className="wb-auth-link">{t('auth_ui.have_account_action')}</Link>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="wb-auth-page">
      <div className="wb-auth-wrap">
        <div className="wb-auth-logo" aria-hidden="true">WOD<span>BUD</span></div>
        <section className="wb-auth-card" aria-labelledby="signup-title">
          <h1 id="signup-title" className="wb-auth-title">{t('auth.signup')}</h1>
          <p className="wb-auth-sub">{t('auth_ui.signup_subtitle')}</p>

          {error && <p className="wb-rec-error wb-auth-error" role="alert">{error}</p>}

          <form onSubmit={handleEmailSignup} className="wb-form wb-auth-form">
            <Field label={t('auth_ui.full_name')}>
              <input
                className="wb-input"
                type="text"
                required
                pattern=".*\S.*"
                maxLength={60}
                autoComplete="name"
                placeholder={t('auth_ui.full_name_placeholder')}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </Field>
            <Field label={t('auth.email')}>
              <input
                className="wb-input"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <Field label={t('auth.password')} hint={t('join.password_placeholder')}>
              <input
                className="wb-input"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
            <Field label={t('auth_ui.confirm_password')}>
              <input
                ref={confirmRef}
                className="wb-input"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                aria-invalid={mismatch || undefined}
                value={confirmPassword}
                onChange={(event) => { setConfirmPassword(event.target.value); setMismatch(false) }}
              />
            </Field>
            <button type="submit" disabled={isSubmitting} className="wb-btn wb-btn--primary wb-btn--block">
              {isSubmitting ? t('auth_ui.signup_loading') : t('auth_ui.signup_submit')}
            </button>
          </form>

          <div className="wb-auth-alt">
            <div className="wb-auth-rule" />
            <OAuthButtons disabled={isSubmitting} onError={setError} />
          </div>

          <div className="wb-auth-links">
            <Link to="/login" className="wb-auth-link">
              {t('auth_ui.have_account_action')}
            </Link>
            {/* Pas de landing dans l'app installée : le lien n'y mènerait nulle part. */}
            {!isInstalledApp() && (
              <Link to="/" className="wb-auth-link">
                {t('auth_ui.back_home')}
              </Link>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
