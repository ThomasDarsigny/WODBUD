import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import NavIcon from '../navigation/NavIcon'
import { supabase } from '../../lib/supabase'
import { useClassStore } from '../../stores/classStore'
import { useExerciseStore } from '../../stores/exerciseStore'
import type { Exercise, VoteOption, VoteSession } from '../../types'
import { CATEGORY_I18N_KEYS, MUSCLE_GROUP_I18N_KEYS } from '../../types'
import VoteResultsBars from '../vote/VoteResultsBars'
import { btnPrimary as actionBtnStyle } from '../../styles/ui'
import { isVoteSessionOpen, voteSessionKind } from '../../lib/voteSessions'

/**
 * Vote de l'athlète — un seul choix par séance.
 *
 * L'index `exercise_votes_one_per_session` impose un vote unique par athlète
 * et par séance. L'écran multi-sélection d'avant ne pouvait donc plus
 * fonctionner : le deuxième insert violait la contrainte. Les options viennent
 * maintenant de `vote_options`, avec leur couleur, et les résultats de la vue
 * `vote_results`.
 */
export default function AthleteVoteView() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation(['common', 'exercises'])
  const { exercises, fetchExercises } = useExerciseStore()
  const { voteOptions, voteResults, fetchVoteOptions, fetchVoteResults, castVote } = useClassStore()

  const [session, setSession] = useState<VoteSession | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [confirmedOptionId, setConfirmedOptionId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { fetchExercises() }, [fetchExercises])

  useEffect(() => {
    if (!sessionId) return
    let mounted = true
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()

      const [sessionRes, voteRes] = await Promise.all([
        supabase.from('vote_sessions').select('*').eq('id', sessionId).single(),
        user
          ? supabase
              .from('exercise_votes')
              .select('vote_option_id')
              .eq('vote_session_id', sessionId)
              .eq('user_id', user.id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null })
      ])

      if (!mounted) return

      if (sessionRes.error || !sessionRes.data) {
        setError(t('athlete.vote_not_found'))
      } else {
        setSession(sessionRes.data as VoteSession)
        void fetchVoteOptions(sessionId)
        void fetchVoteResults(sessionId)
      }

      const previous = voteRes.data?.vote_option_id ?? null
      if (previous) {
        setSelectedOptionId(previous)
        setConfirmedOptionId(previous)
        setShowResults(true)
      }

      setLoadingSession(false)
    })()
    return () => { mounted = false }
  }, [sessionId, t, fetchVoteOptions, fetchVoteResults])

  const options: VoteOption[] = useMemo(
    () => (sessionId ? voteOptions[sessionId] ?? [] : []),
    [voteOptions, sessionId]
  )
  const results = sessionId ? voteResults[sessionId] ?? [] : []
  const exerciseById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])

  const changed = selectedOptionId !== confirmedOptionId

  async function handleSubmit() {
    if (!selectedOptionId || !session) return
    const option = options.find((o) => o.id === selectedOptionId)
    // exercise_votes.exercise_id est NOT NULL : une option purement textuelle
    // (label sans exercice) ne peut pas encore être votée.
    if (!option?.exercise_id) {
      setError(t('errors.generic'))
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await castVote(session.id, option.id, option.exercise_id)
      setConfirmedOptionId(option.id)
      setShowResults(true)
      await fetchVoteResults(session.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingSession) return <CenteredMessage message={t('status.loading')} />
  if (!session) return <CenteredMessage message={t('athlete.vote_not_found')} />
  if (!isVoteSessionOpen(session)) {
    // Fermé par le coach ou expiré tout seul : même écran, message différent
    // — un athlète qui voit « fermé » alors que la date limite est juste
    // passée cherche un coach qui n'a rien fait.
    const closedMessage = voteSessionKind(session) === 'expired' ? t('athlete.vote_expired') : t('athlete.vote_closed')
    return (
      <div style={{ padding: 'var(--page-pad)', maxWidth: 720 }}>
        <BackButton onClick={() => navigate('/athlete')} label={t('actions.back')} />
        <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '1.75rem', fontWeight: 900, textTransform: 'uppercase', margin: '0 0 0.5rem' }}>
          {session.title}
        </h1>
        <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>{closedMessage}</p>
        <SectionTitle>{t('vote.results_title')}</SectionTitle>
        <VoteResultsBars results={results} emptyLabel={t('vote.no_options')} />
      </div>
    )
  }

  return (
    <div style={{ padding: 'var(--page-pad)', paddingBottom: '7rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <BackButton onClick={() => navigate('/athlete')} label={t('actions.back')} />
        <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--orange)', marginBottom: '0.4rem' }}>
          {t('vote.tag')}
        </p>
        <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '1.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.02em', margin: 0 }}>
          {session.title}
        </h1>
        <p style={{ color: 'var(--muted)', marginTop: '0.5rem', fontSize: '0.9375rem' }}>
          {t('vote.subtitle')}
        </p>
        {session.deadline && (
          <p style={{ color: 'var(--muted)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>
            {t('classes.deadline')}: {new Date(session.deadline).toLocaleDateString()}
          </p>
        )}
      </div>

      {confirmedOptionId && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.3)', padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
          <span style={{ color: '#22c55e', fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            ✓ {t('vote.already_voted')}
          </span>
          <span style={{ color: 'var(--muted)', fontSize: '0.8125rem' }}>— {t('vote.can_modify')}</span>
        </div>
      )}

      {options.length === 0 ? (
        <CenteredMessage message={t('vote.no_options')} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.75rem' }}>
          {options.map((option) => (
            <VoteCard
              key={option.id}
              option={option}
              exercise={option.exercise_id ? exerciseById.get(option.exercise_id) : undefined}
              selected={selectedOptionId === option.id}
              confirmed={confirmedOptionId === option.id}
              onSelect={() => setSelectedOptionId(option.id)}
            />
          ))}
        </div>
      )}

      {showResults && (
        <div style={{ marginTop: '2rem', border: '1px solid var(--border)', background: 'var(--dark)', padding: '1.25rem' }}>
          <SectionTitle>{t('vote.results_title')}</SectionTitle>
          <VoteResultsBars results={results} emptyLabel={t('vote.no_options')} />
        </div>
      )}

      {error && (
        <div style={{ marginTop: '1rem', padding: '0.65rem 0.9rem', background: 'rgba(255,77,0,0.1)', border: '1px solid rgba(255,77,0,0.3)', color: 'var(--orange)', fontSize: '0.8125rem' }}>
          {error}
        </div>
      )}

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--dark)', borderTop: '1px solid var(--border)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', zIndex: 100, flexWrap: 'wrap' }}>
        <div style={{ color: 'var(--muted)', fontFamily: 'var(--font-d)', fontSize: '0.8125rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {selectedOptionId ? t('vote.single_hint') : t('vote.none_selected')}
        </div>
        <button
          onClick={handleSubmit}
          disabled={!selectedOptionId || submitting || !changed}
          style={{
            ...actionBtnStyle,
            opacity: (!selectedOptionId || submitting || !changed) ? 0.5 : 1,
            cursor: (!selectedOptionId || !changed) ? 'not-allowed' : 'pointer'
          }}
        >
          {submitting ? t('vote.submitting') : confirmedOptionId ? t('vote.update') : t('vote.submit')}
        </button>
      </div>
    </div>
  )
}

function VoteCard({ option, exercise, selected, confirmed, onSelect }: {
  option: VoteOption
  exercise?: Exercise
  selected: boolean
  confirmed: boolean
  onSelect: () => void
}) {
  const { t } = useTranslation('common')
  const name = exercise?.name ?? option.label ?? `Option ${option.position}`

  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      style={{
        background: selected ? `${option.color}14` : 'var(--dark)',
        border: `1px solid ${selected ? option.color : 'var(--border)'}`,
        outline: selected ? `1px solid ${option.color}` : 'none',
        outlineOffset: '-2px',
        padding: '1rem 1.15rem', textAlign: 'left', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative',
        color: 'var(--white)', transition: 'all 0.15s'
      }}
    >
      {/* La pastille de couleur est l'identité de l'option : c'est elle qu'on
          retrouve dans les barres de résultats. */}
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
        <span style={{ width: 14, height: 14, background: option.color, flexShrink: 0, borderRadius: '50%' }} />
        <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          {exercise ? t(CATEGORY_I18N_KEYS[exercise.category]) : `#${option.position}`}
        </span>
        {confirmed && (
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#22c55e', border: '1px solid rgba(34,197,94,0.35)', padding: '0.08rem 0.35rem' }}>
            ✓ {t('vote.your_choice')}
          </span>
        )}
      </span>

      <div style={{ width: '100%', height: 92, background: 'var(--black)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
        {exercise?.video_url ? (
          <video src={exercise.video_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted preload="metadata" />
        ) : (
          <span style={{ opacity: 0.2, display: 'flex' }}><NavIcon name="video" size={26} /></span>
        )}
        {selected && <div style={{ position: 'absolute', inset: 0, background: `${option.color}2e`, pointerEvents: 'none' }} />}
      </div>

      <h3 style={{ fontFamily: 'var(--font-d)', fontSize: '0.9375rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
        {name}
      </h3>

      {exercise && (
        <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: option.color, border: `1px solid ${option.color}59`, padding: '0.14rem 0.45rem', alignSelf: 'flex-start' }}>
          {t(MUSCLE_GROUP_I18N_KEYS[exercise.primary_muscle])}
        </span>
      )}
    </button>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '0.8125rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 0.9rem' }}>
      {children}
    </h2>
  )
}

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.15em', textTransform: 'uppercase', padding: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
    >
      ← {label}
    </button>
  )
}

function CenteredMessage({ message, icon = 'INFO' }: { message: string; icon?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 300, gap: '1rem', color: 'var(--muted)' }}>
      <span style={{ fontSize: '2.5rem', opacity: 0.4 }}>{icon}</span>
      <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.9375rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{message}</p>
    </div>
  )
}

