import { useState, useEffect, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import EmptyState from '../ui/EmptyState'
import NavIcon from '../navigation/NavIcon'
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
import { useIsMobile } from '../../hooks/useMediaQuery'
import { btnPrimary as emptyActionStyle } from '../../styles/ui'
import { SkeletonCards } from '../ui/Skeleton'
import { isCurrentUserAdmin } from '../../lib/access'

type FilterCategory = ExerciseCategory | 'all'

export default function ExercisesView() {
  const { t } = useTranslation(['exercises', 'common'])
  const { exercises, loading, fetchExercises, deleteExercise, videoWarning, dismissVideoWarning } =
    useExerciseStore()

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('all')
  const [movementFilter, setMovementFilter] = useState<MovementType | 'all'>('all')
  const [methodFilter, setMethodFilter] = useState<TrainingMethod | 'all'>('all')
  const [regionFilter, setRegionFilter] = useState<BodyRegion | 'all'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | undefined>()
  const [detailExercise, setDetailExercise] = useState<Exercise | undefined>()
  // Création d'exercice réservée aux admins (RLS `exercises_admin_write`
  // depuis la migration 022) : sans ce contrôle, un coach verrait un bouton
  // « Nouvel exercice » qui échoue silencieusement en base.
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetchExercises()
  }, [fetchExercises])

  useEffect(() => {
    let mounted = true
    isCurrentUserAdmin().then((v) => { if (mounted) setIsAdmin(v) })
    return () => { mounted = false }
  }, [])

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

  // Un compteur plutôt qu'un booléen : le bouton doit dire combien de filtres
  // sont posés, sinon on ouvre le panneau juste pour vérifier.
  const activeFilterCount =
    (categoryFilter !== 'all' ? 1 : 0) +
    (movementFilter !== 'all' ? 1 : 0) +
    (methodFilter !== 'all' ? 1 : 0) +
    (regionFilter !== 'all' ? 1 : 0)

  const hasFilters = Boolean(search) || activeFilterCount > 0

  function resetFilters() {
    setSearch('')
    setCategoryFilter('all')
    setMovementFilter('all')
    setMethodFilter('all')
    setRegionFilter('all')
  }

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
    <div style={{ padding: 'var(--page-pad)', minHeight: '100%' }}>
      {/* L'exercice est enregistré mais sa vidéo ne l'est pas. Le formulaire
          s'est déjà fermé, donc l'avertissement vit ici, pas dans la modale. */}
      {videoWarning && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            border: '1px solid rgba(255, 77, 0, 0.35)',
            background: 'rgba(255, 77, 0, 0.07)',
            padding: '0.85rem 1rem',
            marginBottom: '1.25rem'
          }}
        >
          <span style={{ color: 'var(--orange)', flexShrink: 0, display: 'flex', marginTop: 2 }}>
            <NavIcon name="video" size={18} />
          </span>
          <p style={{ margin: 0, flex: 1, fontSize: '0.8125rem', lineHeight: 1.55 }}>
            {videoWarning}
          </p>
          <button
            onClick={dismissVideoWarning}
            style={{
              fontFamily: 'var(--font-d)',
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--muted)',
              padding: '0.35rem 0.7rem',
              minHeight: 44,
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            {t('actions.close', { ns: 'common' })}
          </button>
        </div>
      )}

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
              fontSize: '0.6875rem',
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
              fontSize: '1.75rem',
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
        {isAdmin && (
          <button
            onClick={() => {
              setEditingExercise(undefined)
              setShowForm(true)
            }}
            style={{
              fontFamily: 'var(--font-d)',
              fontWeight: 700,
              fontSize: '0.9375rem',
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
        )}
      </div>

      <FilterPanel
        search={search}
        onSearch={setSearch}
        searchPlaceholder={t('search', { ns: 'exercises' })}
        activeCount={activeFilterCount}
        onReset={resetFilters}
        resultCount={filtered.length}
      >
        <FilterGroup label={t('fields.filter_category', { ns: 'exercises' })}>
          {categories.map((cat) => (
            <FilterChip
              key={cat}
              active={categoryFilter === cat}
              onClick={() => setCategoryFilter(cat)}
              label={cat === 'all' ? t('all', { ns: 'exercises' }) : t(CATEGORY_I18N_KEYS[cat], { ns: 'common' })}
            />
          ))}
        </FilterGroup>

        <FilterGroup label={t('fields.filter_movement', { ns: 'exercises' })}>
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
        </FilterGroup>

        <FilterGroup label={t('fields.filter_method', { ns: 'exercises' })}>
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
        </FilterGroup>

        <FilterGroup label={t('fields.filter_region', { ns: 'exercises' })}>
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
        </FilterGroup>
      </FilterPanel>

      {loading ? (
        <SkeletonCards count={8} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={hasFilters ? 'search' : 'exercises'}
          title={
            hasFilters
              ? t('empty_filtered', { ns: 'exercises' })
              : t('empty', { ns: 'exercises' })
          }
          hint={
            hasFilters
              ? t('empty_filtered_hint', { ns: 'exercises' })
              : t('empty_hint', { ns: 'exercises' })
          }
          action={
            hasFilters ? (
              <button onClick={resetFilters} style={emptyActionStyle}>
                {t('actions.reset', { ns: 'common' })}
              </button>
            ) : undefined
          }
        />
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
          <span style={{ opacity: 0.2, display: 'flex' }}><NavIcon name="video" size={32} /></span>
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
            <span style={{ color: 'var(--white)', display: 'flex' }}><NavIcon name="play" size={34} strokeWidth={1.5} /></span>
          </div>
        )}
      </div>

      <span
        style={{
          fontFamily: 'var(--font-d)',
          fontSize: '0.6875rem',
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
          fontSize: '1rem',
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
            fontSize: '0.6875rem',
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
              fontSize: '0.6875rem',
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
          <span style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
            +{exercise.secondary_muscles.length - 2}
          </span>
        )}
      </div>
    </button>
  )
}

