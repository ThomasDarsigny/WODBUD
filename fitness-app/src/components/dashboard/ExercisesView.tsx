import { useState, useEffect, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useExerciseStore } from '../../stores/exerciseStore'
import type { Exercise, ExerciseCategory } from '../../types'
import {
  BODY_REGIONS,
  BODY_REGION_I18N_KEYS,
  CATEGORY_I18N_KEYS,
  MOVEMENT_TYPES,
  MOVEMENT_TYPE_COLORS,
  MOVEMENT_TYPE_I18N_KEYS,
  MUSCLE_GROUP_I18N_KEYS,
  TRAINING_METHODS,
  TRAINING_METHOD_I18N_KEYS
} from '../../types'
import type { BodyRegion, MovementType, TrainingMethod } from '../../types'
import ExerciseFormModal from '../exercises/ExerciseFormModal'
import ExerciseDetailModal from '../exercises/ExerciseDetailModal'

type FilterCategory = ExerciseCategory | 'all'

export default function ExercisesView() {
  const { t } = useTranslation(['exercises', 'common'])
  const { exercises, loading, fetchExercises, deleteExercise } = useExerciseStore()

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('all')
  const [movementFilter, setMovementFilter] = useState<MovementType | 'all'>('all')
  const [methodFilter, setMethodFilter] = useState<TrainingMethod | 'all'>('all')
  const [regionFilter, setRegionFilter] = useState<BodyRegion | 'all'>('all')
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
        t(MUSCLE_GROUP_I18N_KEYS[e.primary_muscle], { ns: 'common' }).toLowerCase().includes(q)
      const matchCat = categoryFilter === 'all' || e.category === categoryFilter
      const matchMove =
        movementFilter === 'all' ||
        e.movement_type === movementFilter ||
        (e.secondary_movements ?? []).includes(movementFilter)
      const matchMethod = methodFilter === 'all' || (e.methods ?? []).includes(methodFilter)
      const matchRegion = regionFilter === 'all' || e.body_region === regionFilter
      return matchSearch && matchCat && matchMove && matchMethod && matchRegion
    })
  }, [exercises, search, categoryFilter, movementFilter, methodFilter, regionFilter, t])

  const hasFilters =
    Boolean(search) ||
    categoryFilter !== 'all' ||
    movementFilter !== 'all' ||
    methodFilter !== 'all' ||
    regionFilter !== 'all'

  function handleEdit(exercise: Exercise) {
    setEditingExercise(exercise)
    setShowForm(true)
  }

  async function handleDelete(exercise: Exercise) {
    await deleteExercise(exercise.id)
  }

  const categories: FilterCategory[] = [
    'all',
    ...(Object.keys(CATEGORY_I18N_KEYS) as ExerciseCategory[])
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
            {t('builder.library', { ns: 'workouts' })}
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
            {t('title', { ns: 'exercises' })}
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
          + {t('new', { ns: 'exercises' })}
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
            F
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
              {cat === 'all' ? t('all', { ns: 'exercises' }) : t(CATEGORY_I18N_KEYS[cat], { ns: 'common' })}
            </button>
          ))}
        </div>

        <FilterRow label={t('fields.filter_movement', { ns: 'exercises' })}>
          <FilterChip
            active={movementFilter === 'all'}
            onClick={() => setMovementFilter('all')}
            label={t('fields.all', { ns: 'exercises' })}
          />
          {MOVEMENT_TYPES.map((mv) => (
            <FilterChip
              key={mv}
              active={movementFilter === mv}
              accent={MOVEMENT_TYPE_COLORS[mv]}
              onClick={() => setMovementFilter(movementFilter === mv ? 'all' : mv)}
              label={t(MOVEMENT_TYPE_I18N_KEYS[mv], { ns: 'common' })}
            />
          ))}
        </FilterRow>

        <FilterRow label={t('fields.filter_method', { ns: 'exercises' })}>
          <FilterChip
            active={methodFilter === 'all'}
            onClick={() => setMethodFilter('all')}
            label={t('fields.all', { ns: 'exercises' })}
          />
          {TRAINING_METHODS.map((mk) => (
            <FilterChip
              key={mk}
              active={methodFilter === mk}
              onClick={() => setMethodFilter(methodFilter === mk ? 'all' : mk)}
              label={t(TRAINING_METHOD_I18N_KEYS[mk], { ns: 'common' })}
            />
          ))}
        </FilterRow>

        <FilterRow label={t('fields.filter_region', { ns: 'exercises' })}>
          <FilterChip
            active={regionFilter === 'all'}
            onClick={() => setRegionFilter('all')}
            label={t('fields.all', { ns: 'exercises' })}
          />
          {BODY_REGIONS.map((r) => (
            <FilterChip
              key={r}
              active={regionFilter === r}
              onClick={() => setRegionFilter(regionFilter === r ? 'all' : r)}
              label={t(BODY_REGION_I18N_KEYS[r], { ns: 'common' })}
            />
          ))}
        </FilterRow>
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
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>EX</div>
          <p
            style={{
              fontFamily: 'var(--font-d)',
              fontSize: '1rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase'
            }}
          >
            {hasFilters
              ? t('empty_filtered', { ns: 'exercises' })
              : t('empty', { ns: 'exercises' })}
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
  const { t } = useTranslation(['common'])
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
          <span style={{ fontSize: '2rem', opacity: 0.15 }}>VID</span>
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
            <span style={{ fontSize: '1.75rem' }}>PLAY</span>
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
        {t(CATEGORY_I18N_KEYS[exercise.category], { ns: 'common' })}
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
          {t(MUSCLE_GROUP_I18N_KEYS[exercise.primary_muscle], { ns: 'common' })}
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
            {t(MUSCLE_GROUP_I18N_KEYS[m], { ns: 'common' })}
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

function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
      <span
        style={{
          fontFamily: 'var(--font-d)',
          fontSize: '0.6rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          minWidth: '4.5rem'
        }}
      >
        {label}
      </span>
      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>{children}</div>
    </div>
  )
}

function FilterChip({
  label,
  active,
  accent,
  onClick
}: {
  label: string
  active: boolean
  accent?: string
  onClick: () => void
}) {
  const color = accent ?? 'var(--orange)'
  return (
    <button
      type='button'
      onClick={onClick}
      style={{
        fontFamily: 'var(--font-d)',
        fontSize: '0.66rem',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        padding: '0.25rem 0.6rem',
        border: `1px solid ${active ? color : 'var(--border)'}`,
        background: active ? `${accent ? accent + '22' : 'rgba(255,77,0,0.1)'}` : 'transparent',
        color: active ? color : 'var(--muted)',
        cursor: 'pointer',
        transition: 'all 0.15s'
      }}
    >
      {label}
    </button>
  )
}
