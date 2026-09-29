import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useCommunityStore } from '../../stores/communityStore'
import type { Community } from '../../types'
import ConfirmButton from '../ui/ConfirmButton'
import EmptyState from '../ui/EmptyState'
import Skeleton from '../ui/Skeleton'
import NavIcon from '../navigation/NavIcon'
import { btnPrimary as actionBtnStyle, btnSecondary as ghostBtnStyle, field as inputStyle, textarea as textareaStyle } from '../../styles/ui'

/**
 * Communautés — ouvertes à la création pour tout compte (voir la migration
 * 029 pour pourquoi : cohérence avec les classes, déjà ouvertes à tous).
 * Coach et athlète partagent cette vue, comme SettingsView : rien ici
 * n'est réservé à un rôle.
 */
export default function CommunitiesView() {
  const { t } = useTranslation('common')
  const { communities, loading, error, fetchCommunities, createCommunity, deleteCommunity, joinCommunity, leaveCommunity } = useCommunityStore()
  const [userId, setUserId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    fetchCommunities()
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [fetchCommunities])

  async function handleToggleMembership(c: Community) {
    setBusyId(c.id)
    try {
      if (c.is_member) await leaveCommunity(c.id)
      else await joinCommunity(c.id)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div style={{ padding: 'var(--page-pad)', minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div>
          <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--orange)', marginBottom: '0.35rem' }}>
            {t('community.tag')}
          </p>
          <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '1.75rem', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.05, letterSpacing: '0.03em', margin: 0 }}>
            {t('community.title')}
          </h1>
          <p style={{ color: 'var(--muted)', marginTop: '0.45rem' }}>{t('community.subtitle')}</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={actionBtnStyle}>
          {t('community.create')}
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: '1rem', padding: '0.65rem 0.9rem', background: 'rgba(255,77,0,0.1)', border: '1px solid rgba(255,77,0,0.3)', color: 'var(--orange)', fontSize: '0.8125rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <Skeleton height={90} lines={3} />
      ) : communities.length === 0 ? (
        <EmptyState
          icon="community"
          title={t('community.empty')}
          hint={t('community.empty_hint')}
          action={<button onClick={() => setShowCreate(true)} style={actionBtnStyle}>{t('community.create')}</button>}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
          {communities.map((c) => (
            <div key={c.id} style={{ border: '1px solid var(--border)', background: 'var(--dark)', padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                <p style={{ fontFamily: 'var(--font-d)', fontSize: '1.0625rem', fontWeight: 800, letterSpacing: '0.02em', textTransform: 'uppercase', margin: 0 }}>
                  {c.name}
                </p>
                {c.created_by === userId && (
                  <ConfirmButton
                    onConfirm={() => deleteCommunity(c.id)}
                    title={t('community.delete')}
                    style={{ ...ghostBtnStyle, fontSize: '0.6875rem', padding: '0.25rem 0.5rem', color: 'rgba(255,77,0,0.8)', borderColor: 'rgba(255,77,0,0.35)', flexShrink: 0 }}
                  >
                    ✕
                  </ConfirmButton>
                )}
              </div>

              {c.description && (
                <p style={{ color: 'var(--muted)', fontSize: '0.8125rem', lineHeight: 1.5, margin: 0 }}>{c.description}</p>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.4rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--muted)', fontSize: '0.8125rem' }}>
                  <NavIcon name="community" size={16} />
                  {t('community.member_count', { count: c.member_count ?? 0 })}
                </span>
                <button
                  onClick={() => { void handleToggleMembership(c) }}
                  disabled={busyId === c.id}
                  style={c.is_member
                    ? { ...ghostBtnStyle, fontSize: '0.75rem', opacity: busyId === c.id ? 0.6 : 1 }
                    : { ...actionBtnStyle, fontSize: '0.75rem', padding: '0.45rem 0.9rem', opacity: busyId === c.id ? 0.6 : 1 }}
                >
                  {busyId === c.id ? '...' : c.is_member ? t('community.leave') : t('community.join')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateCommunityModal
          onClose={() => setShowCreate(false)}
          onCreate={async (data) => {
            await createCommunity(data)
            setShowCreate(false)
          }}
        />
      )}
    </div>
  )
}

function CreateCommunityModal({ onClose, onCreate }: {
  onClose: () => void
  onCreate: (data: { name: string; description: string | null }) => Promise<void>
}) {
  const { t } = useTranslation('common')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    try {
      await onCreate({ name: name.trim(), description: description.trim() || null })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'))
      setLoading(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', padding: '1rem' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--black)', border: '1px solid var(--border)', maxWidth: 420, width: '100%', padding: '1.5rem' }}
      >
        <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '1.375rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 1.25rem' }}>
          {t('community.create')}
        </h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Field label={t('community.field_name')} required>
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus style={inputStyle} />
          </Field>
          <Field label={t('community.field_description')}>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={textareaStyle} />
          </Field>
          {error && <p style={{ color: 'var(--orange)', fontSize: '0.8125rem', margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} style={ghostBtnStyle}>{t('actions.cancel')}</button>
            <button type="submit" disabled={!name.trim() || loading} style={{ ...actionBtnStyle, opacity: !name.trim() || loading ? 0.6 : 1 }}>
              {loading ? '...' : t('actions.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
        {label}{required && ' *'}
      </span>
      {children}
    </label>
  )
}
