import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import NavIcon from '../navigation/NavIcon'
import { supabase } from '../../lib/supabase'
import { getLocalUser } from '../../lib/currentUser'
import { useClassStore } from '../../stores/classStore'
import { useExerciseStore } from '../../stores/exerciseStore'
import type { Exercise, VoteOption, VoteSession } from '../../types'
import { CATEGORY_I18N_KEYS, MUSCLE_GROUP_I18N_KEYS } from '../../types'
import VoteResultsBars from '../vote/VoteResultsBars'
import EmptyState from '../ui/EmptyState'
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
      const { data: { user } } = await getLocalUser()

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

  if (loadingSession) return <div className="wb-vote-page"><EmptyState icon="vote" title={t('status.loading')} /></div>
  if (!session) return <div className="wb-vote-page"><EmptyState icon="vote" title={t('athlete.vote_not_found')} /></div>
  if (!isVoteSessionOpen(session)) {
    // Fermé par le coach ou expiré tout seul : même écran, message différent
    // — un athlète qui voit « fermé » alors que la date limite est juste
    // passée cherche un coach qui n'a rien fait.
    const closedMessage = voteSessionKind(session) === 'expired' ? t('athlete.vote_expired') : t('athlete.vote_closed')
    return (
      <div className="wb-vote-page wb-vote-page--closed">
        <button type="button" className="wb-vote-back" onClick={() => navigate('/athlete')}>← {t('actions.back')}</button>
        <h1 className="wb-vote-h1">{session.title}</h1>
        <p className="wb-vote-sub">{closedMessage}</p>
        <h2 className="wb-vote-sec-title">{t('vote.results_title')}</h2>
        <VoteResultsBars results={results} emptyLabel={t('vote.no_options')} />
      </div>
    )
  }

  const blocked = !selectedOptionId || submitting || !changed

  return (
    <div className="wb-vote-page">
      <div className="wb-vote-head">
        <button type="button" className="wb-vote-back" onClick={() => navigate('/athlete')}>← {t('actions.back')}</button>
        <p className="wb-ph-tag">{t('vote.tag')}</p>
        <h1 className="wb-vote-h1">{session.title}</h1>
        <p className="wb-vote-sub">{t('vote.subtitle')}</p>
        {session.deadline && (
          <p className="wb-vote-when">{t('classes.deadline')}: {new Date(session.deadline).toLocaleDateString()}</p>
        )}
      </div>

      {confirmedOptionId && (
        <div className="wb-vote-confirmed" role="status">
          <span className="wb-vote-confirmed-tag">✓ {t('vote.already_voted')}</span>
          <span className="wb-vote-confirmed-text">— {t('vote.can_modify')}</span>
        </div>
      )}

      {options.length === 0 ? (
        <EmptyState icon="vote" title={t('vote.no_options')} />
      ) : (
        <div className="wb-vote-grid" role="group" aria-label={session.title}>
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
        <section className="wb-vote-results" aria-labelledby="vote-results-title">
          <h2 id="vote-results-title" className="wb-vote-sec-title">{t('vote.results_title')}</h2>
          <VoteResultsBars results={results} emptyLabel={t('vote.no_options')} />
        </section>
      )}

      {error && <div className="wb-vote-error" role="alert">{error}</div>}

      <div className="wb-above-tabbar wb-vote-bar">
        <p className="wb-vote-bar-hint" aria-live="polite">{selectedOptionId ? t('vote.single_hint') : t('vote.none_selected')}</p>
        <button type="button" onClick={handleSubmit} disabled={blocked} className="wb-btn wb-btn--primary">
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
    // La couleur de l'option vient des données : une seule variable CSS.
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`wb-vote-opt${selected ? ' is-selected' : ''}`}
      style={{ '--opt': option.color } as CSSProperties}
    >
      {/* La pastille de couleur est l'identité de l'option : c'est elle qu'on
          retrouve dans les barres de résultats. */}
      <span className="wb-vote-opt-top">
        <span className="wb-vote-opt-dot" aria-hidden="true" />
        <span className="wb-vote-opt-cat">{exercise ? t(CATEGORY_I18N_KEYS[exercise.category]) : `#${option.position}`}</span>
        {confirmed && <span className="wb-vote-opt-mine">✓ {t('vote.your_choice')}</span>}
      </span>

      <span className="wb-vote-opt-media">
        {exercise?.video_url ? (
          <video src={exercise.video_url} muted preload="metadata" />
        ) : (
          <span className="wb-vote-opt-novideo" aria-hidden="true"><NavIcon name="video" size={26} /></span>
        )}
        {selected && <span className="wb-vote-opt-tint" aria-hidden="true" />}
      </span>

      <span className="wb-vote-opt-name">{name}</span>

      {exercise && <span className="wb-vote-opt-muscle">{t(MUSCLE_GROUP_I18N_KEYS[exercise.primary_muscle])}</span>}
    </button>
  )
}
