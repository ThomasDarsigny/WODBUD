import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useExerciseStore } from '../../stores/exerciseStore'
import { supabase } from '../../lib/supabase'
import type { Exercise, ExerciseCategory } from '../../types'
import { CATEGORY_I18N_KEYS, MUSCLE_GROUP_I18N_KEYS } from '../../types'

type FilterCategory = ExerciseCategory | 'all'

export default function VoteView() {
  const { t } = useTranslation(['common', 'exercises'])
  const { exercises, loading, fetchExercises } = useExerciseStore()

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedCount, setSubmittedCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchExercises()
  }, [fetchExercises])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return exercises.filter((e) => {
      const matchSearch =
        !q ||
        e.name.toLowerCase().includes(q) ||
        t(MUSCLE_GROUP_I18N_KEYS[e.primary_muscle], { ns: 'common' })
          .toLowerCase()
          .includes(q)
      const matchCat = categoryFilter === 'all' || e.category === categoryFilter
      return matchSearch && matchCat
    })
  }, [exercises, search, categoryFilter, t])

  function toggleExercise(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSubmit() {
    if (selected.size === 0) return
    setSubmitting(true)
    setError(null)

    try {
      const {
        data: { user }
      } = await supabase.auth.getUser()
      if (!user) throw new Error(t('errors.generic', { ns: 'common' }))

      const rows = Array.from(selected).map((exercise_id) => ({
        exercise_id,
        user_id: user.id,
        workout_id: null
      }))

      const { error: insertError } = await (supabase as any)
        .from('exercise_votes')
        .upsert(rows, { onConflict: 'exercise_id,user_id,workout_id', ignoreDuplicates: true })

      if (insertError) throw insertError

      setSubmittedCount(selected.size)
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic', { ns: 'common' }))
    } finally {
      setSubmitting(false)
    }
  }

  function handleReset() {
    setSelected(new Set())
    setSubmitted(false)
    setError(null)
  }

  const categories: FilterCategory[] = [
    'all',
    ...(Object.keys(CATEGORY_I18N_KEYS) as ExerciseCategory[])
  ]

  if (submitted) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: 400,
          gap: '1.5rem',
          padding: '2rem'
        }}
      >
        <span style={{ fontSize: '3.5rem' }}>🗳️</span>
        <div style={{ textAlign: 'center' }}>
          <p
            style={{
              fontFamily: 'var(--font-d)',
              fontSize: '0.72rem',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: 'var(--orange)',
              marginBottom: '0.5rem'
            }}
          >
            {t('vote.success_label')}
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-d)',
              fontSize: '2rem',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              margin: 0
            }}
          >
            {t('vote.success_title')}
          </h2>
          <p style={{ color: 'var(--muted)', marginTop: '0.75rem', fontSize: '0.95rem' }}>
            {t('vote.success_subtitle', { count: submittedCount })}
          </p>
        </div>
        <button
          onClick={handleReset}
          style={{
            fontFamily: 'var(--font-d)',
            fontSize: '0.82rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--black)',
            background: 'var(--orange)',
            border: 'none',
            padding: '0.75rem 1.75rem',
            cursor: 'pointer'
          }}
        >
          {t('vote.vote_again')}
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', minHeight: '100%', paddingBottom: '7rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: '1rem',
          marginBottom: '2rem',
          flexWrap: 'wrap'
        }}
      >
        <div>
          <p
            style={{
              fontFamily: 'var(--font-d)',
              fontSize: '0.72rem',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: 'var(--orange)',
              marginBottom: '0.4rem'
            }}
          >
            {t('vote.tag')}
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-d)',
              fontSize: '2.2rem',
              fontWeight: 900,
              textTransform: 'uppercase',
              lineHeight: 1,
              letterSpacing: '0.02em'
            }}
          >
            {t('vote.title')}
          </h1>
          <p style={{ color: 'var(--muted)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
            {t('vote.subtitle')}
          </p>
        </div>

        {selected.size > 0 && (
          <div
            style={{
              fontFamily: 'var(--font-d)',
              fontSize: '0.78rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--orange)',
              border: '1px solid rgba(255,77,0,0.35)',
              background: 'rgba(255,77,0,0.07)',
              padding: '0.5rem 1rem'
            }}
          >
            {selected.size} {t('vote.selected')}
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}
      >
        <div style={{ position: 'relative', flex: '1', minWidth: 240 }}>
          <span
            style={{
              position: 'absolute',
              left: '0.9rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--muted)',
              pointerEvents: 'none'
            }}
          >
            🔍
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search', { ns: 'exercises' })}
            style={{
              width: '100%',
              background: 'var(--dark)',
              border: '1px solid var(--border)',
              color: 'var(--white)',
              padding: '0.6rem 0.9rem 0.6rem 2.5rem',
              fontFamily: 'var(--font-b)',
              fontSize: '0.9rem',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              style={{
                fontFamily: 'var(--font-d)',
                fontSize: '0.72rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '0.35rem 0.75rem',
                border: `1px solid ${categoryFilter === cat ? 'var(--orange)' : 'var(--border)'}`,
                background:
                  categoryFilter === cat ? 'rgba(255,77,0,0.1)' : 'transparent',
                color: categoryFilter === cat ? 'var(--orange)' : 'var(--muted)',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {cat === 'all'
                ? t('all', { ns: 'exercises' })
                : t(CATEGORY_I18N_KEYS[cat], { ns: 'common' })}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 200,
            color: 'var(--muted)',
            fontFamily: 'var(--font-d)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase'
          }}
        >
          {t('loading', { ns: 'exercises' })}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏋️</div>
          <p
            style={{
              fontFamily: 'var(--font-d)',
              fontSize: '1rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase'
            }}
          >
            {search || categoryFilter !== 'all'
              ? t('empty_filtered', { ns: 'exercises' })
              : t('empty', { ns: 'exercises' })}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '1px',
            background: 'var(--border)',
            border: '1px solid var(--border)'
          }}
        >
          {filtered.map((exercise) => (
            <VoteCard
              key={exercise.id}
              exercise={exercise}
              selected={selected.has(exercise.id)}
              onToggle={() => toggleExercise(exercise.id)}
            />
          ))}
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.65rem 0.9rem',
            background: 'rgba(255,77,0,0.1)',
            border: '1px solid rgba(255,77,0,0.3)',
            color: 'var(--orange)',
            fontSize: '0.85rem'
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 240,
          right: 0,
          background: 'var(--dark)',
          borderTop: '1px solid var(--border)',
          padding: '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          zIndex: 100
        }}
      >
        <div style={{ color: 'var(--muted)', fontFamily: 'var(--font-d)', fontSize: '0.82rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {selected.size === 0
            ? t('vote.none_selected')
            : `${selected.size} ${t('vote.selected')}`}
        </div>
        <button
          onClick={handleSubmit}
          disabled={selected.size === 0 || submitting}
          style={{
            fontFamily: 'var(--font-d)',
            fontSize: '0.85rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: selected.size === 0 ? 'var(--muted)' : 'var(--black)',
            background: selected.size === 0 ? 'var(--border)' : 'var(--orange)',
            border: 'none',
            padding: '0.75rem 2rem',
            cursor: selected.size === 0 ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
            opacity: submitting ? 0.7 : 1
          }}
        >
          {submitting ? t('vote.submitting') : t('vote.submit')}
        </button>
      </div>
    </div>
  )
}

