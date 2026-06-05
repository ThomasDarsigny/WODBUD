import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useExerciseStore } from '../../stores/exerciseStore'
import type { Exercise, VoteSession } from '../../types'
import { CATEGORY_I18N_KEYS, MUSCLE_GROUP_I18N_KEYS } from '../../types'

export default function AthleteVoteView() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation(['common', 'exercises'])
  const { exercises, fetchExercises } = useExerciseStore()

  const [session, setSession] = useState<VoteSession | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [previousVoteIds, setPreviousVoteIds] = useState<Set<string>>(new Set())
  const [hasVoted, setHasVoted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { fetchExercises() }, [fetchExercises])

  // Load session + existing vote in parallel
  useEffect(() => {
    if (!sessionId) return
    let mounted = true
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()

      const [sessionRes, voteRes] = await Promise.all([
        (supabase as any)
          .from('vote_sessions')
          .select('*')
          .eq('id', sessionId)
          .single(),
        user
          ? (supabase as any)
              .from('exercise_votes')
              .select('exercise_id')
              .eq('vote_session_id', sessionId)
              .eq('user_id', user.id)
          : Promise.resolve({ data: [], error: null })
      ])

      if (!mounted) return

      if (sessionRes.error || !sessionRes.data) {
        setError(t('athlete.vote_not_found'))
      } else {
        setSession(sessionRes.data as VoteSession)
      }

      // Pre-populate selection with existing votes
      if (voteRes.data && voteRes.data.length > 0) {
        const ids = new Set<string>((voteRes.data as { exercise_id: string }[]).map((r) => r.exercise_id))
        setSelected(ids)
        setPreviousVoteIds(ids)
        setHasVoted(true)
      }

      setLoadingSession(false)
    })()
    return () => { mounted = false }
  }, [sessionId, t])

  const sessionExercises = useMemo(() => {
    if (!session) return []
    return (session.exercise_options
      .map((id) => exercises.find((e) => e.id === id))
      .filter(Boolean)) as Exercise[]
  }, [session, exercises])

  function toggleExercise(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // True if selection changed from previous vote
  const selectionChanged = useMemo(() => {
    if (selected.size !== previousVoteIds.size) return true
    for (const id of selected) if (!previousVoteIds.has(id)) return true
    return false
  }, [selected, previousVoteIds])

  async function handleSubmit() {
    if (selected.size === 0 || !session) return
    setSubmitting(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error(t('errors.generic'))

      // Delete existing votes for this session first (enables modification)
      const { error: deleteError } = await (supabase as any)
        .from('exercise_votes')
        .delete()
        .eq('user_id', user.id)
        .eq('vote_session_id', session.id)
      if (deleteError) throw deleteError

      // Insert new selection
      const rows = Array.from(selected).map((exercise_id) => ({
        exercise_id,
        user_id: user.id,
        vote_session_id: session.id
      }))
      const { error: insertError } = await (supabase as any)
        .from('exercise_votes')
        .insert(rows)
      if (insertError) throw insertError

      setPreviousVoteIds(new Set(selected))
      setHasVoted(true)
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingSession) return <CenteredMessage message={t('status.loading')} />
  if (!session) return <CenteredMessage message={t('athlete.vote_not_found')} />
  if (session.status === 'closed') return <CenteredMessage message={t('athlete.vote_closed')} icon="LOCK" />

  if (submitted) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 400, gap: '1.5rem', padding: '2rem' }}>
        <span style={{ fontSize: '3.5rem' }}>VOTE</span>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.72rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--orange)', marginBottom: '0.5rem' }}>
            {t('vote.success_label')}
          </p>
          <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '2rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
            {t('vote.success_title')}
          </h2>
          <p style={{ color: 'var(--muted)', marginTop: '0.75rem', fontSize: '0.95rem' }}>
            {t('vote.success_subtitle', { count: selected.size })}
          </p>
        </div>
        <button onClick={() => navigate('/athlete')} style={actionBtnStyle}>
          {t('athlete.back_home')}
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', paddingBottom: '7rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => navigate('/athlete')}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-d)', fontSize: '0.72rem', letterSpacing: '0.15em', textTransform: 'uppercase', padding: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          ← {t('actions.back')}
        </button>
        <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.72rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--orange)', marginBottom: '0.4rem' }}>
          {t('vote.tag')}
        </p>
        <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '2rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.02em', margin: 0 }}>
          {session.title}
        </h1>
        <p style={{ color: 'var(--muted)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
          {t('vote.subtitle')}
        </p>
        {session.deadline && (
          <p style={{ color: 'var(--muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
            {t('classes.deadline')}: {new Date(session.deadline).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Already voted banner */}
      {hasVoted && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.3)',
          padding: '0.75rem 1rem', marginBottom: '1.25rem'
        }}>
          <span style={{ color: '#22c55e', fontFamily: 'var(--font-d)', fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            ✓ {t('vote.already_voted')}
          </span>
          <span style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
            — {t('vote.can_modify')}
          </span>
        </div>
      )}

      {selected.size > 0 && (
        <div style={{ display: 'inline-block', fontFamily: 'var(--font-d)', fontSize: '0.78rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--orange)', border: '1px solid rgba(255,77,0,0.35)', background: 'rgba(255,77,0,0.07)', padding: '0.4rem 0.9rem', marginBottom: '1rem' }}>
          {selected.size} {t('vote.selected')}
        </div>
      )}

      {/* Exercise grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1px', background: 'var(--border)', border: '1px solid var(--border)' }}>
        {sessionExercises.map((exercise) => (
          <VoteCard
            key={exercise.id}
            exercise={exercise}
            selected={selected.has(exercise.id)}
            isConfirmedVote={previousVoteIds.has(exercise.id)}
            onToggle={() => toggleExercise(exercise.id)}
          />
        ))}
      </div>

      {error && (
        <div style={{ marginTop: '1rem', padding: '0.65rem 0.9rem', background: 'rgba(255,77,0,0.1)', border: '1px solid rgba(255,77,0,0.3)', color: 'var(--orange)', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Sticky bottom bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 220, right: 0, background: 'var(--dark)', borderTop: '1px solid var(--border)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', zIndex: 100 }}>
        <div style={{ color: 'var(--muted)', fontFamily: 'var(--font-d)', fontSize: '0.82rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {selected.size === 0
            ? t('vote.none_selected')
            : `${selected.size} ${t('vote.selected')}`}
        </div>
        <button
          onClick={handleSubmit}
          disabled={selected.size === 0 || submitting || (hasVoted && !selectionChanged)}
          style={{
            ...actionBtnStyle,
            opacity: (selected.size === 0 || submitting || (hasVoted && !selectionChanged)) ? 0.5 : 1,
            cursor: selected.size === 0 ? 'not-allowed' : 'pointer'
          }}
        >
          {submitting
            ? t('vote.submitting')
            : hasVoted
              ? t('vote.update')
              : t('vote.submit')}
        </button>
      </div>
    </div>
  )
}

function VoteCard({ exercise, selected, isConfirmedVote, onToggle }: { exercise: Exercise; selected: boolean; isConfirmedVote: boolean; onToggle: () => void }) {
  const { t } = useTranslation('common')
  const [hovered, setHovered] = useState(false)

  const accentColor = selected && isConfirmedVote ? '#22c55e' : 'var(--orange)'
  const bgColor = selected && isConfirmedVote
    ? 'rgba(34,197,94,0.08)'
    : selected
      ? 'rgba(255,77,0,0.08)'
      : hovered ? 'var(--surface)' : 'var(--dark)'
  const overlayColor = selected && isConfirmedVote
    ? 'rgba(34,197,94,0.18)'
    : 'rgba(255,77,0,0.18)'

  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={selected ? (isConfirmedVote ? t('vote.already_voted') : t('vote.selected')) : exercise.name}
      style={{ background: bgColor, border: 'none', outline: selected ? `2px solid ${accentColor}` : '2px solid transparent', outlineOffset: '-2px', padding: '1.25rem 1.5rem', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative' }}
    >
      {selected && (
        <div style={{ position: 'absolute', top: '0.6rem', right: '0.6rem', width: 22, height: 22, borderRadius: '50%', background: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--black)', fontWeight: 700 }}>
          ✓
        </div>
      )}
      <div style={{ width: '100%', height: 100, background: 'var(--black)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', marginBottom: '0.25rem' }}>
        {exercise.video_url ? (
          <video src={exercise.video_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted preload="metadata" />
        ) : (
          <span style={{ fontSize: '2rem', opacity: 0.15 }}>VID</span>
        )}
        {selected && <div style={{ position: 'absolute', inset: 0, background: overlayColor, pointerEvents: 'none' }} />}
      </div>
      <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--orange)', opacity: 0.8 }}>
        {t(CATEGORY_I18N_KEYS[exercise.category], { ns: 'common' })}
      </span>
      <h3 style={{ fontFamily: 'var(--font-d)', fontSize: '1rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--white)', margin: 0 }}>
        {exercise.name}
      </h3>
      <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--orange)', background: 'rgba(255,77,0,0.1)', border: '1px solid rgba(255,77,0,0.25)', padding: '0.15rem 0.5rem', display: 'inline-block' }}>
        {t(MUSCLE_GROUP_I18N_KEYS[exercise.primary_muscle], { ns: 'common' })}
      </span>
    </button>
  )
}

function CenteredMessage({ message, icon = 'INFO' }: { message: string; icon?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 300, gap: '1rem', color: 'var(--muted)' }}>
      <span style={{ fontSize: '2.5rem', opacity: 0.4 }}>{icon}</span>
      <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.9rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{message}</p>
    </div>
  )
}

const actionBtnStyle = {
  fontFamily: 'var(--font-d)',
  fontSize: '0.85rem',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--black)',
  background: 'var(--orange)',
  border: 'none',
  padding: '0.75rem 2rem',
  cursor: 'pointer'
} as const
