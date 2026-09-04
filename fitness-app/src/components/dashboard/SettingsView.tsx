import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import type { TablesUpdate } from '../../lib/database.types'
import type { MannequinBody } from '../mannequin/bodyPaths'
import { readBodyPref, storeBodyPref } from '../mannequin/Mannequin2D'
import { applyTheme, readStoredTheme, storeTheme } from '../../lib/theme'
import type { ThemePref, UserSegment } from '../../types'

const LANGS: Array<{ code: string; key: string }> = [
  { code: 'fr', key: 'language.fr' },
  { code: 'en', key: 'language.en' },
  { code: 'es', key: 'language.es' }
]

const THEMES: Array<{ value: ThemePref; key: string }> = [
  { value: 'clair', key: 'settings.theme_light' },
  { value: 'sombre', key: 'settings.theme_dark' },
  { value: 'auto', key: 'settings.theme_auto' }
]

const SEGMENTS: Array<{ value: UserSegment; key: string }> = [
  { value: 'individu', key: 'settings.segment_individu' },
  { value: 'gym', key: 'settings.segment_gym' }
]

export default function SettingsView() {
  const { t, i18n } = useTranslation(['common'])

  const [theme, setTheme] = useState<ThemePref>(readStoredTheme())
  const [segment, setSegment] = useState<UserSegment | null>(null)
  const [mannequin, setMannequin] = useState<MannequinBody>(readBodyPref)
  const [currentEmail, setCurrentEmail] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const { data } = await supabase.auth.getUser()
      if (!mounted || !data.user) return
      setCurrentEmail(data.user.email ?? '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('theme_pref, language, segment')
        .eq('id', data.user.id)
        .maybeSingle()

      if (!mounted || !profile) return
      if (profile.theme_pref) {
        setTheme(profile.theme_pref as ThemePref)
        applyTheme(profile.theme_pref as ThemePref)
        storeTheme(profile.theme_pref as ThemePref)
      }
      if (profile.segment) setSegment(profile.segment as UserSegment)
      if (profile.language && profile.language !== i18n.language) {
        void i18n.changeLanguage(profile.language)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [i18n])

  async function persist(patch: TablesUpdate<'profiles'>) {
    const { data } = await supabase.auth.getUser()
    if (!data.user) return
    await supabase.from('profiles').update(patch).eq('id', data.user.id)
  }

  function pickTheme(value: ThemePref) {
    setTheme(value)
    applyTheme(value)
    storeTheme(value)
    void persist({ theme_pref: value })
  }

  function pickLanguage(code: string) {
    void i18n.changeLanguage(code)
    void persist({ language: code })
  }

  function pickSegment(value: UserSegment) {
    setSegment(value)
    void persist({ segment: value })
  }

  async function submitEmail() {
    setNotice(null)
    if (!newEmail.trim() || newEmail.trim() === currentEmail) return
    setBusy('email')
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
    setBusy(null)
    if (error) setNotice({ kind: 'err', text: error.message })
    else {
      setNotice({ kind: 'ok', text: t('settings.email_sent') })
      setNewEmail('')
    }
  }

  async function submitPassword() {
    setNotice(null)
    if (newPassword.length < 8) {
      setNotice({ kind: 'err', text: t('settings.password_too_short') })
      return
    }
    if (newPassword !== confirmPassword) {
      setNotice({ kind: 'err', text: t('settings.password_mismatch') })
      return
    }
    setBusy('password')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setBusy(null)
    if (error) setNotice({ kind: 'err', text: error.message })
    else {
      setNotice({ kind: 'ok', text: t('settings.password_changed') })
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: 720, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <header>
        <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '1.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
          {t('settings.title')}
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>{t('settings.subtitle')}</p>
      </header>

      {notice && (
        <div
          role='status'
          style={{
            border: `1px solid ${notice.kind === 'ok' ? '#4ade80' : '#ef4444'}`,
            color: notice.kind === 'ok' ? '#4ade80' : '#ef4444',
            padding: '0.6rem 0.8rem',
            fontSize: '0.8rem'
          }}
        >
          {notice.text}
        </div>
      )}

      <Section title={t('settings.appearance')}>
        <Row label={t('settings.theme')} hint={t('settings.theme_hint')}>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {THEMES.map((opt) => (
              <Chip key={opt.value} active={theme === opt.value} onClick={() => pickTheme(opt.value)} label={t(opt.key)} />
            ))}
          </div>
        </Row>

        <Row label={t('language.label')} hint={t('settings.language_hint')}>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {LANGS.map((l) => (
              <Chip
                key={l.code}
                active={i18n.language?.startsWith(l.code)}
                onClick={() => pickLanguage(l.code)}
                label={t(l.key)}
              />
            ))}
          </div>
        </Row>

        <Row label={t('settings.segment')} hint={t('settings.segment_hint')}>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {SEGMENTS.map((sgm) => (
              <Chip key={sgm.value} active={segment === sgm.value} onClick={() => pickSegment(sgm.value)} label={t(sgm.key)} />
            ))}
          </div>
        </Row>

        <Row label={t('settings.mannequin')} hint={t('settings.mannequin_hint')}>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {(['male', 'female'] as MannequinBody[]).map((b) => (
              <Chip
                key={b}
                active={mannequin === b}
                onClick={() => { setMannequin(b); storeBodyPref(b) }}
                label={t(b === 'male' ? 'settings.mannequin_male' : 'settings.mannequin_female')}
              />
            ))}
          </div>
        </Row>
      </Section>

      <Section title={t('settings.account')}>
        <Row label={t('settings.current_email')}>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>{currentEmail || '—'}</p>
        </Row>

        <Row label={t('settings.new_email')}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              type='email'
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder={currentEmail}
              autoComplete='email'
              style={inputStyle}
            />
            <button type='button' onClick={submitEmail} disabled={busy === 'email'} style={buttonStyle}>
              {busy === 'email' ? t('settings.saving') : t('settings.change_email')}
            </button>
          </div>
        </Row>

        <Row label={t('settings.new_password')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <input
              type='password'
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete='new-password'
              style={inputStyle}
            />
            <input
              type='password'
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('settings.confirm_password')}
              autoComplete='new-password'
              style={inputStyle}
            />
            <button type='button' onClick={submitPassword} disabled={busy === 'password'} style={{ ...buttonStyle, alignSelf: 'flex-start' }}>
              {busy === 'password' ? t('settings.saving') : t('settings.change_password')}
            </button>
          </div>
        </Row>
      </Section>

      <Section title={t('settings.privacy')}>
        <Link to='/confidentialite' style={{ color: 'var(--orange)', fontSize: '0.85rem' }}>
          {t('settings.privacy_link')}
        </Link>
      </Section>
    </div>
  )
}

const inputStyle: CSSProperties = {
  background: 'var(--dark)',
  border: '1px solid var(--border)',
  color: 'var(--white)',
  padding: '0.5rem 0.7rem',
  fontSize: '0.88rem',
  fontFamily: 'var(--font-b)',
  minWidth: '15rem',
  outline: 'none'
}

const buttonStyle: CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--orange)',
  color: 'var(--orange)',
  padding: '0.5rem 0.9rem',
  fontFamily: 'var(--font-d)',
  fontSize: '0.72rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  cursor: 'pointer'
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ border: '1px solid var(--border)', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h2
        style={{
          fontFamily: 'var(--font-d)',
          fontSize: '0.72rem',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          margin: 0
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{hint}</span>}
    </div>
  )
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type='button'
      onClick={onClick}
      style={{
        fontFamily: 'var(--font-d)',
        fontSize: '0.72rem',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        padding: '0.35rem 0.8rem',
        border: `1px solid ${active ? 'var(--orange)' : 'var(--border)'}`,
        background: active ? 'rgba(255,77,0,0.12)' : 'transparent',
        color: active ? 'var(--orange)' : 'var(--muted)',
        cursor: 'pointer',
        transition: 'all 0.15s'
      }}
    >
      {label}
    </button>
  )
}
