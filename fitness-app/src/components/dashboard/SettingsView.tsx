import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import type { TablesUpdate } from '../../lib/database.types'
import type { MannequinBody } from '../mannequin/bodyPaths'
import { readBodyPref, storeBodyPref } from '../mannequin/Mannequin2D'
import { applyTheme, readStoredTheme, storeTheme } from '../../lib/theme'
import type { ThemePref, UserSegment } from '../../types'
import { uploadAvatar } from '../../lib/avatar'
import { previewAccountDeletion, confirmAccountDeletion, type DeletionImpact } from '../../lib/accountDeletion'
import { clearAuthSessionCookies } from '../../lib/authSessionCookies'
import { field as inputStyle, btnAccent as buttonStyle } from '../../styles/ui'

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

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const { data } = await supabase.auth.getUser()
      if (!mounted || !data.user) return
      setCurrentEmail(data.user.email ?? '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('theme_pref, language, segment, avatar_url')
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
      setAvatarUrl((profile as { avatar_url?: string | null }).avatar_url ?? null)
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

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permet de reprendre la même photo tout de suite après un échec
    if (!file) return
    setNotice(null)
    setBusy('avatar')
    try {
      const url = await uploadAvatar(file)
      await persist({ avatar_url: url })
      setAvatarUrl(url)
    } catch (err) {
      setNotice({ kind: 'err', text: err instanceof Error ? err.message : t('errors.generic') })
    } finally {
      setBusy(null)
    }
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
        <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '1.25rem', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
          {t('settings.title')}
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.8125rem', margin: '0.25rem 0 0' }}>{t('settings.subtitle')}</p>
      </header>

      {notice && (
        <div
          role='status'
          style={{
            border: `1px solid ${notice.kind === 'ok' ? '#4ade80' : '#ef4444'}`,
            color: notice.kind === 'ok' ? '#4ade80' : '#ef4444',
            padding: '0.6rem 0.8rem',
            fontSize: '0.8125rem'
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
        <Row label={t('settings.avatar')} hint={t('settings.avatar_hint')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=''
                style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }}
              />
            ) : (
              <div
                aria-hidden='true'
                style={{ width: 64, height: 64, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontFamily: 'var(--font-d)', fontSize: '1.5rem' }}
              >
                {(currentEmail || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <input
              ref={avatarInputRef}
              type='file'
              accept='image/jpeg,image/png,image/webp'
              style={{ display: 'none' }}
              onChange={(e) => { void handleAvatarChange(e) }}
            />
            <button type='button' onClick={() => avatarInputRef.current?.click()} disabled={busy === 'avatar'} style={buttonStyle}>
              {busy === 'avatar' ? t('settings.saving') : avatarUrl ? t('settings.avatar_change') : t('settings.avatar_add')}
            </button>
          </div>
        </Row>

        <Row label={t('settings.current_email')}>
          <p style={{ margin: 0, fontSize: '0.9375rem' }}>{currentEmail || '—'}</p>
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
        <Link to='/confidentialite' style={{ color: 'var(--orange)', fontSize: '0.8125rem' }}>
          {t('settings.privacy_link')}
        </Link>
      </Section>

      <Section title={t('settings.danger_zone')}>
        <Row label={t('settings.delete_account')} hint={t('settings.delete_account_hint')}>
          <button
            type='button'
            onClick={() => setDeleteModalOpen(true)}
            style={{ ...buttonStyle, background: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)', alignSelf: 'flex-start' }}
          >
            {t('settings.delete_account')}
          </button>
        </Row>
      </Section>

      {deleteModalOpen && <DeleteAccountModal onClose={() => setDeleteModalOpen(false)} />}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ border: '1px solid var(--border)', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h2
        style={{
          fontFamily: 'var(--font-d)',
          fontSize: '0.6875rem',
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
      <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>{hint}</span>}
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
        fontSize: '0.6875rem',
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

/**
 * Suppression de compte — deux appels à la fonction Edge (voir
 * supabase/functions/delete-account) : un aperçu au montage, la suppression
 * réelle seulement après que la personne a tapé le mot de confirmation.
 *
 * Le mot à taper n'est pas une case à cocher : forcer à retaper quelque
 * chose ralentit assez pour qu'un clic distrait ne suffise pas, sur une
 * action qu'aucun « annuler » ne peut défaire.
 */
function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const [impact, setImpact] = useState<DeletionImpact | null>(null)
  const [loadingImpact, setLoadingImpact] = useState(true)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirmWord = t('settings.delete_confirm_word')

  useEffect(() => {
    let mounted = true
    previewAccountDeletion()
      .then((i) => { if (mounted) setImpact(i) })
      .catch((err: unknown) => { if (mounted) setError(err instanceof Error ? err.message : t('errors.generic')) })
      .finally(() => { if (mounted) setLoadingImpact(false) })
    return () => { mounted = false }
  }, [t])

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    try {
      await confirmAccountDeletion()
      try { await supabase.auth.signOut() } catch { /* le compte n'existe déjà plus */ }
      try { await clearAuthSessionCookies() } catch { /* idem */ }
      navigate('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'))
      setDeleting(false)
    }
  }

  const hasThirdPartyImpact = (impact?.athletesAffected ?? 0) > 0

  return (
    <div
      role='dialog'
      aria-modal='true'
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', padding: '1rem' }}
    >
      <div style={{ background: 'var(--black)', border: '1px solid rgba(239,68,68,0.4)', maxWidth: 480, width: '100%', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '1.0625rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#ef4444', margin: 0 }}>
          {t('settings.delete_account')}
        </h2>

        {loadingImpact ? (
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0 }}>{t('status.loading')}</p>
        ) : impact ? (
          <>
            <p style={{ fontSize: '0.875rem', margin: 0 }}>{t('settings.delete_warning')}</p>
            <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.8125rem', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {impact.workoutsCreated > 0 && <li>{t('settings.delete_impact_workouts', { count: impact.workoutsCreated })}</li>}
              {impact.sessionsLogged > 0 && <li>{t('settings.delete_impact_sessions', { count: impact.sessionsLogged })}</li>}
              {impact.classesOwned > 0 && <li>{t('settings.delete_impact_classes', { count: impact.classesOwned })}</li>}
              {impact.votesSessionsOwned > 0 && <li>{t('settings.delete_impact_votes', { count: impact.votesSessionsOwned })}</li>}
              {impact.scheduledCount > 0 && <li>{t('settings.delete_impact_scheduled', { count: impact.scheduledCount })}</li>}
            </ul>

            {hasThirdPartyImpact && (
              <div style={{ border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)', padding: '0.75rem', fontSize: '0.8125rem', color: '#ef4444' }}>
                {t('settings.delete_impact_athletes', { count: impact.athletesAffected })}
              </div>
            )}

            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.8125rem' }}>{t('settings.delete_confirm_label', { word: confirmWord })}</span>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoComplete='off'
                style={inputStyle}
              />
            </label>
          </>
        ) : null}

        {error && (
          <p role='alert' style={{ color: '#ef4444', fontSize: '0.8125rem', margin: 0 }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
          <button type='button' onClick={onClose} disabled={deleting} style={{ ...buttonStyle, background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)' }}>
            {t('actions.cancel')}
          </button>
          <button
            type='button'
            onClick={() => { void handleDelete() }}
            disabled={deleting || loadingImpact || !impact || confirmText.trim() !== confirmWord}
            style={{ ...buttonStyle, background: '#ef4444', color: 'var(--black)', opacity: (deleting || loadingImpact || !impact || confirmText.trim() !== confirmWord) ? 0.5 : 1 }}
          >
            {deleting ? t('settings.saving') : t('settings.delete_account_confirm_button')}
          </button>
        </div>
      </div>
    </div>
  )
}
