import { useEffect, useState, useMemo } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useTranslation } from 'react-i18next'
import { useClassStore } from '../../stores/classStore'
import { useExerciseStore } from '../../stores/exerciseStore'
import type { Class, VoteSession } from '../../types'
import VoteResultsBars from '../vote/VoteResultsBars'
import ConfirmButton from '../ui/ConfirmButton'
import EmptyState from '../ui/EmptyState'
import NavIcon from '../navigation/NavIcon'
import { CATEGORY_I18N_KEYS, MUSCLE_GROUP_I18N_KEYS } from '../../types'

const BASE_URL = window.location.origin

export default function ClassesView() {
  const { t } = useTranslation(['common', 'exercises'])
  const { classes, members, voteSessions, voteResults, loading, fetchClasses, createClass, deleteClass, fetchMembers, removeMember, fetchVoteSessions, createVoteSession, closeVoteSession, deleteVoteSession, fetchVoteResults } = useClassStore()
  const { exercises, fetchExercises } = useExerciseStore()

  const [showCreateClass, setShowCreateClass] = useState(false)
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [showVoteModal, setShowVoteModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'members' | 'votes'>('members')

  useEffect(() => { fetchClasses() }, [fetchClasses])
  useEffect(() => { fetchExercises() }, [fetchExercises])

  useEffect(() => {
    if (selectedClass) {
      fetchMembers(selectedClass.id)
      fetchVoteSessions(selectedClass.id)
    }
  }, [selectedClass, fetchMembers, fetchVoteSessions])

  const inviteUrl = selectedClass ? `${BASE_URL}/join/${selectedClass.invite_token}` : ''

  function handleSelectClass(cls: Class) {
    setSelectedClass(cls)
    setShowQR(false)
    setActiveTab('members')
  }

  async function handleDeleteClass(cls: Class) {
    await deleteClass(cls.id)
    if (selectedClass?.id === cls.id) setSelectedClass(null)
  }

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      {/* Left panel — class list */}
      <div style={{
        width: 280,
        flexShrink: 0,
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--dark)'
      }}>
        <div style={{ padding: '1.5rem 1.25rem 1rem', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.68rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--orange)', marginBottom: '0.3rem' }}>
            {t('classes.tag')}
          </p>
          <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '1.4rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.03em', margin: 0 }}>
            {t('classes.title')}
          </h2>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && classes.length === 0 ? (
            <div style={{ padding: '2rem 1.25rem', color: 'var(--muted)', fontFamily: 'var(--font-d)', fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {t('status.loading')}
            </div>
          ) : classes.length === 0 ? (
            <div style={{ padding: '1rem' }}>
              <EmptyState
                compact
                icon="classes"
                title={t('classes.empty')}
                hint={t('classes.empty_hint')}
              />
            </div>
          ) : (
            classes.map((cls) => {
              const active = selectedClass?.id === cls.id
              return (
                <button
                  key={cls.id}
                  onClick={() => handleSelectClass(cls)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.85rem 1.25rem',
                    background: active ? 'rgba(255,77,0,0.08)' : 'transparent',
                    borderLeft: `2px solid ${active ? 'var(--orange)' : 'transparent'}`,
                    border: 'none',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.88rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: active ? 'var(--white)' : 'var(--muted)', margin: 0 }}>
                    {cls.name}
                  </p>
                  {cls.schedule && (
                    <p style={{ fontFamily: 'var(--font-b)', fontSize: '0.75rem', color: 'var(--muted)', margin: '0.2rem 0 0', opacity: 0.7 }}>
                      {cls.schedule}
                    </p>
                  )}
                </button>
              )
            })
          )}
        </div>

        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => setShowCreateClass(true)}
            style={{ width: '100%', fontFamily: 'var(--font-d)', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--black)', background: 'var(--orange)', border: 'none', padding: '0.65rem', cursor: 'pointer' }}
          >
            + {t('classes.create')}
          </button>
        </div>
      </div>

      {/* Right panel — class detail */}
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--page-pad)' }}>
        {!selectedClass ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', gap: '1rem' }}>
            <span style={{ opacity: 0.3, display: 'flex' }}><NavIcon name="classes" size={46} /></span>
            <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.9rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{t('classes.select_prompt')}</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '2rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.03em', margin: 0 }}>
                  {selectedClass.name}
                </h1>
                {selectedClass.schedule && (
                  <p style={{ color: 'var(--muted)', marginTop: '0.25rem', fontSize: '0.9rem' }}>{selectedClass.schedule}</p>
                )}
                {selectedClass.description && (
                  <p style={{ color: 'var(--muted)', marginTop: '0.25rem', fontSize: '0.88rem' }}>{selectedClass.description}</p>
                )}
              </div>
              <ConfirmButton onConfirm={() => handleDeleteClass(selectedClass)} style={ghostBtnStyle}>
                {t('actions.delete')}
              </ConfirmButton>
            </div>

            {/* Invite section */}
            <div style={{ background: 'var(--dark)', border: '1px solid var(--border)', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--orange)', marginBottom: '0.75rem' }}>
                {t('classes.invite_label')}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.75rem' }}>
                <code style={{ flex: 1, minWidth: 0, background: 'var(--black)', border: '1px solid var(--border)', padding: '0.5rem 0.75rem', fontSize: '0.78rem', color: 'var(--muted)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {inviteUrl}
                </code>
                <button onClick={() => navigator.clipboard.writeText(inviteUrl)} style={actionBtnStyle}>
                  {t('classes.copy_link')}
                </button>
                <button onClick={() => setShowQR(!showQR)} style={ghostBtnStyle}>
                  {showQR ? t('classes.hide_qr') : t('classes.show_qr')}
                </button>
              </div>
              {showQR && (
                <div style={{ display: 'inline-block', background: '#fff', padding: '0.75rem' }}>
                  <QRCodeSVG value={inviteUrl} size={160} />
                </div>
              )}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border)', marginBottom: '1.25rem' }}>
              {(['members', 'votes'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    fontFamily: 'var(--font-d)',
                    fontSize: '0.8rem',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    padding: '0.65rem 1.25rem',
                    border: 'none',
                    borderBottom: `2px solid ${activeTab === tab ? 'var(--orange)' : 'transparent'}`,
                    background: 'transparent',
                    color: activeTab === tab ? 'var(--white)' : 'var(--muted)',
                    cursor: 'pointer',
                    marginBottom: '-1px'
                  }}
                >
                  {t(`classes.tab_${tab}`)}
                </button>
              ))}
            </div>

            {/* Members tab */}
            {activeTab === 'members' && (
              <MembersTab
                classId={selectedClass.id}
                members={members[selectedClass.id] ?? []}
                onRemove={(athleteId) => removeMember(selectedClass.id, athleteId)}
              />
            )}

            {/* Votes tab */}
            {activeTab === 'votes' && (
              <VotesTab
                sessions={voteSessions[selectedClass.id] ?? []}
                voteResults={voteResults}
                onCreateVote={() => setShowVoteModal(true)}
                onCloseSession={closeVoteSession}
                onDeleteSession={deleteVoteSession}
                onFetchResults={fetchVoteResults}
              />
            )}
          </>
        )}
      </div>

      {/* Modal: create class */}
      {showCreateClass && (
        <CreateClassModal
          onClose={() => setShowCreateClass(false)}
          onCreate={async (data) => {
            const cls = await createClass(data)
            setShowCreateClass(false)
            setSelectedClass(cls)
          }}
        />
      )}

      {/* Modal: create vote session */}
      {showVoteModal && selectedClass && (
        <CreateVoteModal
          classId={selectedClass.id}
          exercises={exercises}
          onClose={() => setShowVoteModal(false)}
          onCreate={async (data) => {
            await createVoteSession(data)
            setShowVoteModal(false)
            setActiveTab('votes')
          }}
        />
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MembersTab({ classId, members, onRemove }: {
  classId: string
  members: import('../../types').ClassMember[]
  onRemove: (athleteId: string) => Promise<void>
}) {
  const { t } = useTranslation('common')
  void classId

  if (members.length === 0) {
    return (
      <EmptyState
        compact
        icon="classes"
        title={t('classes.no_members')}
        hint={t('classes.no_members_hint')}
      />
    )
  }

  return (
    <div style={{ border: '1px solid var(--border)', background: 'var(--dark)' }}>
      {members.map((m) => (
        <div key={m.athlete_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-d)', fontSize: '0.8rem', color: 'var(--muted)' }}>
              {(m.profile?.full_name?.[0] ?? '?').toUpperCase()}
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.85rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--white)', margin: 0 }}>
                {m.profile?.full_name ?? t('classes.unknown_athlete')}
              </p>
              <p style={{ color: 'var(--muted)', fontSize: '0.72rem', margin: 0 }}>
                {new Date(m.joined_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button onClick={() => onRemove(m.athlete_id)} style={{ ...ghostBtnStyle, fontSize: '0.65rem' }}>
            {t('actions.delete')}
          </button>
        </div>
      ))}
    </div>
  )
}

const VOTES_VISIBLE_DEFAULT = 3

function VotesTab({ sessions, voteResults, onCreateVote, onCloseSession, onDeleteSession, onFetchResults }: {
  sessions: VoteSession[]
  voteResults: Record<string, import('../../types').VoteResult[]>
  onCreateVote: () => void
  onCloseSession: (id: string) => Promise<void>
  onDeleteSession: (id: string) => Promise<void>
  onFetchResults: (sessionId: string) => Promise<void>
}) {
  const { t } = useTranslation(['common', 'exercises'])
  const [showAll, setShowAll] = useState(false)

  // Auto-fetch results for all visible sessions on mount
  useEffect(() => {
    for (const s of sessions) {
      if (!voteResults[s.id]) onFetchResults(s.id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions])

  const visibleSessions = showAll ? sessions : sessions.slice(0, VOTES_VISIBLE_DEFAULT)
  const hiddenCount = sessions.length - VOTES_VISIBLE_DEFAULT

  async function handleDelete(session: VoteSession) {
    await onDeleteSession(session.id)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button onClick={onCreateVote} style={actionBtnStyle} title={t('classes.create_vote')}>
          + {t('classes.create_vote')}
        </button>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          compact
          icon="vote"
          title={t('classes.no_votes')}
          hint={t('classes.no_votes_hint')}
        />
      ) : (
        <>
          {visibleSessions.map((session) => {
            const results = voteResults[session.id] ?? []
            const totalVotes = results.reduce((sum, r) => sum + r.votes, 0)

            return (
              <div key={session.id} style={{ border: '1px solid var(--border)', background: 'var(--dark)', padding: '1rem', marginBottom: '0.75rem' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--white)', margin: 0 }}>
                        {session.title}
                      </p>
                      <span style={{
                        fontFamily: 'var(--font-d)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase',
                        color: session.status === 'open' ? '#22c55e' : 'var(--muted)',
                        border: `1px solid ${session.status === 'open' ? 'rgba(34,197,94,0.35)' : 'var(--border)'}`,
                        background: session.status === 'open' ? 'rgba(34,197,94,0.08)' : 'transparent',
                        padding: '0.1rem 0.4rem'
                      }}>
                        {session.status === 'open' ? t('classes.vote_open') : t('classes.vote_closed')}
                      </span>
                      {totalVotes > 0 && (
                        <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', padding: '0.1rem 0.4rem' }}>
                          {totalVotes} {t('classes.votes_total')}
                        </span>
                      )}
                    </div>
                    {session.deadline && (
                      <p style={{ color: 'var(--muted)', fontSize: '0.75rem', margin: '0.2rem 0 0' }}>
                        {t('classes.deadline')}: {new Date(session.deadline).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      onClick={() => onFetchResults(session.id)}
                      title="Rafraîchir les résultats"
                      style={{ ...ghostBtnStyle, fontSize: '0.62rem', padding: '0.35rem 0.65rem' }}
                    >
                      ↻
                    </button>
                    {session.status === 'open' && (
                      <button
                        onClick={() => onCloseSession(session.id)}
                        title="Clôturer ce vote — les athlètes ne pourront plus voter"
                        style={{ ...ghostBtnStyle, fontSize: '0.65rem' }}
                      >
                        {t('classes.close_vote')}
                      </button>
                    )}
                    <ConfirmButton
                      onConfirm={() => handleDelete(session)}
                      title={t('classes.delete_vote')}
                      style={{ ...ghostBtnStyle, fontSize: '0.65rem', color: 'rgba(255,77,0,0.8)', borderColor: 'rgba(255,77,0,0.35)' }}
                    >
                      ✕
                    </ConfirmButton>
                  </div>
                </div>

                {/* Results bars */}
                <VoteResultsBars results={results} emptyLabel={t('classes.no_votes_yet')} />
              </div>
            )
          })}

          {!showAll && hiddenCount > 0 && (
            <button
              onClick={() => setShowAll(true)}
              style={{ ...ghostBtnStyle, width: '100%', justifyContent: 'center', display: 'flex', marginTop: '0.25rem' }}
            >
              ↓ Voir {hiddenCount} vote{hiddenCount > 1 ? 's' : ''} de plus
            </button>
          )}
          {showAll && sessions.length > VOTES_VISIBLE_DEFAULT && (
            <button
              onClick={() => setShowAll(false)}
              style={{ ...ghostBtnStyle, width: '100%', justifyContent: 'center', display: 'flex', marginTop: '0.25rem' }}
            >
              ↑ Réduire
            </button>
          )}
        </>
      )}
    </div>
  )
}

function CreateClassModal({ onClose, onCreate }: {
  onClose: () => void
  onCreate: (data: import('../../types').ClassInsert) => Promise<void>
}) {
  const { t } = useTranslation('common')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [schedule, setSchedule] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    try {
      await onCreate({ name: name.trim(), description: description.trim() || null, schedule: schedule.trim() || null })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'))
      setLoading(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '1.4rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 1.5rem' }}>
        {t('classes.create')}
      </h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Field label={t('classes.field_name')} required>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus style={inputStyle} />
        </Field>
        <Field label={t('classes.field_schedule')}>
          <input value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder={t('classes.schedule_placeholder')} style={inputStyle} />
        </Field>
        <Field label={t('classes.field_description')}>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
        </Field>
        {error && <p style={{ color: 'var(--orange)', fontSize: '0.82rem', margin: 0 }}>{error}</p>}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button type="button" onClick={onClose} style={ghostBtnStyle}>{t('actions.cancel')}</button>
          <button type="submit" disabled={!name.trim() || loading} style={{ ...actionBtnStyle, opacity: !name.trim() || loading ? 0.6 : 1 }}>
            {loading ? '...' : t('actions.save')}
          </button>
        </div>
      </form>
    </ModalOverlay>
  )
}

function CreateVoteModal({ classId, exercises, onClose, onCreate }: {
  classId: string
  exercises: import('../../types').Exercise[]
  onClose: () => void
  onCreate: (data: import('../../types').VoteSessionInsert) => Promise<void>
}) {
  const { t } = useTranslation(['common', 'exercises'])
  const [title, setTitle] = useState('')
  const [deadline, setDeadline] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return exercises.filter((e) => !q || e.name.toLowerCase().includes(q))
  }, [exercises, search])

  function toggleExercise(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || selected.size === 0 || loading) return
    setLoading(true)
    setError(null)
    try {
      await onCreate({
        class_id: classId,
        title: title.trim(),
        exercise_options: Array.from(selected),
        deadline: deadline || null
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose} wide>
      <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '1.4rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 1.25rem' }}>
        {t('classes.create_vote')}
      </h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', alignItems: 'end' }}>
          <Field label={t('classes.vote_title')} required>
            <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus style={inputStyle} />
          </Field>
          <Field label={t('classes.vote_deadline')}>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} style={inputStyle} />
          </Field>
        </div>

        <div>
          <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.68rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.5rem' }}>
            {t('classes.pick_exercises')} {selected.size > 0 && <span style={{ color: 'var(--orange)' }}>({selected.size})</span>}
          </p>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search', { ns: 'exercises' })}
            style={{ ...inputStyle, marginBottom: '0.5rem' }}
          />
          <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--border)', background: 'var(--black)' }}>
            {filtered.map((ex) => {
              const isSelected = selected.has(ex.id)
              return (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => toggleExercise(ex.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.6rem 0.9rem',
                    borderBottom: '1px solid var(--border)',
                    background: isSelected ? 'rgba(255,77,0,0.08)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.1s'
                  }}
                >
                  <span style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${isSelected ? 'var(--orange)' : 'var(--border)'}`, background: isSelected ? 'var(--orange)' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: 'var(--black)' }}>
                    {isSelected && 'OK'}
                  </span>
                  <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.85rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: isSelected ? 'var(--white)' : 'var(--muted)' }}>
                    {ex.name}
                  </span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-d)', fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--orange)', opacity: 0.7 }}>
                    {t(CATEGORY_I18N_KEYS[ex.category], { ns: 'common' })}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {error && <p style={{ color: 'var(--orange)', fontSize: '0.82rem', margin: 0 }}>{error}</p>}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={ghostBtnStyle}>{t('actions.cancel')}</button>
          <button type="submit" disabled={!title.trim() || selected.size === 0 || loading} style={{ ...actionBtnStyle, opacity: !title.trim() || selected.size === 0 || loading ? 0.6 : 1 }}>
            {loading ? '...' : t('classes.launch_vote')}
          </button>
        </div>
      </form>
    </ModalOverlay>
  )
}

function ModalOverlay({ children, onClose, wide = false }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}
    >
      <div style={{ background: 'var(--dark)', border: '1px solid var(--border)', padding: 'var(--page-pad)', width: '100%', maxWidth: wide ? 640 : 460, maxHeight: '90vh', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <label style={{ fontFamily: 'var(--font-d)', fontSize: '0.68rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)' }}>
        {label}{required && <span style={{ color: 'var(--orange)' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const actionBtnStyle = {
  fontFamily: 'var(--font-d)',
  fontSize: '0.75rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--black)',
  background: 'var(--orange)',
  border: 'none',
  padding: '0.5rem 0.9rem',
  cursor: 'pointer',
  whiteSpace: 'nowrap'
} as const

const ghostBtnStyle = {
  fontFamily: 'var(--font-d)',
  fontSize: '0.75rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  background: 'transparent',
  border: '1px solid var(--border)',
  padding: '0.5rem 0.9rem',
  cursor: 'pointer',
  whiteSpace: 'nowrap'
} as const

const inputStyle = {
  width: '100%',
  background: 'var(--black)',
  border: '1px solid var(--border)',
  color: 'var(--white)',
  padding: '0.6rem 0.8rem',
  fontFamily: 'var(--font-b)',
  fontSize: '0.9rem',
  outline: 'none',
  boxSizing: 'border-box'
} as const

// Imported for MUSCLE_GROUP_I18N_KEYS usage in CreateVoteModal
void MUSCLE_GROUP_I18N_KEYS
