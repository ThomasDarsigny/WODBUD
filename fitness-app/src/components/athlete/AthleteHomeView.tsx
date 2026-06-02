import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useClassStore } from '../../stores/classStore'
import { useExerciseStore } from '../../stores/exerciseStore'
import type { VoteSession, Class } from '../../types'
import { CATEGORY_I18N_KEYS, MUSCLE_GROUP_I18N_KEYS } from '../../types'

export default function AthleteHomeView() {
  const { t } = useTranslation(['common', 'exercises'])
  const navigate = useNavigate()
  const { classes, fetchMyClasses } = useClassStore()
  const { exercises, fetchExercises } = useExerciseStore()

  const [openSessions, setOpenSessions] = useState<(VoteSession & { class_name?: string })[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)

  const { fetchOpenVoteSessions } = useClassStore()

  useEffect(() => {
    fetchMyClasses()
    fetchExercises()
  }, [fetchMyClasses, fetchExercises])

  useEffect(() => {
    let mounted = true
    setLoadingSessions(true)
    fetchOpenVoteSessions()
      .then((sessions) => { if (mounted) setOpenSessions(sessions) })
      .catch(() => {})
      .finally(() => { if (mounted) setLoadingSessions(false) })
    return () => { mounted = false }
  }, [fetchOpenVoteSessions])

  const exerciseMap = new Map(exercises.map((e) => [e.id, e]))

  return (
    <div style={{ padding: '2rem', maxWidth: 900 }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.72rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--orange)', marginBottom: '0.4rem' }}>
          {t('athlete.welcome_tag')}
        </p>
        <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '2.2rem', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1, letterSpacing: '0.02em', margin: 0 }}>
          {t('athlete.welcome_title')}
        </h1>
      </div>

      {/* Active votes */}
      <section style={{ marginBottom: '2.5rem' }}>
        <SectionHeader icon="🗳️" title={t('athlete.section_votes')} />
        {loadingSessions ? (
          <LoadingRow />
        ) : openSessions.length === 0 ? (
          <EmptyCard message={t('athlete.no_votes')} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {openSessions.map((session) => (
              <VoteSessionCard
                key={session.id}
                session={session}
                exerciseMap={exerciseMap}
                onVote={() => navigate(`/athlete/vote/${session.id}`)}
              />
            ))}
          </div>
        )}
      </section>

      {/* My classes */}
      <section>
        <SectionHeader icon="📋" title={t('athlete.section_classes')} />
        {classes.length === 0 ? (
          <EmptyCard message={t('athlete.no_classes')} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
            {classes.map((cls) => <ClassCard key={cls.id} cls={cls} />)}
          </div>
        )}
      </section>
    </div>
  )
}

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
      <span style={{ fontSize: '1.1rem' }}>{icon}</span>
      <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '1rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
        {title}
      </h2>
    </div>
  )
}

function LoadingRow() {
  const { t } = useTranslation('common')
  return (
    <div style={{ padding: '1.5rem', color: 'var(--muted)', fontFamily: 'var(--font-d)', fontSize: '0.78rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
      {t('status.loading')}
    </div>
  )
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div style={{ padding: '1.5rem', border: '1px solid var(--border)', background: 'var(--dark)', color: 'var(--muted)', fontFamily: 'var(--font-d)', fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center' }}>
      {message}
    </div>
  )
}

function VoteSessionCard({ session, exerciseMap, onVote }: {
  session: VoteSession & { class_name?: string }
  exerciseMap: Map<string, import('../../types').Exercise>
  onVote: () => void
}) {
  const { t } = useTranslation(['common', 'exercises'])
  return (
    <div style={{ border: '1px solid rgba(255,77,0,0.3)', background: 'rgba(255,77,0,0.05)', padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
      <div>
        <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.92rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--white)', margin: 0 }}>
          {session.title}
        </p>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
          {session.exercise_options.slice(0, 5).map((exId) => {
            const ex = exerciseMap.get(exId)
            if (!ex) return null
            return (
              <span key={exId} style={{ fontFamily: 'var(--font-d)', fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--orange)', border: '1px solid rgba(255,77,0,0.25)', padding: '0.15rem 0.45rem' }}>
                {ex.name}
              </span>
            )
          })}
          {session.exercise_options.length > 5 && (
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>+{session.exercise_options.length - 5}</span>
          )}
        </div>
        {session.deadline && (
          <p style={{ color: 'var(--muted)', fontSize: '0.72rem', marginTop: '0.4rem' }}>
            {t('classes.deadline')}: {new Date(session.deadline).toLocaleDateString()}
          </p>
        )}
      </div>
      <button
        onClick={onVote}
        style={{ fontFamily: 'var(--font-d)', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--black)', background: 'var(--orange)', border: 'none', padding: '0.6rem 1.25rem', cursor: 'pointer', flexShrink: 0 }}
      >
        {t('athlete.vote_cta')}
      </button>
    </div>
  )
}

function ClassCard({ cls }: { cls: Class }) {
  return (
    <div style={{ border: '1px solid var(--border)', background: 'var(--dark)', padding: '1rem 1.25rem' }}>
      <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.88rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--white)', margin: 0 }}>
        {cls.name}
      </p>
      {cls.schedule && (
        <p style={{ color: 'var(--muted)', fontSize: '0.78rem', marginTop: '0.3rem' }}>{cls.schedule}</p>
      )}
      {cls.description && (
        <p style={{ color: 'var(--muted)', fontSize: '0.8rem', marginTop: '0.3rem' }}>{cls.description}</p>
      )}
    </div>
  )
}

// suppress unused import warnings
void CATEGORY_I18N_KEYS
void MUSCLE_GROUP_I18N_KEYS
