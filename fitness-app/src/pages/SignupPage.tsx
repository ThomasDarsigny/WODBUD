import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { usePageMeta } from '../hooks/usePageMeta'
import { isInstalledApp } from '../lib/platform'
import OAuthButtons from '../components/auth/OAuthButtons'

export default function SignupPage() {
  const { t } = useTranslation('common')
  usePageMeta(`${t('auth.signup')} | WODBUD`)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const baseInputStyle = {
    width: '100%',
    boxSizing: 'border-box' as const,
    border: '1px solid var(--line-fn)',
    background: 'var(--black)',
    color: 'var(--white)',
    padding: '0.75rem 0.9rem'
  }

  const handleEmailSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setNotice(null)

    if (password !== confirmPassword) {
      setError(t('auth_ui.password_mismatch'))
      return
    }

    setIsSubmitting(true)

    const { error: signupError } = await supabase.auth.signUp({
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
      setError(signupError.message)
      return
    }

    setNotice(t('auth_ui.signup_success'))
  }


  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--black)', color: 'var(--white)', padding: 'var(--page-pad)' }}>
      <div className="wb-auth-wrap">
      <div className="wb-auth-logo" aria-hidden="true">WOD<span>BUD</span></div>
      <section className="wb-auth-card" style={{ width: '100%', maxWidth: 560, border: '1px solid var(--border)', background: 'var(--dark)', padding: 'var(--page-pad)' }}>
        <h1 className="wb-auth-title" style={{ marginTop: 0, marginBottom: '0.75rem' }}>{t('auth.signup')}</h1>
        <p style={{ marginTop: 0, color: 'var(--muted)' }}>
          {t('auth_ui.signup_subtitle')}
        </p>

        {error && (
          <p style={{ border: '1px solid #6b2422', background: '#2a1513', color: '#ffc7bf', padding: '0.7rem 0.85rem', margin: '1rem 0' }}>
            {error}
          </p>
        )}

        {notice && (
          <p style={{ border: '1px solid #235c33', background: '#13291a', color: '#c3f2cd', padding: '0.7rem 0.85rem', margin: '1rem 0' }}>
            {notice}
          </p>
        )}

        <form onSubmit={handleEmailSignup} style={{ display: 'grid', gap: '0.9rem', marginTop: '1rem' }}>
          <label style={{ display: 'grid', gap: '0.4rem' }}>
            <span>{t('auth_ui.full_name')}</span>
            <input
              type="text"
              required
              pattern=".*\S.*"
              maxLength={60}
              autoComplete="name"
              placeholder={t('auth_ui.full_name_placeholder')}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              style={baseInputStyle}
            />
          </label>

          <label style={{ display: 'grid', gap: '0.4rem' }}>
            <span>{t('auth.email')}</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              style={baseInputStyle}
            />
          </label>

          <label style={{ display: 'grid', gap: '0.4rem' }}>
            <span>{t('auth.password')}</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              style={baseInputStyle}
            />
          </label>

          <label style={{ display: 'grid', gap: '0.4rem' }}>
            <span>{t('auth_ui.confirm_password')}</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              style={baseInputStyle}
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{ border: 'none', padding: '0.78rem 0.9rem', background: 'var(--orange)', color: 'var(--black)', fontWeight: 700, cursor: 'pointer' }}
          >
            {isSubmitting ? t('auth_ui.signup_loading') : t('auth_ui.signup_submit')}
          </button>
        </form>

        <div style={{ display: 'grid', gap: '0.9rem', marginTop: '1rem' }}>
          <div style={{ height: 1, background: 'var(--border)' }} />
          <OAuthButtons disabled={isSubmitting} onError={setError} />
        </div>

        <div style={{ marginTop: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
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