function VoteCard({
  exercise,
  selected,
  onToggle
}: {
  exercise: Exercise
  selected: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation(['common'])
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: selected ? 'rgba(255,77,0,0.08)' : hovered ? 'var(--surface)' : 'var(--dark)',
        border: 'none',
        outline: selected ? '2px solid var(--orange)' : '2px solid transparent',
        outlineOffset: '-2px',
        padding: '1.25rem 1.5rem',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'all 0.15s',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        position: 'relative'
      }}
    >
      {selected && (
        <div
          style={{
            position: 'absolute',
            top: '0.6rem',
            right: '0.6rem',
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: 'var(--orange)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            color: 'var(--black)',
            fontWeight: 700,
            zIndex: 1,
            flexShrink: 0
          }}
        >
          ✓
        </div>
      )}

      <div
        style={{
          width: '100%',
          height: 100,
          background: 'var(--black)',
          marginBottom: '0.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {exercise.video_url ? (
          <video
            src={exercise.video_url}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            muted
            preload="metadata"
          />
        ) : (
          <span style={{ fontSize: '2rem', opacity: 0.15 }}>🎥</span>
        )}
        {selected && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(255,77,0,0.18)',
              pointerEvents: 'none'
            }}
          />
        )}
      </div>

      <span
        style={{
          fontFamily: 'var(--font-d)',
          fontSize: '0.65rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: selected ? 'var(--orange)' : 'var(--orange)',
          opacity: selected ? 1 : 0.7
        }}
      >
        {t(CATEGORY_I18N_KEYS[exercise.category], { ns: 'common' })}
      </span>

      <h3
        style={{
          fontFamily: 'var(--font-d)',
          fontSize: '1rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: selected ? 'var(--white)' : hovered ? 'var(--white)' : 'var(--white)',
          margin: 0
        }}
      >
        {exercise.name}
      </h3>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
        <span
          style={{
            fontFamily: 'var(--font-d)',
            fontSize: '0.65rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--orange)',
            background: 'rgba(255,77,0,0.1)',
            border: '1px solid rgba(255,77,0,0.25)',
            padding: '0.15rem 0.5rem'
          }}
        >
          {t(MUSCLE_GROUP_I18N_KEYS[exercise.primary_muscle], { ns: 'common' })}
        </span>
      </div>
    </button>
  )
}
