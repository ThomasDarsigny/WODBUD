import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { getLocalUser } from '../../lib/currentUser'
import { useCommunityStore } from '../../stores/communityStore'
import type { Community } from '../../types'
import ConfirmButton from '../ui/ConfirmButton'
import EmptyState from '../ui/EmptyState'
import Skeleton from '../ui/Skeleton'
import NavIcon from '../navigation/NavIcon'
import Modal from '../ui/Modal'
import Field from '../ui/Field'

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
  // « + Nouvelle communauté » depuis Groupes : ?new=1 ouvre la création.
  const [params, setParams] = useSearchParams()
  const wantNew = params.get('new') === '1'
  const [newHandled, setNewHandled] = useState(false)
  if (wantNew && !newHandled) {
    setNewHandled(true)
    setShowCreate(true)
  }
  useEffect(() => {
    if (wantNew && newHandled) setParams({}, { replace: true })
  }, [wantNew, newHandled, setParams])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const basePath = useLocation().pathname.startsWith('/athlete') ? '/athlete' : '/dashboard'
  const open = (id: string) => navigate(`${basePath}/communities/${id}`)

  // Les miennes d'abord, puis par nom ; la recherche porte sur le nom et la description.
  const visible = useMemo(() => {
    const q = search.trim().toLocaleLowerCase()
    return communities
      .filter((c) => !q || c.name.toLocaleLowerCase().includes(q) || (c.description ?? '').toLocaleLowerCase().includes(q))
      .sort((a, b) => Number(b.is_member) - Number(a.is_member))
  }, [communities, search])

  useEffect(() => {
    fetchCommunities()
    getLocalUser().then(({ data }) => setUserId(data.user?.id ?? null))
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
    <div className="wb-commu-page">
      <header className="wb-ph wb-commu-head">
        <div>
          <p className="wb-ph-tag">{t('community.tag')}</p>
          <h1 className="wb-ph-h1">{t('community.title')}</h1>
          <p className="wb-ph-sub">{t('community.subtitle')}</p>
        </div>
        <button type="button" onClick={() => setShowCreate(true)} className="wb-btn wb-btn--primary">
          {t('community.create')}
        </button>
      </header>

      {error && <div className="wb-rec-error wb-commu-error" role="alert">{error}</div>}

      {communities.length > 0 && (
        <input
          type="search"
          className="wb-input wb-commu-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('community.search_placeholder')}
          aria-label={t('community.search_placeholder')}
        />
      )}

      {loading ? (
        <Skeleton height={90} lines={3} />
      ) : communities.length === 0 ? (
        <EmptyState
          icon="community"
          title={t('community.empty')}
          hint={t('community.empty_hint')}
          action={<button type="button" onClick={() => setShowCreate(true)} className="wb-btn wb-btn--primary">{t('community.create')}</button>}
        />
      ) : (
        <div className="wb-commu-grid">
          {visible.length === 0 && <p className="wb-commu-small">{t('community.search_empty')}</p>}
          {visible.map((c) => (
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              aria-label={c.name}
              onClick={() => open(c.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(c.id) } }}
              className="wb-card wb-commu-card"
            >
              <div className="wb-commu-card-top">
                <p className="wb-commu-card-name">{c.name}</p>
                {c.created_by === userId && (
                  <span onClick={(e) => e.stopPropagation()} className="wb-contents">
                    <ConfirmButton
                      onConfirm={() => deleteCommunity(c.id)}
                      title={t('community.delete')}
                      ariaLabel={`${t('community.delete')} — ${c.name}`}
                      className="wb-btn wb-btn--danger wb-btn--sm"
                    >
                      ✕
                    </ConfirmButton>
                  </span>
                )}
              </div>

              {c.description && <p className="wb-commu-card-desc">{c.description}</p>}

              <div className="wb-commu-card-foot">
                <span className="wb-commu-card-count">
                  <NavIcon name="community" size={16} />
                  {t('community.member_count', { count: c.member_count ?? 0 })}
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); void handleToggleMembership(c) }}
                  disabled={busyId === c.id}
                  className={`wb-btn wb-btn--sm ${c.is_member ? 'wb-btn--ghost' : 'wb-btn--primary'}`}
                >
                  {busyId === c.id ? '…' : c.is_member ? t('community.leave') : t('community.join')}
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
            const created = await createCommunity(data)
            setShowCreate(false)
            open(created.id)
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
    <Modal title={t('community.create')} onClose={onClose}>
      <form onSubmit={handleSubmit} className="wb-form">
        <Field label={t('community.field_name')} required>
          <input className="wb-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
        </Field>
        <Field label={t('community.field_description')}>
          <textarea className="wb-input wb-support-text" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </Field>
        {error && <p className="wb-rec-error" role="alert">{error}</p>}
        <div className="wb-form-actions">
          <button type="button" onClick={onClose} className="wb-btn wb-btn--ghost">{t('actions.cancel')}</button>
          <button type="submit" disabled={!name.trim() || loading} className="wb-btn wb-btn--primary">
            {loading ? '…' : t('actions.save')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
