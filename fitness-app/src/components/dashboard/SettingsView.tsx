import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { getLocalUser } from '../../lib/currentUser'
import { disablePush, enablePush, getPushState, sendTestPush, type PushState } from '../../lib/push'
import type { TablesUpdate } from '../../lib/database.types'
import type { MannequinBody } from '../mannequin/bodyPaths'
import { readBodyPref, storeBodyPref } from '../mannequin/Mannequin2D'
import { applyTheme, readStoredTheme, storeTheme } from '../../lib/theme'
import type { ThemePref, SocialLink, SocialPlatform } from '../../types'
import { uploadAvatar } from '../../lib/avatar'
import { previewAccountDeletion, confirmAccountDeletion, type DeletionImpact } from '../../lib/accountDeletion'
import { clearAuthSessionCookies } from '../../lib/authSessionCookies'
import { field as inputStyle, btnAccent as buttonStyle } from '../../styles/ui'
import { clearWorkoutDraft } from '../../stores/workoutStore'

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

export default function SettingsView() {
  const { t, i18n } = useTranslation(['common'])
  const navigate = useNavigate()

  const [theme, setTheme] = useState<ThemePref>(readStoredTheme())
  const [mannequin, setMannequin] = useState<MannequinBody>(readBodyPref)
  const [currentEmail, setCurrentEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [savedName, setSavedName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([])
  const [newPlatform, setNewPlatform] = useState<SocialPlatform>('instagram')
  const [newUrl, setNewUrl] = useState('')

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [pushState, setPushState] = useState<PushState | null>(null)

  useEffect(() => {
    let mounted = true
    getPushState()
      .then((s) => { if (mounted) setPushState(s) })
      .catch(() => { if (mounted) setPushState('unsupported') })
    return () => { mounted = false }
  }, [])

  async function runPush(action: () => Promise<PushState | { sent: number }>, okText?: string) {
    setNotice(null)
    setBusy('push')
    try {
      const result = await action()
      if (typeof result === 'string') {
        setPushState(result)
        if (okText && result === 'on') setNotice({ kind: 'ok', text: okText })
      } else if (result.sent > 0) {
        if (okText) setNotice({ kind: 'ok', text: okText })
      } else {
        setNotice({ kind: 'err', text: t('settings.push_test_none') })
      }
    } catch (err) {
      setNotice({ kind: 'err', text: err instanceof Error ? err.message : t('errors.generic') })
    } finally {
      setBusy(null)
    }
  }

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const { data } = await getLocalUser()
      if (!mounted || !data.user) return
      setCurrentEmail(data.user.email ?? '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, theme_pref, language, avatar_url, social_links')
        .eq('id', data.user.id)
        .maybeSingle()

      if (!mounted || !profile) return
      setFullName(profile.full_name ?? '')
      setSavedName(profile.full_name ?? '')
      if (profile.theme_pref) {
        setTheme(profile.theme_pref as ThemePref)
        applyTheme(profile.theme_pref as ThemePref)
        storeTheme(profile.theme_pref as ThemePref)
      }
      if (profile.language && profile.language !== i18n.language) {
        void i18n.changeLanguage(profile.language)
      }
      setAvatarUrl((profile as { avatar_url?: string | null }).avatar_url ?? null)
      setSocialLinks(Array.isArray(profile.social_links) ? (profile.social_links as unknown as SocialLink[]) : [])
    }
    void load()
    return () => {
      mounted = false
    }
  }, [i18n])

  async function persist(patch: TablesUpdate<'profiles'>) {
    const { data } = await getLocalUser()
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

  async function addSocialLink() {
    const url = newUrl.trim()
    if (!url) return
    setNotice(null)
    // Pas de validation stricte du format d'URL : un lien Instagram peut
    // s'écrire "instagram.com/nom" sans schéma, valider trop tôt ferait
    // rejeter une saisie légitime.
    const withScheme = /^https?:\/\//i.test(url) ? url : `https://${url}`
    const next = [...socialLinks, { platform: newPlatform, url: withScheme }]
    setSocialLinks(next)
    setNewUrl('')
    await persist({ social_links: next as unknown as TablesUpdate<'profiles'>['social_links'] })
  }

  async function removeSocialLink(index: number) {
    const next = socialLinks.filter((_, i) => i !== index)
    setSocialLinks(next)
    await persist({ social_links: next as unknown as TablesUpdate<'profiles'>['social_links'] })
  }

  // La déconnexion vivait au pied du menu latéral : elle est ici, avec le
  // reste du compte, pour libérer la barre.
  async function logout() {
    setBusy('logout')
    clearWorkoutDraft()
    try { await supabase.auth.signOut() } catch { /* session déjà expirée */ }
    try { await clearAuthSessionCookies() } catch { /* ignore */ }
    navigate('/login')
  }

  async function submitName() {
    setNotice(null)
    const name = fullName.trim()
    if (!name || name === savedName) return
    setBusy('name')
    const { data } = await getLocalUser()
    const { error } = data.user
      ? await supabase.from('profiles').update({ full_name: name }).eq('id', data.user.id)
      : { error: new Error(t('errors.generic')) }
    setBusy(null)
    if (error) setNotice({ kind: 'err', text: error.message })
    else {
      setSavedName(name)
      setFullName(name)
      setNotice({ kind: 'ok', text: t('settings.name_saved') })
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
    <div className="wb-page" style={{ maxWidth: 720 }}>
      <header className="wb-ph">
        <div>
          <p className="wb-ph-tag">{t('nav.settings')}</p>
          <h1>{t('settings.title')}</h1>
          <p className="wb-ph-sub">{t('settings.subtitle')}</p>
        </div>
      </header>

      {notice && (
        <div
          role='status'
          style={{
            border: `1px solid ${notice.kind === 'ok' ? '#4ade80' : '#ef4444'}`,
            color: notice.kind === 'ok' ? '#4ade80' : '#ef4444',
            padding: '0.6rem 0.8rem',
            fontSize: '0.875rem',
            borderRadius: 12
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
                {(savedName || currentEmail || '?').charAt(0).toUpperCase()}
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

        <Row label={t('settings.display_name')} hint={t('settings.display_name_hint')}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              type='text'
              value={fullName}
              maxLength={60}
              onChange={(e) => setFullName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void submitName() }}
              placeholder={t('settings.display_name_placeholder')}
              autoComplete='name'
              style={inputStyle}
            />
            <button
              type='button'
              onClick={() => { void submitName() }}
              disabled={busy === 'name' || !fullName.trim() || fullName.trim() === savedName}
              style={buttonStyle}
            >
              {busy === 'name' ? t('settings.saving') : t('settings.save_name')}
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

      <Section title={t('settings.notifications')}>
        <Row label={t('settings.push')} hint={t('settings.push_hint')}>
          {pushState === null ? (
            <p style={{ margin: 0, color: 'var(--muted)' }}>…</p>
          ) : pushState === 'on' ? (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ color: '#22c55e', fontSize: '0.9375rem', marginRight: '0.25rem' }}>✓ {t('settings.push_on')}</span>
              <button type='button' disabled={busy === 'push'} style={buttonStyle}
                onClick={() => { void runPush(sendTestPush, t('settings.push_test_sent')) }}>
                {t('settings.push_test')}
              </button>
              <button type='button' disabled={busy === 'push'} style={buttonStyle}
                onClick={() => { void runPush(disablePush) }}>
                {t('settings.push_disable')}
              </button>
            </div>
          ) : pushState === 'off' ? (
            <button type='button' disabled={busy === 'push'} style={buttonStyle}
              onClick={() => { void runPush(enablePush, t('settings.push_enabled')) }}>
              {busy === 'push' ? t('settings.saving') : t('settings.push_enable')}
            </button>
          ) : (
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.875rem', lineHeight: 1.5 }}>
              {t(`settings.push_${pushState.replace('-', '_')}`)}
            </p>
          )}
        </Row>
      </Section>

      <Section title={t('community.social_links')}>
        <Row label={t('community.social_links')} hint={t('community.social_links_hint')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {socialLinks.map((link, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--orange)', border: '1px solid var(--border)', borderRadius: 12, padding: '0.2rem 0.5rem', flexShrink: 0 }}>
                  {t(`community.social_platform_${link.platform}`)}
                </span>
                <a href={link.url} target='_blank' rel='noreferrer' style={{ color: 'var(--muted)', fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {link.url}
                </a>
                <button type='button' onClick={() => { void removeSocialLink(i) }} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.875rem', flexShrink: 0 }} title={t('community.social_remove')}>
                  ✕
                </button>
              </div>
            ))}

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: socialLinks.length > 0 ? '0.4rem' : 0 }}>
              <select value={newPlatform} onChange={(e) => setNewPlatform(e.target.value as SocialPlatform)} style={inputStyle}>
                <option value='instagram'>{t('community.social_platform_instagram')}</option>
                <option value='facebook'>{t('community.social_platform_facebook')}</option>
                <option value='x'>{t('community.social_platform_x')}</option>
                <option value='autre'>{t('community.social_platform_autre')}</option>
              </select>
              <input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder={t('community.social_url_placeholder')}
                style={{ ...inputStyle, flex: 1, minWidth: 180 }}
              />
              <button type='button' onClick={() => { void addSocialLink() }} disabled={!newUrl.trim()} style={{ ...buttonStyle, opacity: !newUrl.trim() ? 0.6 : 1 }}>
                {t('community.social_add')}
              </button>
            </div>
          </div>
        </Row>
      </Section>

      <Section title={t('settings.privacy')}>
        <Link to='/confidentialite' className="wb-auth-link" style={{ fontSize: '0.8125rem' }}>
          {t('settings.privacy_link')}
        </Link>
      </Section>

      <Section title={t('settings.session')}>
        <Row label={currentEmail} hint={t('settings.logout_hint')}>
          <button
            type='button'
            onClick={() => { void logout() }}
            disabled={busy === 'logout'}
            style={{ ...buttonStyle, alignSelf: 'flex-start' }}
          >
            {t('actions.logout')}
          </button>
        </Row>
      </Section>

      <Section title={t('settings.danger_zone')}>
        <Row label={t('settings.delete_account')} hint={t('settings.delete_account_hint')}>
          <button
            type='button'
            onClick={() => setDeleteModalOpen(true)}
            style={{ ...buttonStyle, background: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 12, alignSelf: 'flex-start' }}
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
    <section className="wb-home-sec">
      <div className="wb-sec"><h2>{title}</h2></div>
      <div className="wb-card wb-set-card">{children}</div>
    </section>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="wb-set-row">
      <span className="wb-set-label">{label}</span>
      {children}
      {hint && <span className="wb-set-hint">{hint}</span>}
    </div>
  )
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type='button' className='wb-chip' aria-pressed={active} onClick={onClick}>
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
      clearWorkoutDraft()
      try { await supabase.auth.signOut() } catch { /* le compte n'existe déjà plus */ }
      try { await clearAuthSessionCookies() } catch { /* idem */ }
      navigate('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'))
      setDeleting(false)
    }
  }

  const hasThirdPartyImpact = (impact?.athletesAffected ?? 0) > 0 || (impact?.communityMembersAffected ?? 0) > 0

  return (
    <div
      role='dialog'
      aria-modal='true'
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', padding: '1rem' }}
    >
      <div style={{ background: 'var(--black)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 12, maxWidth: 480, width: '100%', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
              {impact.communitiesOwned > 0 && <li>{t('settings.delete_impact_communities', { count: impact.communitiesOwned })}</li>}
            </ul>

            {hasThirdPartyImpact && (
              <div style={{ border: '1px solid rgba(239,68,68,0.4)', borderRadius: 12, background: 'rgba(239,68,68,0.08)', padding: '0.75rem', fontSize: '0.8125rem', color: '#ef4444', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {impact.athletesAffected > 0 && <span>{t('settings.delete_impact_athletes', { count: impact.athletesAffected })}</span>}
                {impact.communityMembersAffected > 0 && <span>{t('settings.delete_impact_community_members', { count: impact.communityMembersAffected })}</span>}
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
          <button type='button' onClick={onClose} disabled={deleting} style={{ ...buttonStyle, background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 12 }}>
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
