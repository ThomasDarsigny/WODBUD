import { useState, useEffect, useMemo } from 'react'
import { useExerciseStore } from '../../stores/exerciseStore'
import type { Exercise, ExerciseCategory } from '../../types'
import { CATEGORY_LABELS, MUSCLE_GROUP_LABELS } from '../../types'
import ExerciseFormModal from '../exercises/ExerciseFormModal'
import ExerciseDetailModal from '../exercises/ExerciseDetailModal'

type FilterCategory = ExerciseCategory | 'all'

export default function ExercisesView() {
  const { exercises, loading, fetchExercises, deleteExercise } = useExerciseStore()

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | undefined>()
  const [detailExercise, setDetailExercise] = useState<Exercise | undefined>()

  useEffect(() => {
    fetchExercises()
  }, [fetchExercises])

  const filtered = useMemo(() => {
    return exercises.filter((e) => {
      const q = search.toLowerCase()
      const matchSearch =
        e.name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        MUSCLE_GROUP_LABELS[e.primary_muscle].toLowerCase().includes(q)
      const matchCat = categoryFilter === 'all' || e.category === categoryFilter
      return matchSearch && matchCat
    })
  }, [exercises, search, categoryFilter])

  function handleEdit(exercise: Exercise) {
    setEditingExercise(exercise)
    setShowForm(true)
  }

  async function handleDelete(exercise: Exercise) {
    await deleteExercise(exercise.id)
  }

  const categories: FilterCategory[] = [
    'all',
    ...(Object.keys(CATEGORY_LABELS) as ExerciseCategory[])
  ]

  return (
    <div style={{ padding: '2rem', minHeight: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem'
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
            Bibliotheque
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
            Exercices
            <span
              style={{
                fontFamily: 'var(--font-d)',
                fontSize: '1rem',
                fontWeight: 400,
                color: 'var(--muted)',
                marginLeft: '0.75rem'
              }}
            >
              {exercises.length}
            </span>
          </h1>
        </div>
        <button
          onClick={() => {
            setEditingExercise(undefined)
            setShowForm(true)
          }}
          style={{
            fontFamily: 'var(--font-d)',
            fontWeight: 700,
            fontSize: '0.88rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--black)',
            background: 'var(--orange)',
            padding: '0.7rem 1.5rem',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          + Nouvel exercice
        </button>
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
            placeholder='Rechercher un exercice ou muscle...'
            style={{
              width: '100%',
              background: 'var(--dark)',
              border: '1px solid var(--border)',
              color: 'var(--white)',
              padding: '0.6rem 0.9rem 0.6rem 2.5rem',
              fontFamily: 'var(--font-b)',
              fontSize: '0.9rem',
              outline: 'none'
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
                background: categoryFilter === cat ? 'rgba(255,77,0,0.1)' : 'transparent',
                color: categoryFilter === cat ? 'var(--orange)' : 'var(--muted)',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {cat === 'all' ? 'Tous' : CATEGORY_LABELS[cat]}
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
          Chargement...
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
              ? 'Aucun resultat'
              : 'Aucun exercice - cree le premier !'}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1px',
            background: 'var(--border)',
            border: '1px solid var(--border)'
          }}
        >
          {filtered.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onClick={() => setDetailExercise(exercise)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <ExerciseFormModal
          exercise={editingExercise}
          onClose={() => {
            setShowForm(false)
            setEditingExercise(undefined)
          }}
        />
      )}
      {detailExercise && (
        <ExerciseDetailModal
          exercise={detailExercise}
          onClose={() => setDetailExercise(undefined)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}

function ExerciseCard({ exercise, onClick }: { exercise: Exercise; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'var(--surface)' : 'var(--dark)',
        border: 'none',
        padding: '1.25rem 1.5rem',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'background 0.15s',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}
    >
      <div
        style={{
          width: '100%',
          height: 110,
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
            preload='metadata'
          />
        ) : (
          <span style={{ fontSize: '2rem', opacity: 0.15 }}>🎥</span>
        )}
        {exercise.video_url && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.3)',
              opacity: hovered ? 1 : 0,
              transition: 'opacity 0.15s'
            }}
          >
            <span style={{ fontSize: '1.75rem' }}>▶</span>
          </div>
        )}
      </div>

      <span
        style={{
          fontFamily: 'var(--font-d)',
          fontSize: '0.65rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--orange)'
        }}
      >
        {CATEGORY_LABELS[exercise.category]}
      </span>

      <h3
        style={{
          fontFamily: 'var(--font-d)',
          fontSize: '1.05rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: 'var(--white)',
          margin: 0
        }}
      >
        {exercise.name}
      </h3>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
        <span
          style={{
            fontFamily: 'var(--font-d)',
            fontSize: '0.68rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--orange)',
            background: 'rgba(255,77,0,0.1)',
            border: '1px solid rgba(255,77,0,0.25)',
            padding: '0.15rem 0.5rem'
          }}
        >
          {MUSCLE_GROUP_LABELS[exercise.primary_muscle]}
        </span>
        {exercise.secondary_muscles.slice(0, 2).map((m) => (
          <span
            key={m}
            style={{
              fontFamily: 'var(--font-d)',
              fontSize: '0.65rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              border: '1px solid var(--border)',
              padding: '0.15rem 0.4rem'
            }}
          >
            {MUSCLE_GROUP_LABELS[m]}
          </span>
        ))}
        {exercise.secondary_muscles.length > 2 && (
          <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
            +{exercise.secondary_muscles.length - 2}
          </span>
        )}
      </div>
    </button>
  )
}
