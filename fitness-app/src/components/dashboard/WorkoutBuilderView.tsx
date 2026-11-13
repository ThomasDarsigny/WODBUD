import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import EmptyState from '../ui/EmptyState'
import { useExerciseStore } from '../../stores/exerciseStore'
import { useWorkoutStore } from '../../stores/workoutStore'
import type { Exercise, WorkoutExercise, MuscleAlert, WorkoutMethod, ExerciseCategory, MuscleGroup } from '../../types'
import { METHOD_I18N_KEYS, MUSCLE_GROUP_I18N_KEYS, CATEGORY_LABELS, MUSCLE_GROUP_LABELS } from '../../types'
import ExerciseDetailModal from '../exercises/ExerciseDetailModal'
import Mannequin2D from '../mannequin/Mannequin2D'
import { computeMuscleLoads } from '../../lib/muscleLoad'
import Field from '../ui/Field'
import AlertDialog from '../ui/AlertDialog'
import { pdfFileName } from '../pdf/pdfTokens'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { useAvailableEquipment } from '../../hooks/useAvailableEquipment'
import { missingEquipment, type EquipmentId } from '../../lib/equipment'
import TooEasyPanel from '../workouts/TooEasyPanel'
import { useSpaceBase } from '../../hooks/useSpaceBase'
import AdaptPanel from '../workouts/AdaptPanel'
import PickerExerciseRow from '../workouts/PickerExerciseRow'
import BuilderFilters from '../workouts/BuilderFilters'

