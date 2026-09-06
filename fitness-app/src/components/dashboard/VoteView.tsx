import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useClassStore } from '../../stores/classStore'
import type { VoteSession } from '../../types'
import VoteResultsBars from '../vote/VoteResultsBars'
import ConfirmButton from '../ui/ConfirmButton'
import EmptyState from '../ui/EmptyState'
import { btnPrimary as actionBtnStyle, btnSecondary as ghostBtnStyle } from '../../styles/ui'

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

  const openCount = allSessions.filter((s) => s.status === 'open').length

  return (
    <div style={{ padding: 'var(--page-pad)', minHeight: '100%' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--orange)', marginBottom: '0.35rem' }}>
          {t('nav.vote')}
        </p>
        <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '1.75rem', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.05, letterSpacing: '0.03em', margin: 0 }}>
          {t('vote_view.title')}
        </h1>
        <p style={{ color: 'var(--muted)', marginTop: '0.45rem' }}>
          {t('vote_view.subtitle', { open: openCount, total: allSessions.length })}
        </p>
      </div>

      {allSessions.length === 0 ? (
        <EmptyState
          icon="vote"
          title={t('vote_view.empty')}
          hint={t('vote_view.empty_hint')}
          action={
            <button onClick={() => navigate('/dashboard/classes')} style={actionBtnStyle}>
              {t('vote_view.go_to_classes')}
            </button>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {allSessions.map((session) => {
            const results = voteResults[session.id] ?? []
            const totalVotes = results.reduce((sum, r) => sum + r.votes, 0)

            return (
              <div key={session.id} style={{ border: '1px solid var(--border)', background: 'var(--dark)', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.9375rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--white)', margin: 0 }}>
                        {session.title}
                      </p>
                      <span style={{
                        fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.15em', textTransform: 'uppercase',
                        color: session.status === 'open' ? '#22c55e' : 'var(--muted)',
                        border: `1px solid ${session.status === 'open' ? 'rgba(34,197,94,0.35)' : 'var(--border)'}`,
                        background: session.status === 'open' ? 'rgba(34,197,94,0.08)' : 'transparent',
                        padding: '0.1rem 0.4rem'
                      }}>
                        {session.status === 'open' ? t('classes.vote_open') : t('classes.vote_closed')}
                      </span>
                      {totalVotes > 0 && (
                        <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', padding: '0.1rem 0.4rem' }}>
                          {totalVotes} {t('classes.votes_total')}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                      {session.className && (
                        <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--orange)' }}>
                          {session.className}
                        </span>
                      )}
                      {session.deadline && (
                        <span style={{ color: 'var(--muted)', fontSize: '0.8125rem' }}>
                          {t('classes.deadline')}: {new Date(session.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button onClick={() => fetchVoteResults(session.id)} title={t('vote_view.refresh')} style={{ ...ghostBtnStyle, fontSize: '0.6875rem', padding: '0.35rem 0.65rem' }}>
                      ↻
                    </button>
                    {session.status === 'open' && (
                      <button onClick={() => closeVoteSession(session.id)} style={{ ...ghostBtnStyle, fontSize: '0.6875rem' }}>
                        {t('classes.close_vote')}
                      </button>
                    )}
                    <ConfirmButton onConfirm={() => handleDelete(session)} title={t('classes.delete_vote')} style={{ ...ghostBtnStyle, fontSize: '0.6875rem', color: 'rgba(255,77,0,0.8)', borderColor: 'rgba(255,77,0,0.35)' }}>
                      ✕
                    </ConfirmButton>
                  </div>
                </div>

                <VoteResultsBars results={results} emptyLabel={t('classes.no_votes_yet')} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