/**
 * Panneau de filtres.
 *
 * Repliable et fermé par défaut sur téléphone : quatre groupes de pastilles
 * dépliés poussaient la liste d'exercices sous la ligne de flottaison. Le
 * bouton porte le nombre de filtres actifs, donc on sait ce qui est posé sans
 * avoir à ouvrir.
 */
function FilterPanel({
  search,
  onSearch,
  searchPlaceholder,
  activeCount,
  onReset,
  resultCount,
  children
}: {
  search: string
  onSearch: (v: string) => void
  searchPlaceholder: string
  activeCount: number
  onReset: () => void
  resultCount: number
  children: ReactNode
}) {
  const { t } = useTranslation(['exercises', 'common'])
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(!isMobile)

  return (
    <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <input
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder={searchPlaceholder}
        style={{
          width: '100%',
          background: 'var(--dark)',
          border: '1px solid var(--border)',
          color: 'var(--white)',
          padding: '0.8rem 1rem',
          fontFamily: 'var(--font-b)',
          fontSize: '1rem',
          outline: 'none',
          boxSizing: 'border-box'
        }}
      />

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type='button'
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          style={{
            flex: '1 1 auto',
            minHeight: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.6rem',
            fontFamily: 'var(--font-d)',
            fontSize: '0.8125rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            padding: '0.6rem 1rem',
            border: `1px solid ${activeCount > 0 ? 'var(--orange)' : 'var(--border)'}`,
            background: activeCount > 0 ? 'rgba(255,77,0,0.08)' : 'var(--dark)',
            color: activeCount > 0 ? 'var(--orange)' : 'var(--white)',
            cursor: 'pointer'
          }}
        >
          <span>
            {t('fields.filters', { ns: 'exercises' })}
            {activeCount > 0 ? ` (${activeCount})` : ''}
          </span>
          <span style={{ fontSize: '0.8125rem' }}>{open ? '▲' : '▼'}</span>
        </button>

        {activeCount > 0 && (
          <button
            type='button'
            onClick={onReset}
            style={{
              minHeight: 44,
              fontFamily: 'var(--font-d)',
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '0.6rem 1rem',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--muted)',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {t('actions.reset', { ns: 'common' })}
          </button>
        )}
      </div>

      {open && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.1rem',
            border: '1px solid var(--border)',
            background: 'var(--dark)',
            padding: '1.1rem'
          }}
        >
          {children}
        </div>
      )}

      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-d)',
          fontSize: '0.6875rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--muted)'
        }}
      >
        {resultCount} {t('fields.results', { ns: 'exercises' })}
      </p>
    </div>
  )
}

/**
 * Le libellé passe AU-DESSUS des pastilles, pas à côté.
 * Sur téléphone, un libellé de 4,5 rem à gauche laissait une colonne trop
 * étroite : les pastilles se mettaient en escalier, une ou deux par ligne.
 */
function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <span
        style={{
          fontFamily: 'var(--font-d)',
          fontSize: '0.6875rem',
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--orange)'
        }}
      >
        {label}
      </span>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>{children}</div>
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
        fontSize: '0.8125rem',
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        // 38 px de haut : sous ~36 px une pastille devient difficile à viser au pouce.
        minHeight: 44,
        padding: '0.5rem 0.85rem',
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

