import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useClassStore } from '../stores/classStore'
import type { Class } from '../types'
import Field from '../components/ui/Field'

type Step = 'loading' | 'signup' | 'login' | 'joining' | 'done' | 'error'

export default function JoinClassPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation('common')
  const { joinClass } = useClassStore()

  const [step, setStep] = useState<Step>('loading')
  const [classInfo, setClassInfo] = useState<Class | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // Form fields
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    let mounted = true
    // Le cas « pas de jeton » passe par la file de microtâches plutôt que par
    // un setState synchrone dans l'effet, qui provoquait un rendu en cascade.
    if (!token) {
      queueMicrotask(() => {
        if (!mounted) return
        setStep('error')
        setErrorMsg(t('join.invalid_link'))
      })
      return () => { mounted = false }
    }
    ;(async () => {
      // Fetch class info without auth (public read won't work due to RLS, use service approach)
      // We'll show a generic join page and validate the token on submit
      // Check if user is already logged in
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return
      if (session) {
        // Already logged in → join directly
        setStep('joining')
        try {
          const cls = await joinClass(token)
          setClassInfo(cls)
          setStep('done')
        } catch (err) {
          setStep('error')
          setErrorMsg(err instanceof Error ? err.message : t('errors.generic'))
        }
      } else {
        setStep('signup')
      }
    })()
    return () => { mounted = false }
  }, [token, joinClass, t])

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim() || !email.trim() || password.length < 6) return
    setFormLoading(true)
    setFormError('')
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim() } }
      })
      if (error) throw error
      if (!data.session) {
        // Email confirmation required — still try to join (will fail if user not confirmed yet)
        // Show message
        setFormError(t('join.confirm_email'))
        setFormLoading(false)
        return
      }
      // Signed up and logged in → join class
      setStep('joining')
      const cls = await joinClass(token!)
      setClassInfo(cls)
      setStep('done')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('errors.generic'))
      setFormLoading(false)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setFormLoading(true)
    setFormError('')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw error
      setStep('joining')
      const cls = await joinClass(token!)
      setClassInfo(cls)
      setStep('done')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('errors.generic'))
      setFormLoading(false)
    }
  }

  return (
    <main className="wb-checkin-page">
      <Link to="/" className="wb-checkin-logo">WOD<span>BUD</span></Link>

      <section className="wb-join-card" aria-live="polite">
        {step === 'loading' && <p className="wb-checkin-status">{t('status.loading')}</p>}

        {step === 'joining' && <p className="wb-checkin-status">{t('join.joining')}</p>}

        {step === 'done' && (
          <div className="wb-join-done">
            <span className="wb-join-emoji" aria-hidden="true">🎉</span>
            <p className="wb-ph-tag">{t('join.success_label')}</p>
            <h1 className="wb-checkin-title">{classInfo?.name ?? t('join.success_title')}</h1>
            <p className="wb-checkin-text">{t('join.success_subtitle')}</p>
            <button type="button" onClick={() => navigate('/athlete')} className="wb-btn wb-btn--primary">
              {t('join.go_dashboard')}
            </button>
          </div>
        )}

        {step === 'error' && (
          <div className="wb-join-done">
            <p className="wb-join-error" role="alert">{errorMsg}</p>
            <Link to="/login" className="wb-checkin-link">{t('auth.login')}</Link>
          </div>
        )}

        {step === 'signup' && (
          <>
            <div className="wb-join-head">
              <p className="wb-ph-tag">{t('join.invited_tag')}</p>
              <h1 className="wb-checkin-title">{t('join.create_account')}</h1>
              <p className="wb-join-sub">{t('join.create_subtitle')}</p>
            </div>
            <form onSubmit={handleSignup} className="wb-form">
              <Field label={t('join.field_name')} required>
                <input className="wb-input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jean Tremblay" autoComplete="name" required />
              </Field>
              <Field label={t('auth.email')} required>
                <input className="wb-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jean@exemple.com" autoComplete="email" required />
              </Field>
              <Field label={t('auth.password')} required>
                <input className="wb-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('join.password_placeholder')} autoComplete="new-password" minLength={6} required />
              </Field>
              {formError && <p className="wb-join-error" role="alert">{formError}</p>}
              <button type="submit" disabled={formLoading} className="wb-btn wb-btn--primary wb-btn--block">
                {formLoading ? '…' : t('join.submit_signup')}
              </button>
            </form>
            <p className="wb-join-switch">
              {t('auth.have_account')}{' '}
              <button type="button" onClick={() => { setStep('login'); setFormError('') }}>{t('auth.login')}</button>
            </p>
          </>
        )}

        {step === 'login' && (
          <>
            <div className="wb-join-head">
              <p className="wb-ph-tag">{t('join.invited_tag')}</p>
              <h1 className="wb-checkin-title">{t('auth.login')}</h1>
            </div>
            <form onSubmit={handleLogin} className="wb-form">
              <Field label={t('auth.email')} required>
                <input className="wb-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jean@exemple.com" autoComplete="email" required />
              </Field>
              <Field label={t('auth.password')} required>
                <input className="wb-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
              </Field>
              {formError && <p className="wb-join-error" role="alert">{formError}</p>}
              <button type="submit" disabled={formLoading} className="wb-btn wb-btn--primary wb-btn--block">
                {formLoading ? '…' : t('auth_ui.login_submit')}
              </button>
            </form>
            <p className="wb-join-switch">
              {t('auth.no_account')}{' '}
              <button type="button" onClick={() => { setStep('signup'); setFormError('') }}>{t('join.submit_signup')}</button>
            </p>
          </>
        )}
      </section>
    </main>
  )
}