export default function WorkoutBuilderView() {
  const { t, i18n } = useTranslation(['workouts', 'common'])
  const { exercises, fetchExercises } = useExerciseStore()
  const {
    name,
    method,
    durationMinutes,
    notes,
    exercises: workoutExercises,
    muscleAlerts,
    setName,
    setMethod,
    setDuration,
    setNotes,
    addExercise,
    removeExercise,
    updateExerciseConfig,
    replaceExercise,
    saveWorkout,
    resetDraft,
    draftRestoredAt,
    loadingSave,
    error
  } = useWorkoutStore()

  const [search, setSearch] = useState('')
  // Téléphone : un seul panneau à la fois, choisi par un contrôle segmenté
  // (façon iOS) — deux colonnes ne tiennent pas sur 390 px.
  const isMobile = useIsMobile()
  const [pane, setPane] = useState<'library' | 'workout'>(() => (workoutExercises.length === 0 ? 'library' : 'workout'))
  const [selectedCategories, setSelectedCategories] = useState<ExerciseCategory[]>([])
  const [selectedMuscles, setSelectedMuscles] = useState<MuscleGroup[]>([])
  const [pickerExercise, setPickerExercise] = useState<Exercise | undefined>()
  const [savedSuccess, setSavedSuccess] = useState(false)
  // Ce qui manque pour enregistrer : dit à voix haute plutôt qu'un bouton
  // grisé muet (le nom vide passait inaperçu).
  const [missing, setMissing] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const [loadingPdf, setLoadingPdf] = useState(false)
  const [restOverridePrompt, setRestOverridePrompt] = useState<{
    exercise: Exercise
    message: string
    hoursRemaining?: number
    forceCardioSequence?: boolean
  } | null>(null)
  const [cardioOverridePrompt, setCardioOverridePrompt] = useState<{
    exercise: Exercise
    message: string
  } | null>(null)

  useEffect(() => {
    if (exercises.length === 0) fetchExercises()
  }, [exercises.length, fetchExercises])

  // Équipement sous la main (centre, sinon compte) : sert à proposer d'abord
  // les exercices faisables.
  const available = useAvailableEquipment()
  const base = useSpaceBase()
  const [onlyDoable, setOnlyDoable] = useState(false)
  // Filtres repliés sur téléphone (ils prenaient le premier écran), ouverts sur grand écran.
  const [filtersOpen, setFiltersOpen] = useState(() => !isMobile)
  // Ajout direct par « + » : un exercice à la fois, et un retour bref.
  const [addingId, setAddingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  const normalizedSearch = search.trim().toLowerCase()

  const muscleLoads = useMemo(() => computeMuscleLoads(workoutExercises), [workoutExercises])

  const filteredExercises = exercises.filter((exercise) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      exercise.name.toLowerCase().includes(normalizedSearch) ||
      CATEGORY_LABELS[exercise.category].toLowerCase().includes(normalizedSearch) ||
      MUSCLE_GROUP_LABELS[exercise.primary_muscle].toLowerCase().includes(normalizedSearch) ||
      exercise.secondary_muscles.some((muscle) =>
        MUSCLE_GROUP_LABELS[muscle].toLowerCase().includes(normalizedSearch)
      )

    const matchesCategory =
      selectedCategories.length === 0 || selectedCategories.includes(exercise.category)

    const exerciseMuscles = [exercise.primary_muscle, ...exercise.secondary_muscles]
    const matchesMuscle =
      selectedMuscles.length === 0 || selectedMuscles.some((muscle) => exerciseMuscles.includes(muscle))

    return matchesSearch && matchesCategory && matchesMuscle
  })

  // Faisables d'abord (tri stable : l'ordre alphabétique est gardé dans
  // chaque groupe). Sans équipement connu, la liste reste telle quelle.
  const missingById = useMemo(() => {
    const map = new Map<string, EquipmentId[]>()
    if (!available) return map
    for (const e of exercises) map.set(e.id, missingEquipment(e.equipment, available.equipment))
    return map
  }, [exercises, available])
  const sortedExercises = available
    ? [...filteredExercises].filter((e) => !onlyDoable || (missingById.get(e.id)?.length ?? 0) === 0).sort(
        (a, b) => Number((missingById.get(a.id)?.length ?? 0) > 0) - Number((missingById.get(b.id)?.length ?? 0) > 0)
      )
    : filteredExercises

  function toggleCategory(category: ExerciseCategory) {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((value) => value !== category)
        : [...current, category]
    )
  }

  function toggleMuscle(muscle: MuscleGroup) {
    setSelectedMuscles((current) =>
      current.includes(muscle)
        ? current.filter((value) => value !== muscle)
        : [...current, muscle]
    )
  }

  async function handleSave() {
    if (workoutExercises.length === 0) {
      setMissing(t('errors.add_at_least_one_exercise', { ns: 'workouts' }))
      return
    }
    if (!name.trim()) {
      setMissing(t('errors.workout_name_required', { ns: 'workouts' }))
      nameRef.current?.focus()
      return
    }
    setMissing(null)
    try {
      await saveWorkout()
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 3000)
    } catch {
      // handled by store error state
    }
  }

  async function handleExportPdf() {
    if (workoutExercises.length === 0 || !name.trim()) return
    setLoadingPdf(true)
    try {
      const workout = {
        id: 'preview',
        name,
        method,
        duration_minutes: durationMinutes,
        notes,
        exercises: workoutExercises,
        created_at: new Date().toISOString()
      }
      // Chargé au clic : le moteur PDF pèse plus que tout le reste de l'écran.
      const [{ pdf }, { WorkoutPdfFull }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../pdf/workoutPDF')
      ])
      const blob = await pdf(
        <WorkoutPdfFull workout={workout} theme='dark' qrDataUrls={{}} />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = pdfFileName(name, 'complet', 'dark')
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoadingPdf(false)
    }
  }

  async function handleAddFromPicker(ex: Exercise): Promise<boolean> {
    const firstTry = await addExercise(ex)
    if (firstTry.added) return true

    if (firstTry.requiresCardioSequenceOverride && firstTry.cardioSequenceMessage) {
      setCardioOverridePrompt({
        exercise: ex,
        message: firstTry.cardioSequenceMessage
      })
      return false
    }

    if (firstTry.requiresRestOverride && firstTry.restWarningMessage) {
      setRestOverridePrompt({
        exercise: ex,
        message: firstTry.restWarningMessage,
        hoursRemaining: firstTry.hoursRemaining,
        forceCardioSequence: false
      })
      return false
    }

    return false
  }

  function showAdded(exerciseName: string) {
    setToast(t('builder.added_toast', { name: exerciseName }))
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 1800)
  }

  async function quickAdd(ex: Exercise) {
    if (addingId) return
    setAddingId(ex.id)
    try {
      if (await handleAddFromPicker(ex)) showAdded(ex.name)
    } finally {
      setAddingId(null)
    }
  }

  async function confirmOverrideAdd() {
    if (!restOverridePrompt) return
    const forcedTry = await addExercise(restOverridePrompt.exercise, {
      forceRest: true,
      forceCardioSequence: restOverridePrompt.forceCardioSequence
    })
    setRestOverridePrompt(null)
    if (forcedTry.added) { setPickerExercise(undefined); showAdded(restOverridePrompt.exercise.name) }
  }

  async function confirmCardioOverrideAdd() {
    if (!cardioOverridePrompt) return

    const forcedTry = await addExercise(cardioOverridePrompt.exercise, {
      forceCardioSequence: true
    })

    if (forcedTry.added) {
      setCardioOverridePrompt(null)
      setPickerExercise(undefined)
      showAdded(cardioOverridePrompt.exercise.name)
      return
    }

    if (forcedTry.requiresRestOverride && forcedTry.restWarningMessage) {
      setRestOverridePrompt({
        exercise: cardioOverridePrompt.exercise,
        message: forcedTry.restWarningMessage,
        hoursRemaining: forcedTry.hoursRemaining,
        forceCardioSequence: true
      })
    }

    setCardioOverridePrompt(null)
  }

  const riskLevel =
    restOverridePrompt?.hoursRemaining !== undefined
      ? restOverridePrompt.hoursRemaining >= 24
        ? 'eleve'
        : restOverridePrompt.hoursRemaining >= 12
          ? 'moyen'
          : 'modere'
      : null

  const riskText =
    riskLevel === 'eleve'
      ? t('alerts.risk_high', { ns: 'workouts' })
      : riskLevel === 'moyen'
        ? t('alerts.risk_medium', { ns: 'workouts' })
        : riskLevel === 'modere'
          ? t('alerts.risk_moderate', { ns: 'workouts' })
          : ''

  return (
    <div className={`wb-builder${isMobile ? ' is-mobile' : ''}`}>
      {isMobile && (
        <div className="wb-segmented" role="tablist" aria-label={t('builder.panes_label', { ns: 'workouts' })}>
          <button type="button" role="tab" aria-selected={pane === 'library'} className={pane === 'library' ? 'is-on' : undefined} onClick={() => setPane('library')}>
            {t('builder.library', { ns: 'workouts' })}
          </button>
          <button type="button" role="tab" aria-selected={pane === 'workout'} className={pane === 'workout' ? 'is-on' : undefined} onClick={() => setPane('workout')}>
            {t('builder.workout_section', { ns: 'workouts' })}
            {workoutExercises.length > 0 && <span className="wb-segmented-count">{workoutExercises.length}</span>}
          </button>
        </div>
      )}

      {/* Bibliothèque */}
      <div className={`wb-builder-lib${isMobile && pane !== 'library' ? ' is-hidden' : ''}`}>
        <div className="wb-builder-lib-head">
          <p className="wb-ph-tag">{t('builder.library', { ns: 'workouts' })}</p>
          <h1 className="wb-builder-title">{t('builder.choose_exercise', { ns: 'workouts' })}</h1>
          <div className="wb-search">
            <input
              id="builder-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('builder.search_placeholder', { ns: 'workouts' })}
              aria-label={t('builder.search_label', { ns: 'workouts' })}
              className="wb-input"
            />
          </div>
          <BuilderFilters
            open={filtersOpen}
            onToggle={() => setFiltersOpen((v) => !v)}
            available={available}
            editEquipmentTo={`${base}/settings`}
            onlyDoable={onlyDoable}
            onOnlyDoable={() => setOnlyDoable((v) => !v)}
            categories={selectedCategories}
            onCategory={toggleCategory}
            muscles={selectedMuscles}
            onMuscle={toggleMuscle}
            onClear={() => { setSelectedCategories([]); setSelectedMuscles([]); setOnlyDoable(false) }}
          />
        </div>

        <div className="wb-builder-lib-list">
          {filteredExercises.length === 0 ? (
            <p className="wb-builder-empty">{t('empty', { ns: 'workouts' })}</p>
          ) : (
            <div className="wb-pick-list">
              {sortedExercises.map((exercise) => (
                <PickerExerciseRow
                  key={exercise.id}
                  exercise={exercise}
                  missing={missingById.get(exercise.id) ?? []}
                  count={workoutExercises.filter((we) => we.exercise.id === exercise.id).length}
                  onOpen={() => setPickerExercise(exercise)}
                  onAdd={() => { void quickAdd(exercise) }}
                  adding={addingId === exercise.id}
                />
              ))}
            </div>
          )}
        </div>
        {isMobile && workoutExercises.length > 0 && (
          <button type="button" className="wb-builder-tray" onClick={() => setPane('workout')}>
            <span>{t('builder.tray', { ns: 'workouts', count: workoutExercises.length })}</span>
            <span aria-hidden="true">›</span>
          </button>
        )}
        <p className="wb-builder-toast" role="status" aria-live="polite">{toast}</p>
      </div>

      {/* Le WOD. Une seule zone qui défile : avec le mannequin et les alertes,
          une liste en flex: 1 dans une colonne de 100vh tombait à zéro hauteur. */}
      <div className={`wb-builder-wod${isMobile && pane !== 'workout' ? ' is-hidden' : ''}`}>
        <div className="wb-builder-wod-head">
          <p className="wb-builder-eyebrow">{t('builder.workout_section', { ns: 'workouts' })}</p>
          <input
            ref={nameRef}
            id="builder-name"
            className={`wb-builder-name${missing && !name.trim() ? ' is-missing' : ''}`}
            aria-label={t('builder.name_label', { ns: 'workouts' })}
            value={name}
            onChange={(e) => { setName(e.target.value); setMissing(null) }}
            placeholder={t('builder.name_placeholder', { ns: 'workouts' })}
            aria-invalid={missing !== null && !name.trim()}
          />
          <div className="wb-builder-meta">
            <Field label={t('fields.method', { ns: 'workouts' })}>
              <select id="builder-method" className="wb-input" value={method} onChange={(e) => setMethod(e.target.value as WorkoutMethod)}>
                {Object.entries(METHOD_I18N_KEYS).map(([val, key]) => (
                  <option key={val} value={val}>{t(key, { ns: 'common' })}</option>
                ))}
              </select>
            </Field>
            <Field label={`${t('fields.duration', { ns: 'workouts' })} (${t('fields.duration_unit_min', { ns: 'workouts' })})`}>
              <input
                id="builder-duration"
                className="wb-input"
                type="number"
                value={durationMinutes ?? ''}
                onChange={(e) => setDuration(e.target.value ? Number.parseInt(e.target.value, 10) : undefined)}
                placeholder="20"
                min={1}
              />
            </Field>
          </div>
        </div>

        <section className="wb-builder-sec" aria-labelledby="builder-zones">
          <p id="builder-zones" className="wb-builder-sec-title">{t('mannequin.title', { ns: 'common' })}</p>
          {workoutExercises.length === 0 ? (
            <p className="wb-builder-hint">{t('mannequin.no_data', { ns: 'common' })}</p>
          ) : (
            <Mannequin2D loads={muscleLoads} height={300} bothViews />
          )}
        </section>

        {muscleAlerts.length > 0 && (
          <div className="wb-builder-alerts">
            {muscleAlerts.map((alert) => (
              <MuscleAlertBadge key={alert.muscle} alert={alert} />
            ))}
          </div>
        )}

        <div className="wb-builder-exercises">
          {workoutExercises.length === 0 ? (
            <EmptyState
              compact
              icon="workout"
              title={t('builder.empty_state', { ns: 'workouts' })}
              hint={t('empty_hint', { ns: 'workouts' })}
            />
          ) : (
            <div className="wb-builder-slots">
              {workoutExercises.map((we) => (
                <WorkoutExerciseSlot
                  key={we.id}
                  workoutExercise={we}
                  alert={muscleAlerts.find((a) => a.muscle === we.exercise.primary_muscle)}
                  onRemove={() => removeExercise(we.id)}
                  onUpdate={(config) => updateExerciseConfig(we.id, config)}
                  onReplace={(exercise) => replaceExercise(we.id, exercise)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="wb-builder-notes">
          <textarea
            id="builder-notes"
            className="wb-input wb-builder-notes-input"
            aria-label={t('builder.notes_label', { ns: 'workouts' })}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('builder.notes_placeholder', { ns: 'workouts' })}
            rows={2}
          />
        </div>

        <div className="wb-builder-foot">
          {((missing && (workoutExercises.length === 0 || !name.trim())) || error) && (
            <div role="alert" className="wb-builder-error">
              {missing && (workoutExercises.length === 0 || !name.trim()) ? missing : error}
            </div>
          )}
          {draftRestoredAt && (
            <div className="wb-draft" role="status">
              <span aria-hidden="true">↺</span>
              <span>{t('builder.draft_restored', { ns: 'workouts', when: new Date(draftRestoredAt).toLocaleString(i18n.language, { weekday: 'short', hour: '2-digit', minute: '2-digit' }) })}</span>
              <button type="button" onClick={resetDraft}>{t('builder.draft_discard', { ns: 'workouts' })}</button>
            </div>
          )}
          <div className="wb-builder-actions">
            <button type="button" onClick={resetDraft} className="wb-btn wb-btn--ghost wb-btn--sm wb-builder-reset">
              {t('builder.reset', { ns: 'workouts' })}
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={loadingPdf || workoutExercises.length === 0 || !name.trim()}
              className="wb-btn wb-btn--ghost wb-btn--sm wb-builder-pdf"
            >
              {loadingPdf ? t('builder.pdf_loading', { ns: 'workouts' }) : t('builder.pdf_export', { ns: 'workouts' })}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loadingSave}
              className={`wb-btn wb-btn--primary wb-builder-save${savedSuccess ? ' is-saved' : ''}`}
            >
              {savedSuccess
                ? t('builder.saved', { ns: 'workouts' })
                : loadingSave
                  ? t('builder.saving', { ns: 'workouts' })
                  : t('builder.save', { ns: 'workouts' })}
            </button>
          </div>
        </div>
      </div>

      {pickerExercise && (
        <ExerciseDetailModal
          exercise={pickerExercise}
          onClose={() => setPickerExercise(undefined)}
          onAddToWorkout={handleAddFromPicker}
          onOpenExercise={setPickerExercise}
          inWorkoutBuilder
        />
      )}

      {cardioOverridePrompt && (
        <AlertDialog
          title={t('alerts.cardio_title', { ns: 'workouts' })}
          onClose={() => setCardioOverridePrompt(null)}
          actions={(
            <>
              <button type="button" autoFocus onClick={() => setCardioOverridePrompt(null)} className="wb-btn wb-btn--ghost wb-btn--sm">
                {t('builder.override_cancel', { ns: 'workouts' })}
              </button>
              <button type="button" onClick={confirmCardioOverrideAdd} className="wb-btn wb-btn--primary wb-btn--sm">
                {t('builder.override_confirm', { ns: 'workouts' })}
              </button>
            </>
          )}
        >
          <p>{cardioOverridePrompt.message}</p>
        </AlertDialog>
      )}

      {restOverridePrompt && (
        <AlertDialog
          title={t('alerts.rest48_title', { ns: 'workouts' })}
          tone="amber"
          onClose={() => setRestOverridePrompt(null)}
          actions={(
            <>
              <button type="button" autoFocus onClick={() => setRestOverridePrompt(null)} className="wb-btn wb-btn--ghost wb-btn--sm">
                {t('builder.override_cancel', { ns: 'workouts' })}
              </button>
              <button type="button" onClick={confirmOverrideAdd} className="wb-btn wb-btn--sm wb-btn--amber">
                {t('builder.override_confirm', { ns: 'workouts' })}
              </button>
            </>
          )}
        >
          <p>{restOverridePrompt.message}</p>
          {riskLevel && <p className={`wb-alert-risk wb-alert-risk--${riskLevel}`}>{riskText}</p>}
        </AlertDialog>
      )}
    </div>
  )
}

function WorkoutExerciseSlot({
  workoutExercise: we,
  alert,
  onRemove,
  onUpdate,
  onReplace
}: {
  workoutExercise: WorkoutExercise
  alert?: MuscleAlert
  onRemove: () => void
  onUpdate: (config: Partial<Pick<WorkoutExercise, 'sets' | 'reps' | 'weight' | 'rest_seconds' | 'notes'>>) => void
  onReplace: (exercise: Exercise) => void
}) {
  const { t } = useTranslation('workouts')
  const [expanded, setExpanded] = useState(false)
  const [panel, setPanel] = useState<'easy' | 'adapt' | null>(null)

  const tone = alert?.level === 'danger' ? ' is-danger' : alert?.level === 'warning' ? ' is-warning' : ''

  return (
    <div className={`wb-slot${tone}`}>
      <div className="wb-slot-row">
        <span className="wb-slot-pos">{we.position}</span>

        <div className="wb-slot-main">
          <p className="wb-slot-name">{we.exercise.name}</p>
          <p className="wb-slot-sub">
            {t(MUSCLE_GROUP_I18N_KEYS[we.exercise.primary_muscle], { ns: 'common' })}
            {alert && ` · ${alert.level === 'danger' ? t('alerts.risk_high') : t('alerts.risk_medium')}`}
          </p>
        </div>

        <input
          type="text"
          className="wb-slot-num wb-slot-num--reps"
          value={we.reps ?? ''}
          onChange={(e) => {
            const parsed = Number.parseInt(e.target.value, 10)
            onUpdate({ reps: Number.isNaN(parsed) ? undefined : parsed })
          }}
          placeholder={t('fields.reps')}
          aria-label={`${t('fields.reps')} — ${we.exercise.name}`}
        />
        <span className="wb-slot-x" aria-hidden="true">×</span>
        <input
          type="number"
          className="wb-slot-num"
          value={we.sets ?? ''}
          onChange={(e) => onUpdate({ sets: Number.parseInt(e.target.value, 10) || undefined })}
          placeholder={t('fields.sets')}
          aria-label={`${t('fields.sets')} — ${we.exercise.name}`}
          min={1}
        />

        <button
          type="button"
          className="wb-slot-icon"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-label={t(expanded ? 'builder.slot_hide' : 'builder.slot_details', { name: we.exercise.name })}
        >
          {expanded ? '▲' : '▼'}
        </button>
        <button type="button" className="wb-slot-icon" onClick={onRemove} aria-label={t('builder.slot_remove', { name: we.exercise.name })}>
          ✕
        </button>
      </div>

      {expanded && (
        <div className="wb-slot-details">
          <Field label={t('fields.weight_intensity')}>
            <input type="text" className="wb-input wb-input--compact" value={we.weight ?? ''} onChange={(e) => onUpdate({ weight: e.target.value })} placeholder="60kg / BW / 70%1RM" />
          </Field>
          <Field label={`${t('fields.rest')} (s)`}>
            <input
              type="number"
              className="wb-input wb-input--compact"
              value={we.rest_seconds ?? ''}
              onChange={(e) => onUpdate({ rest_seconds: Number.parseInt(e.target.value, 10) || undefined })}
              placeholder="60"
              min={0}
            />
          </Field>
          <div>
            {panel === 'easy' ? (
              <TooEasyPanel
                workoutExercise={we}
                onLoad={(weight) => { onUpdate({ weight }); setPanel(null) }}
                onReplace={(exercise) => { onReplace(exercise); setPanel(null) }}
                onClose={() => setPanel(null)}
              />
            ) : panel === 'adapt' ? (
              <AdaptPanel
                workoutExercise={we}
                onReplace={(exercise) => { onReplace(exercise); setPanel(null) }}
                onClose={() => setPanel(null)}
              />
            ) : (
              <div className="wb-links-chips">
                <button type="button" className="wb-chip wb-tooeasy-btn" onClick={() => setPanel('easy')}>
                  {t('progression.too_easy')}
                </button>
                <button type="button" className="wb-chip wb-tooeasy-btn" onClick={() => setPanel('adapt')}>
                  {t('progression.adapt')}
                </button>
              </div>
            )}
          </div>
          <Field label={t('fields.notes')}>
            <input type="text" className="wb-input wb-input--compact" value={we.notes ?? ''} onChange={(e) => onUpdate({ notes: e.target.value })} placeholder={t('fields.instructions')} />
          </Field>
        </div>
      )}
    </div>
  )
}

function MuscleAlertBadge({ alert }: { alert: MuscleAlert }) {
  const { t } = useTranslation('workouts')
  const isDanger = alert.level === 'danger'
  return (
    <div className={`wb-muscle-alert${isDanger ? ' is-danger' : ''}`}>
      <span className="wb-muscle-alert-level">{isDanger ? 'HIGH' : 'MED'}</span>
      <span className="wb-muscle-alert-name">{t(MUSCLE_GROUP_I18N_KEYS[alert.muscle], { ns: 'common' })}</span>
      <span className="wb-muscle-alert-text">
        {isDanger ? t('alerts.primary_repeated', { count: alert.count }) : t('alerts.secondary_repeated', { count: alert.count })}
      </span>
    </div>
  )
}
