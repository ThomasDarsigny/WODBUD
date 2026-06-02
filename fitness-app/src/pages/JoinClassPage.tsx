import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useClassStore } from '../stores/classStore'
import type { Class } from '../types'

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
    if (!token) { setStep('error'); setErrorMsg(t('join.invalid_link')); return }
    let mounted = true
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
    <div style={{ minHeight: '100vh', background: 'var(--black)', color: 'var(--white)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'var(--font-b)' }}>
      <Link to="/" style={{ fontFamily: 'var(--font-d)', fontWeight: 900, fontSize: '1.4rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--white)', textDecoration: 'none', marginBottom: '2.5rem' }}>
        FORGE<span style={{ color: 'var(--orange)' }}>X</span>
      </Link>

      <div style={{ width: '100%', maxWidth: 420, border: '1px solid var(--border)', background: 'var(--dark)', padding: '2rem' }}>
        {step === 'loading' && (
          <p style={{ textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--font-d)', fontSize: '0.85rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            {t('status.loading')}
          </p>
        )}

        {step === 'joining' && (
          <p style={{ textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--font-d)', fontSize: '0.85rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            {t('join.joining')}
          </p>
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '3rem' }}>🎉</span>
            <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.68rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--orange)' }}>
              {t('join.success_label')}
            </p>
            <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>
              {classInfo?.name ?? t('join.success_title')}
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginTop: '0.25rem' }}>
              {t('join.success_subtitle')}
            </p>
            <button onClick={() => navigate('/athlete')} style={btnStyle}>
              {t('join.go_dashboard')}
            </button>
          </div>
        )}

        {step === 'error' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--orange)', fontFamily: 'var(--font-d)', fontSize: '0.88rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>
              {errorMsg}
            </p>
            <Link to="/login" style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{t('auth.login')}</Link>
          </div>
        )}

        {step === 'signup' && (
          <>
            <div style={{ marginBottom: '1.75rem', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.68rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--orange)', marginBottom: '0.35rem' }}>
                {t('join.invited_tag')}
              </p>
              <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>
                {t('join.create_account')}
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                {t('join.create_subtitle')}
              </p>
            </div>
            <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <InputField label={t('join.field_name')} value={fullName} onChange={setFullName} placeholder="Jean Tremblay" required />
              <InputField label={t('auth.email')} value={email} onChange={setEmail} type="email" placeholder="jean@exemple.com" required />
              <InputField label={t('auth.password')} value={password} onChange={setPassword} type="password" placeholder="6 caractères min." required />
              {formError && <p style={{ color: 'var(--orange)', fontSize: '0.82rem', margin: 0 }}>{formError}</p>}
              <button type="submit" disabled={formLoading} style={{ ...btnStyle, marginTop: '0.5rem', opacity: formLoading ? 0.7 : 1 }}>
                {formLoading ? '...' : t('join.submit_signup')}
              </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.82rem', color: 'var(--muted)' }}>
              {t('auth.have_account')}{' '}
              <button onClick={() => { setStep('login'); setFormError('') }} style={{ background: 'none', border: 'none', color: 'var(--orange)', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'var(--font-b)', padding: 0 }}>
                {t('auth.login')}
              </button>
            </p>
          </>
        )}

        {step === 'login' && (
          <>
            <div style={{ marginBottom: '1.75rem', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.68rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--orange)', marginBottom: '0.35rem' }}>
                {t('join.invited_tag')}
              </p>
              <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>
                {t('auth.login')}
              </h2>
            </div>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <InputField label={t('auth.email')} value={email} onChange={setEmail} type="email" placeholder="jean@exemple.com" required />
              <InputField label={t('auth.password')} value={password} onChange={setPassword} type="password" placeholder="" required />
              {formError && <p style={{ color: 'var(--orange)', fontSize: '0.82rem', margin: 0 }}>{formError}</p>}
              <button type="submit" disabled={formLoading} style={{ ...btnStyle, marginTop: '0.5rem', opacity: formLoading ? 0.7 : 1 }}>
                {formLoading ? '...' : t('auth_ui.login_submit')}
              </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.82rem', color: 'var(--muted)' }}>
              {t('auth.no_account')}{' '}
              <button onClick={() => { setStep('signup'); setFormError('') }} style={{ background: 'none', border: 'none', color: 'var(--orange)', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'var(--font-b)', padding: 0 }}>
                {t('join.submit_signup')}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function InputField({ label, value, onChange, type = 'text', placeholder, required }: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <label style={{ fontFamily: 'var(--font-d)', fontSize: '0.68rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)' }}>
        {label}{required && <span style={{ color: 'var(--orange)' }}> *</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        style={{ width: '100%', background: 'var(--black)', border: '1px solid var(--border)', color: 'var(--white)', padding: '0.65rem 0.9rem', fontFamily: 'var(--font-b)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
      />
    </div>
  )
}

const btnStyle = {
  fontFamily: 'var(--font-d)',
  fontSize: '0.85rem',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--black)',
  background: 'var(--orange)',
  border: 'none',
  padding: '0.75rem',
  cursor: 'pointer',
  width: '100%'
} as const
