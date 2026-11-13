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
import { CATEGORY_I18N_KEYS } from '../../types'
import Skeleton from '../ui/Skeleton'
import ClassLeaderboard from '../rank/ClassLeaderboard'
import ClassPlanningTab from './ClassPlanningTab'
import { isVoteSessionOpen, voteSessionKind } from '../../lib/voteSessions'
import ClassFollowup from './ClassFollowup'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { useSearchParams } from 'react-router-dom'
import Modal from '../ui/Modal'
import Field from '../ui/Field'
import CenterClassesList from '../center/CenterClassesList'
import { shareLink } from '../../lib/shareLink'
import InviteByEmail from '../invite/InviteByEmail'
import ClassScheduleEditor from './ClassScheduleEditor'
import ClassAttendance from './ClassAttendance'
import { useClassSlotStore } from '../../stores/classSlotStore'
import { summarizeSlots } from '../../lib/classSlots'

const BASE_URL = window.location.origin

export default function ClassesView() {
  const { t, i18n } = useTranslation(['common', 'exercises'])
  const { byClass: slotsByClass, fetchSlots } = useClassSlotStore()
  const { classes, members, voteSessions, voteResults, loading, fetchClasses, createClass, deleteClass, fetchMembers, removeMember, fetchVoteSessions, createVoteSession, closeVoteSession, deleteVoteSession, fetchVoteResults } = useClassStore()
  const { exercises, fetchExercises } = useExerciseStore()

  const [showCreateClass, setShowCreateClass] = useState(false)
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showVoteModal, setShowVoteModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'followup' | 'members' | 'planning' | 'votes' | 'leaderboard'>('followup')
  // Téléphone : la liste OU le cours, jamais les deux côte à côte.
  const isMobile = useIsMobile()
  const showList = !isMobile || !selectedClass
  const showDetail = !isMobile || Boolean(selectedClass)

  useEffect(() => { fetchClasses() }, [fetchClasses])
  const classIds = classes.map((c) => c.id).join(',')
  useEffect(() => { if (classIds) void fetchSlots(classIds.split(',')) }, [classIds, fetchSlots])
  const scheduleOf = (cls: Class) => {
    const slots = slotsByClass[cls.id] ?? []
    return slots.length ? summarizeSlots(slots, i18n.language) : cls.schedule
  }

  // Lien direct depuis l'accueil : /dashboard/classes?c=<id>.
  // La sélection se fait au rendu (pas d'effet en cascade) ; l'URL est
  // nettoyée ensuite, pour que « retour » ne rouvre pas le même cours.
  const [params, setParams] = useSearchParams()
  const wanted = params.get('c')
  const wantedTab = params.get('tab')
  const [linkHandled, setLinkHandled] = useState<string | null>(null)
  if (wanted && wanted !== linkHandled && classes.length > 0) {
    setLinkHandled(wanted)
    const found = classes.find((c) => c.id === wanted)
    const tabs = ['followup', 'members', 'planning', 'votes', 'leaderboard'] as const
    const tab = tabs.find((x) => x === wantedTab) ?? 'followup'
    if (found) { setSelectedClass(found); setActiveTab(tab) }
  }
  useEffect(() => {
    if (wanted && wanted === linkHandled) setParams({}, { replace: true })
  }, [wanted, linkHandled, setParams])
  // « + Nouveau cours » depuis Groupes : /dashboard/classes?new=1 ouvre la création.
  const wantNew = params.get('new') === '1'
  const [newHandled, setNewHandled] = useState(false)
  if (wantNew && !newHandled) {
    setNewHandled(true)
    setShowCreateClass(true)
  }
  useEffect(() => {
    if (wantNew && newHandled) setParams({}, { replace: true })
  }, [wantNew, newHandled, setParams])
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
    setActiveTab('followup')
  }

  async function handleDeleteClass(cls: Class) {
    await deleteClass(cls.id)
    if (selectedClass?.id === cls.id) setSelectedClass(null)
  }

  return (
    <div className="wb-classes">
      {/* Liste des cours */}
      {showList && (
      <div className="wb-classes-list">
        <div className="wb-classes-list-head">
          <p className="wb-ph-tag">{t('classes.tag')}</p>
          <h2 className="wb-classes-list-title">{t('classes.title')}</h2>
        </div>

        <div className="wb-classes-scroll">
          {loading && classes.length === 0 ? (
            <div className="wb-classes-pad"><Skeleton height={44} lines={4} /></div>
          ) : classes.length === 0 ? (
            <div className="wb-classes-pad">
              <EmptyState compact icon="classes" title={t('classes.empty')} hint={t('classes.empty_hint')} />
            </div>
          ) : (
            classes.map((cls) => {
              const active = selectedClass?.id === cls.id
              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => handleSelectClass(cls)}
                  className={`wb-classes-item${active ? ' is-active' : ''}`}
                  aria-current={active ? 'true' : undefined}
                >
                  <span className="wb-classes-item-name">{cls.name}</span>
                  {scheduleOf(cls) && <span className="wb-classes-item-sub">{scheduleOf(cls)}</span>}
                </button>
              )
            })
          )}
          <CenterClassesList />
        </div>

        <div className="wb-classes-foot">
          <button type="button" onClick={() => setShowCreateClass(true)} className="wb-btn wb-btn--primary wb-btn--block">
            + {t('classes.create')}
          </button>
        </div>
      </div>
      )}

      {/* Fiche du cours */}
      {showDetail && (
      <div className="wb-classes-detail">
        {isMobile && selectedClass && (
          <button type="button" className="wb-auth-link wb-classes-back" onClick={() => setSelectedClass(null)}>
            ‹ {t('classes.title')}
          </button>
        )}
        {!selectedClass ? (
          <div className="wb-classes-placeholder">
            <span className="wb-classes-placeholder-icon"><NavIcon name="classes" size={46} /></span>
            <p>{t('classes.select_prompt')}</p>
          </div>
        ) : (
          <>
            <div className="wb-classes-head">
              <div>
                <h1 className="wb-classes-title">{selectedClass.name}</h1>
                {selectedClass.description && <p className="wb-classes-desc">{selectedClass.description}</p>}
              </div>
              <div className="wb-classes-head-actions">
                <a href={`/tv/${selectedClass.id}`} target="_blank" rel="noopener" className="wb-btn wb-btn--secondary wb-btn--sm" title={t('tv.open_hint')}>
                  {t('tv.open')}
                </a>
                <ConfirmButton onConfirm={() => handleDeleteClass(selectedClass)} className="wb-btn wb-btn--ghost wb-btn--sm">
                  {t('actions.delete')}
                </ConfirmButton>
              </div>
            </div>

            <ClassScheduleEditor key={`sched-${selectedClass.id}`} classId={selectedClass.id} legacyText={selectedClass.schedule} />

            {/* Invitation */}
            <section className="wb-invite" aria-labelledby="class-invite-label">
              <p id="class-invite-label" className="wb-invite-label">{t('classes.invite_label')}</p>
              <div className="wb-invite-row">
                <code className="wb-invite-url">{inviteUrl}</code>
                <button
                  type="button"
                  className="wb-btn wb-btn--primary wb-btn--sm"
                  onClick={async () => {
                    const outcome = await shareLink({ title: selectedClass.name, text: t('classes.invite_text', { name: selectedClass.name }), url: inviteUrl })
                    if (outcome === 'copied') { setCopied(true); setTimeout(() => setCopied(false), 2500) }
                  }}
                >
                  {copied ? `✓ ${t('community.invite_copied')}` : t('classes.invite')}
                </button>
                <button
                  type="button"
                  className="wb-btn wb-btn--ghost wb-btn--sm"
                  onClick={() => { void navigator.clipboard.writeText(inviteUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500) }).catch(() => {}) }}
                >
                  {t('classes.copy_link')}
                </button>
                <button type="button" className="wb-btn wb-btn--ghost wb-btn--sm" aria-expanded={showQR} onClick={() => setShowQR(!showQR)}>
                  {showQR ? t('classes.hide_qr') : t('classes.show_qr')}
                </button>
              </div>
              {showQR && (
                <div className="wb-invite-qr">
                  <QRCodeSVG value={inviteUrl} size={160} />
                </div>
              )}
              <InviteByEmail key={selectedClass.id} kind="class" targetId={selectedClass.id} />
            </section>
            {/* Tabs */}
            {/* Cinq onglets en puces : elles défilent sur téléphone plutôt que de déborder. */}
            <div className="wb-chips wb-class-tabs" role="tablist" aria-label={t('classes.title')}>
              {(['followup', 'members', 'planning', 'leaderboard', 'votes'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  className={`wb-chip${activeTab === tab ? ' is-on' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {t(`classes.tab_${tab}`)}
                </button>
              ))}
            </div>

            {activeTab === 'followup' && (
              <>
                <ClassAttendance key={`att-${selectedClass.id}`} classId={selectedClass.id} />
                <ClassFollowup classId={selectedClass.id} />
              </>
            )}

            {/* Members tab */}
            {activeTab === 'members' && (
              <MembersTab
                classId={selectedClass.id}
                members={members[selectedClass.id] ?? []}
                onRemove={(athleteId) => removeMember(selectedClass.id, athleteId)}
              />
            )}

            {activeTab === 'planning' && (
              <ClassPlanningTab classId={selectedClass.id} />
            )}

            {/* Classement — la donnée était déjà lisible via la policy
                profiles_select_coach_reads_members, rien ne l'affichait. */}
            {activeTab === 'leaderboard' && (
              <ClassLeaderboard classId={selectedClass.id} />
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
      )}

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
    <ul className="wb-members">
      {members.map((m) => (
        <li key={m.athlete_id} className="wb-member-row">
          <span className="wb-member-avatar" aria-hidden="true">{(m.profile?.full_name?.[0] ?? '?').toUpperCase()}</span>
          <span className="wb-member-main">
            <strong>{m.profile?.full_name ?? t('classes.unknown_athlete')}</strong>
            <span>{new Date(m.joined_at).toLocaleDateString()}</span>
          </span>
          <button type="button" onClick={() => onRemove(m.athlete_id)} className="wb-btn wb-btn--ghost wb-btn--sm">
            {t('actions.delete')}
          </button>
        </li>
      ))}
    </ul>
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
      <div className="wb-votes-toolbar">
        <button type="button" onClick={onCreateVote} className="wb-btn wb-btn--primary wb-btn--sm">
          + {t('classes.create_vote')}
        </button>
      </div>

      {sessions.length === 0 ? (
        <EmptyState compact icon="vote" title={t('classes.no_votes')} hint={t('classes.no_votes_hint')} />
      ) : (
        <>
          {visibleSessions.map((session) => {
            const results = voteResults[session.id] ?? []
            const totalVotes = results.reduce((sum, r) => sum + r.votes, 0)
            const open = isVoteSessionOpen(session)
            const kind = voteSessionKind(session)

            return (
              <article key={session.id} className="wb-vote-session">
                <div className="wb-vote-session-head">
                  <div>
                    <div className="wb-vote-session-title">
                      <strong>{session.title}</strong>
                      <span className={`wb-vote-status${open ? ' is-open' : ''}`}>
                        {kind === 'open' ? t('classes.vote_open') : kind === 'expired' ? t('classes.vote_expired') : t('classes.vote_closed')}
                      </span>
                      {totalVotes > 0 && <span className="wb-vote-total">{totalVotes} {t('classes.votes_total')}</span>}
                    </div>
                    {session.deadline && (
                      <p className="wb-vote-session-deadline">
                        {t('classes.deadline')}: {new Date(session.deadline).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="wb-vote-session-actions">
                    <button type="button" onClick={() => onFetchResults(session.id)} title={t('classes.vote_refresh')} aria-label={t('classes.vote_refresh')} className="wb-btn wb-btn--ghost wb-btn--sm">
                      ↻
                    </button>
                    {open && (
                      <button type="button" onClick={() => onCloseSession(session.id)} title={t('classes.vote_close_hint')} className="wb-btn wb-btn--ghost wb-btn--sm">
                        {t('classes.close_vote')}
                      </button>
                    )}
                    <ConfirmButton onConfirm={() => handleDelete(session)} title={t('classes.delete_vote')} className="wb-btn wb-btn--danger wb-btn--sm">
                      ✕
                    </ConfirmButton>
                  </div>
                </div>

                <VoteResultsBars results={results} emptyLabel={t('classes.no_votes_yet')} />
              </article>
            )
          })}

          {!showAll && hiddenCount > 0 && (
            <button type="button" onClick={() => setShowAll(true)} className="wb-btn wb-btn--ghost wb-btn--block">
              ↓ {t('classes.votes_more', { count: hiddenCount })}
            </button>
          )}
          {showAll && sessions.length > VOTES_VISIBLE_DEFAULT && (
            <button type="button" onClick={() => setShowAll(false)} className="wb-btn wb-btn--ghost wb-btn--block">
              ↑ {t('classes.votes_less')}
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
    <Modal title={t('classes.create')} onClose={onClose}>
      <form onSubmit={handleSubmit} className="wb-form">
        <Field label={t('classes.field_name')} required>
          <input className="wb-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
        </Field>
        <Field label={t('classes.field_schedule')} hint={t('classes.field_schedule_hint')}>
          <input className="wb-input" value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder={t('classes.schedule_placeholder')} />
        </Field>
        <Field label={t('classes.field_description')}>
          <textarea className="wb-input wb-support-text" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
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
    <Modal title={t('classes.create_vote')} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="wb-form">
        <div className="wb-vote-form-row">
          <Field label={t('classes.vote_title')} required>
            <input className="wb-input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus required />
          </Field>
          <Field label={t('classes.vote_deadline')}>
            <input className="wb-input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </Field>
        </div>

        <fieldset className="wb-pick">
          <legend className="wb-field-label">
            {t('classes.pick_exercises')} {selected.size > 0 && <span className="wb-pick-count">({selected.size})</span>}
          </legend>
          <input
            className="wb-input"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search', { ns: 'exercises' })}
            aria-label={t('search', { ns: 'exercises' })}
          />
          <div className="wb-pick-list">
            {filtered.map((ex) => {
              const isSelected = selected.has(ex.id)
              return (
                <button key={ex.id} type="button" onClick={() => toggleExercise(ex.id)} className={`wb-pick-item${isSelected ? ' is-on' : ''}`} aria-pressed={isSelected}>
                  <span className="wb-pick-check" aria-hidden="true">{isSelected && '✓'}</span>
                  <span className="wb-pick-name">{ex.name}</span>
                  <span className="wb-pick-cat">{t(CATEGORY_I18N_KEYS[ex.category], { ns: 'common' })}</span>
                </button>
              )
            })}
          </div>
        </fieldset>

        {error && <p className="wb-rec-error" role="alert">{error}</p>}
        <div className="wb-form-actions">
          <button type="button" onClick={onClose} className="wb-btn wb-btn--ghost">{t('actions.cancel')}</button>
          <button type="submit" disabled={!title.trim() || selected.size === 0 || loading} className="wb-btn wb-btn--primary">
            {loading ? '…' : t('classes.launch_vote')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
