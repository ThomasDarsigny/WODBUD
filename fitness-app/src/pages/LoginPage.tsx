import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { authErrorMessage } from '../lib/authErrors'
import { usePageMeta } from '../hooks/usePageMeta'
import { isInstalledApp } from '../lib/platform'
import OAuthButtons from '../components/auth/OAuthButtons'
import Field from '../components/ui/Field'

export default function LoginPage() {
  const { t } = useTranslation('common')
  usePageMeta(`${t('auth.login')} | WODBUD`)
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleEmailLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    })

    setIsSubmitting(false)

    if (loginError) {
      setError(authErrorMessage(loginError, t))
      return
    }

    navigate('/entraineur_dashboard')
  }

  return (
    <main className="wb-auth-page">
      <div className="wb-auth-wrap">
        <div className="wb-auth-logo" aria-hidden="true">WOD<span>BUD</span></div>
        <section className="wb-auth-card" aria-labelledby="login-title">
          <h1 id="login-title" className="wb-auth-title">{t('auth.login')}</h1>
          <p className="wb-auth-sub">{t('auth_ui.login_subtitle')}</p>

          {error && <p className="wb-rec-error wb-auth-error" role="alert">{error}</p>}

          <form onSubmit={handleEmailLogin} className="wb-form wb-auth-form">
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
            <Field label={t('auth.password')}>
              <input
                className="wb-input"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
            <button type="submit" disabled={isSubmitting} className="wb-btn wb-btn--primary wb-btn--block">
              {isSubmitting ? t('auth_ui.login_loading') : t('auth_ui.login_submit')}
            </button>
          </form>

          <div className="wb-auth-alt">
            <div className="wb-auth-rule" />
            <OAuthButtons disabled={isSubmitting} onError={setError} />
          </div>

          <div className="wb-auth-links">
            <Link to="/signup" className="wb-auth-link">
              {t('auth_ui.create_account')}
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
