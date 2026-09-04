import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const baseInputStyle = {
    width: '100%',
    boxSizing: 'border-box' as const,
    border: '1px solid #2f2f2f',
    background: '#171717',
    color: '#f0ebe4',
    padding: '0.75rem 0.9rem'
  }

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
      setError(loginError.message)
      return
    }

    navigate('/entraineur_dashboard')
  }

  const handleGoogleLogin = async () => {
    setError(null)
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
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0a0a0a', color: '#f0ebe4', padding: 'var(--page-pad)' }}>
      <section style={{ width: '100%', maxWidth: 560, border: '1px solid #252525', background: '#111111', padding: 'var(--page-pad)' }}>
        <h1 style={{ marginTop: 0, marginBottom: '0.75rem' }}>{t('auth.login')}</h1>
        <p style={{ marginTop: 0, color: '#9f9890' }}>
          {t('auth_ui.login_subtitle')}
        </p>

        {error && (
          <p style={{ border: '1px solid #5c1f1f', background: '#2b1212', color: '#ffc2c2', padding: '0.7rem 0.85rem', margin: '1rem 0' }}>
            {error}
          </p>
        )}

        <form onSubmit={handleEmailLogin} style={{ display: 'grid', gap: '0.9rem', marginTop: '1rem' }}>
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
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              style={baseInputStyle}
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting || isGoogleLoading}
            style={{ border: 'none', padding: '0.78rem 0.9rem', background: '#ff4d00', color: '#100d0b', fontWeight: 700, cursor: 'pointer' }}
          >
            {isSubmitting ? t('auth_ui.login_loading') : t('auth_ui.login_submit')}
          </button>
        </form>

        <div style={{ display: 'grid', gap: '0.9rem', marginTop: '1rem' }}>
          <div style={{ height: 1, background: '#2a2a2a' }} />
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isSubmitting || isGoogleLoading}
            style={{ border: '1px solid #3a3a3a', padding: '0.75rem 0.9rem', background: '#191919', color: '#f0ebe4', cursor: 'pointer' }}
          >
            {isGoogleLoading ? t('auth_ui.google_redirect') : t('auth_ui.continue_google')}
          </button>
        </div>

        <div style={{ marginTop: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link to="/signup" style={{ color: '#ff4d00', textDecoration: 'none' }}>
            {t('auth_ui.create_account')}
          </Link>
          <Link to="/" style={{ color: '#ff4d00', textDecoration: 'none' }}>
            {t('auth_ui.back_home')}
          </Link>
        </div>
      </section>
    </main>
  )
}
