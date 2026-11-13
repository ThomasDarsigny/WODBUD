import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useClassStore } from '../../stores/classStore'
import type { VoteSession } from '../../types'
import VoteSessionCard from '../vote/VoteSessionCard'
import FeatureTopicsCard from '../vote/FeatureTopicsCard'
import EmptyState from '../ui/EmptyState'
import { isVoteSessionOpen } from '../../lib/voteSessions'

type SessionWithClass = VoteSession & { className: string }

export default function VoteView() {
  const { t } = useTranslation(['common', 'exercises'])
  const navigate = useNavigate()
  const {
    classes,
    voteSessions,
    voteResults,
    fetchClasses,
    fetchVoteSessions,
    fetchVoteResults,
    closeVoteSession,
    deleteVoteSession
  } = useClassStore()

  useEffect(() => {
    fetchClasses()
  }, [fetchClasses])

  // Load vote sessions for every class the coach owns
  useEffect(() => {
    for (const cls of classes) {
      if (!voteSessions[cls.id]) fetchVoteSessions(cls.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes])

  const classNameById = useMemo(
    () => new Map(classes.map((c) => [c.id, c.name])),
    [classes]
  )

  const allSessions = useMemo<SessionWithClass[]>(() => {
    const flat: SessionWithClass[] = []
    for (const list of Object.values(voteSessions)) {
      for (const session of list) {
        flat.push({ ...session, className: classNameById.get(session.class_id) ?? '' })
      }
    }
    return flat.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [voteSessions, classNameById])

  // Fetch results for every visible session
  useEffect(() => {
    for (const s of allSessions) {
      if (!voteResults[s.id]) fetchVoteResults(s.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSessions])


  async function handleDelete(session: SessionWithClass) {
    await deleteVoteSession(session.id)
  }

  const openCount = allSessions.filter(isVoteSessionOpen).length

  return (
    <div className="wb-screen">
      <header className="wb-ph wb-screen-head">
        <div>
          <p className="wb-ph-tag">{t('nav.vote')}</p>
          <h1 className="wb-ph-h1">{t('vote_view.title')}</h1>
          <p className="wb-ph-sub">{t('vote_view.subtitle', { open: openCount, total: allSessions.length })}</p>
        </div>
      </header>

      <FeatureTopicsCard />

      {allSessions.length === 0 ? (
        <EmptyState
          icon="vote"
          title={t('vote_view.empty')}
          hint={t('vote_view.empty_hint')}
          action={
            <button type="button" onClick={() => navigate('/dashboard/classes')} className="wb-btn wb-btn--primary">
              {t('vote_view.go_to_classes')}
            </button>
          }
        />
      ) : (
        <div>
          {allSessions.map((session) => (
            <VoteSessionCard
              key={session.id}
              session={session}
              results={voteResults[session.id] ?? []}
              courseName={session.className}
              onRefresh={() => fetchVoteResults(session.id)}
              onClose={() => closeVoteSession(session.id)}
              onDelete={() => handleDelete(session)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
