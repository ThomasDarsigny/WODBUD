import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useClassStore } from '../../stores/classStore'
import { useExerciseStore } from '../../stores/exerciseStore'
import type { VoteSession } from '../../types'

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
  const { exercises, fetchExercises } = useExerciseStore()

  useEffect(() => {
    fetchClasses()
    fetchExercises()
  }, [fetchClasses, fetchExercises])

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

  const exerciseMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])

  async function handleDelete(session: SessionWithClass) {
    if (!confirm(`Supprimer le vote "${session.title}" ? Tous les votes des athlètes seront perdus.`)) return
    await deleteVoteSession(session.id)
  }

  const openCount = allSessions.filter((s) => s.status === 'open').length

  return (
    <div style={{ padding: '2rem', minHeight: '100%' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.72rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--orange)', marginBottom: '0.35rem' }}>
          {t('nav.vote')}
        </p>
        <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '2.05rem', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.05, letterSpacing: '0.03em', margin: 0 }}>
          {t('vote_view.title')}
        </h1>
        <p style={{ color: 'var(--muted)', marginTop: '0.45rem' }}>
          {t('vote_view.subtitle', { open: openCount, total: allSessions.length })}
        </p>
      </div>

      {allSessions.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem', color: 'var(--muted)', gap: '1rem' }}>
          <span style={{ fontSize: '2.5rem', opacity: 0.25 }}>VOTE</span>
          <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.9rem', letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'center' }}>
            {t('vote_view.empty')}
          </p>
          <button onClick={() => navigate('/dashboard/classes')} style={actionBtnStyle}>
            {t('vote_view.go_to_classes')}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {allSessions.map((session) => {
            const results = voteResults[session.id] ?? []
            const totalVotes = results.reduce((sum, r) => sum + r.count, 0)
            const maxCount = results[0]?.count ?? 0

            return (
              <div key={session.id} style={{ border: '1px solid var(--border)', background: 'var(--dark)', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
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
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                      {session.className && (
                        <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--orange)' }}>
                          {session.className}
                        </span>
                      )}
                      {session.deadline && (
                        <span style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>
                          {t('classes.deadline')}: {new Date(session.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button onClick={() => fetchVoteResults(session.id)} title={t('vote_view.refresh')} style={{ ...ghostBtnStyle, fontSize: '0.62rem', padding: '0.35rem 0.65rem' }}>
                      ↻
                    </button>
                    {session.status === 'open' && (
                      <button onClick={() => closeVoteSession(session.id)} style={{ ...ghostBtnStyle, fontSize: '0.65rem' }}>
                        {t('classes.close_vote')}
                      </button>
                    )}
                    <button onClick={() => handleDelete(session)} title={t('classes.delete_vote')} style={{ ...ghostBtnStyle, fontSize: '0.65rem', color: 'rgba(255,77,0,0.8)', borderColor: 'rgba(255,77,0,0.35)' }}>
                      ✕
                    </button>
                  </div>
                </div>

                {results.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {results.map((r) => {
                      const ex = exerciseMap.get(r.exercise_id)
                      const pct = maxCount > 0 ? (r.count / maxCount) * 100 : 0
                      const isWinner = r.count === maxCount && maxCount > 0
                      return (
                        <div key={r.exercise_id}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                            <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: isWinner ? '#22c55e' : 'var(--muted)' }}>
                              {isWinner && '▶ '}{ex?.name ?? r.exercise_id.slice(0, 8)}
                            </span>
                            <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.72rem', letterSpacing: '0.1em', color: isWinner ? '#22c55e' : 'var(--muted)', fontWeight: isWinner ? 700 : 400 }}>
                              {r.count} {r.count === 1 ? t('classes.vote_singular') : t('classes.vote_plural')}
                            </span>
                          </div>
                          <div style={{ height: 4, background: 'var(--black)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: isWinner ? '#22c55e' : 'rgba(34,197,94,0.3)', transition: 'width 0.4s ease', borderRadius: 2 }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {session.exercise_options.map((exId) => {
                      const ex = exerciseMap.get(exId)
                      if (!ex) return null
                      return (
                        <span key={exId} style={{ fontFamily: 'var(--font-d)', fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', border: '1px solid var(--border)', padding: '0.2rem 0.5rem' }}>
                          {ex.name}
                        </span>
                      )
                    })}
                    <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.6, alignSelf: 'center' }}>
                      — {t('classes.no_votes_yet')}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

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
