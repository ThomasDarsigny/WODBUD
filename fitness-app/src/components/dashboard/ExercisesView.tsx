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
  // Écriture sur `exercises` réservée aux admins (RLS `exercises_admin_write`,
  // migrations 022-023) : sans ce contrôle, un coach verrait des boutons
  // « Nouvel exercice », « Modifier », « Supprimer » qui échouent
  // silencieusement en base.
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
    <div className="wb-page wb-page--wide">
      {/* L'exercice est enregistré mais sa vidéo ne l'est pas. Le formulaire
          s'est déjà fermé, donc l'avertissement vit ici, pas dans la modale. */}
      {videoWarning && (
        <div role="status" className="wb-card wb-card--accent wb-ex-warn">
          <span aria-hidden="true"><NavIcon name="video" size={18} /></span>
          <p>{videoWarning}</p>
          <button type="button" className="wb-btn wb-btn--secondary wb-btn--sm" onClick={dismissVideoWarning}>
            {t('actions.close', { ns: 'common' })}
          </button>
        </div>
      )}

      <header className="wb-ph">
        <div>
          <p className="wb-ph-tag">{t('builder.library', { ns: 'workouts' })}</p>
          <h1>{t('title', { ns: 'exercises' })} <span className="wb-ph-count">{exercises.length}</span></h1>
        </div>
        {isAdmin && (
          <button type="button" className="wb-btn wb-btn--primary" onClick={() => { setEditingExercise(undefined); setShowForm(true) }}>
            + {t('new', { ns: 'exercises' })}
          </button>
        )}
      </header>

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
        <div className="wb-grid wb-ex-grid wb-stagger">
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
          onEdit={isAdmin ? handleEdit : undefined}
          onDelete={isAdmin ? handleDelete : undefined}
        />
      )}
    </div>
  )
}

/**
 * Carte compacte : vignette, catégorie, nom, muscles. Le mannequin et la
 * vidéo complète vivent dans la fiche — sur téléphone, la liste doit se
 * parcourir d'un coup de pouce.
 */
function ExerciseCard({ exercise, onClick }: { exercise: Exercise; onClick: () => void }) {
  const { t } = useTranslation(['common'])
  return (
    <button type="button" className="wb-card wb-ex-card" onClick={onClick}>
      <span className="wb-ex-thumb">
        {exercise.video_url ? (
          <>
            <video src={exercise.video_url} muted preload="metadata" />
            <span className="wb-ex-play" aria-hidden="true"><NavIcon name="play" size={22} strokeWidth={1.75} /></span>
          </>
        ) : (
          <span className="wb-ex-novideo" aria-hidden="true"><NavIcon name="exercises" size={26} /></span>
        )}
      </span>
      <span className="wb-ex-body">
        <span className="wb-ex-cat">{t(CATEGORY_I18N_KEYS[exercise.category], { ns: 'common' })}</span>
        <strong>{exercise.name}</strong>
        <span className="wb-ex-muscles">
          <span className="wb-pill wb-pill--orange">{t(MUSCLE_GROUP_I18N_KEYS[exercise.primary_muscle], { ns: 'common' })}</span>
          {exercise.secondary_muscles.slice(0, 1).map((m) => (
            <span key={m} className="wb-pill">{t(MUSCLE_GROUP_I18N_KEYS[m], { ns: 'common' })}</span>
          ))}
          {exercise.secondary_muscles.length > 1 && <span className="wb-ex-more">+{exercise.secondary_muscles.length - 1}</span>}
        </span>
      </span>
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
    <div className="wb-ex-filters">
      <div className="wb-ex-searchrow">
        <div className="wb-search">
          <input
            type="search"
            className="wb-input"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
        </div>
        <button
          type="button"
          className={`wb-btn wb-btn--secondary wb-ex-ftoggle${activeCount > 0 ? ' is-active' : ''}`}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {t('fields.filters', { ns: 'exercises' })}
          {activeCount > 0 && <span className="wb-segmented-count">{activeCount}</span>}
        </button>
      </div>

      {open && <div className="wb-card wb-ex-fpanel">{children}</div>}

      <div className="wb-ex-count">
        <span>{resultCount} {t('fields.results', { ns: 'exercises' })}</span>
        {activeCount > 0 && (
          <button type="button" onClick={onReset}>{t('actions.reset', { ns: 'common' })}</button>
        )}
      </div>
    </div>
  )
}

/**
 * Le libellé passe AU-DESSUS des pastilles, pas à côté.
 * Sur téléphone, un libellé à gauche laissait une colonne trop étroite.
 */
function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="wb-ex-fgroup">
      <span>{label}</span>
      <div className="wb-chips">{children}</div>
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
  // Un type de mouvement garde sa couleur une fois choisi.
  const style = active && accent ? { background: accent, borderColor: accent } : undefined
  return (
    <button type="button" className="wb-chip" aria-pressed={active} onClick={onClick} style={style}>
      {label}
    </button>
  )
}
