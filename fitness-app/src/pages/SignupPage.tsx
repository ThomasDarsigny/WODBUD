import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'

export default function SignupPage() {
  const { t } = useTranslation('common')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const baseInputStyle = {
    width: '100%',
    boxSizing: 'border-box' as const,
    border: '1px solid #2f2f2f',
    background: '#171717',
    color: '#f0ebe4',
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
        emailRedirectTo: `${window.location.origin}/entraineur_dashboard`
      }
    })

    setIsSubmitting(false)

    if (signupError) {
      setError(signupError.message)
      return
    }

    setNotice(t('auth_ui.signup_success'))
  }

  const handleGoogleSignup = async () => {
    setError(null)
    setNotice(null)
    setIsGoogleLoading(true)

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/entraineur_dashboard`
      }
    })

    setIsGoogleLoading(false)

    if (oauthError) {
      setError(oauthError.message)
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0a0a0a', color: '#f0ebe4', padding: '2rem' }}>
      <section style={{ width: '100%', maxWidth: 560, border: '1px solid #252525', background: '#111111', padding: '2rem' }}>
        <h1 style={{ marginTop: 0, marginBottom: '0.75rem' }}>{t('auth.signup')}</h1>
        <p style={{ marginTop: 0, color: '#9f9890' }}>
          {t('auth_ui.signup_subtitle')}
        </p>

        {error && (
          <p style={{ border: '1px solid #5c1f1f', background: '#2b1212', color: '#ffc2c2', padding: '0.7rem 0.85rem', margin: '1rem 0' }}>
            {error}
          </p>
        )}

        {notice && (
          <p style={{ border: '1px solid #1f5c2a', background: '#122b17', color: '#bff5c9', padding: '0.7rem 0.85rem', margin: '1rem 0' }}>
            {notice}
          </p>
        )}

        <form onSubmit={handleEmailSignup} style={{ display: 'grid', gap: '0.9rem', marginTop: '1rem' }}>
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
            disabled={isSubmitting || isGoogleLoading}
            style={{ border: 'none', padding: '0.78rem 0.9rem', background: '#ff4d00', color: '#100d0b', fontWeight: 700, cursor: 'pointer' }}
          >
            {isSubmitting ? t('auth_ui.signup_loading') : t('auth_ui.signup_submit')}
          </button>
        </form>

        <div style={{ display: 'grid', gap: '0.9rem', marginTop: '1rem' }}>
          <div style={{ height: 1, background: '#2a2a2a' }} />
          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={isSubmitting || isGoogleLoading}
            style={{ border: '1px solid #3a3a3a', padding: '0.75rem 0.9rem', background: '#191919', color: '#f0ebe4', cursor: 'pointer' }}
          >
            {isGoogleLoading ? t('auth_ui.google_redirect') : t('auth_ui.continue_google')}
          </button>
        </div>

        <div style={{ marginTop: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link to="/login" style={{ color: '#ff4d00', textDecoration: 'none' }}>
            {t('auth_ui.have_account_action')}
          </Link>
          <Link to="/" style={{ color: '#ff4d00', textDecoration: 'none' }}>
            {t('auth_ui.back_home')}
          </Link>
        </div>
      </section>
    </main>
  )
}
