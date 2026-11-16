import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useClassStore } from '../../stores/classStore'
import { useClassSlotStore } from '../../stores/classSlotStore'
import { useExerciseStore } from '../../stores/exerciseStore'
import { createClassPlan, fetchClassPlansBetween } from '../../lib/classPlans'
import { localDate, scheduleWorkout } from '../../lib/scheduledWorkouts'
import { nextSlotDate } from '../../lib/classSlots'
import { shiftDate } from '../../lib/planWeek'
import { conflictsFor, type DayLoad } from '../../lib/weekVolume'
import { supabase } from '../../lib/supabase'
import { MUSCLE_GROUP_I18N_KEYS, type MuscleGroup } from '../../types'

const JOURNAL = 'journal'

/**
 * Juste après « Sauvegarder » dans le créateur : programmer le WOD dans un
 * cours (ou dans son journal), sans changer de section (parcours de l'audit,
 * étape 4). Le jour proposé est le prochain jour de cours ; le garde-fou de
 * volume du planning prévient si un muscle est déjà travaillé la veille ou le
 * lendemain, sans bloquer.
 */
export default function ScheduleSavedWod({ workout, base, onClose }: {
  workout: { id: string; name: string; muscles: MuscleGroup[] }
  base: string
  onClose: () => void
}) {
  const { t, i18n } = useTranslation(['workouts', 'common'])
  const { classes, fetchClasses } = useClassStore()
  const slotsByClass = useClassSlotStore((s) => s.byClass)
  const fetchSlots = useClassSlotStore((s) => s.fetchSlots)
  const exercises = useExerciseStore((s) => s.exercises)
  const today = localDate()

  const [target, setTarget] = useState<string | null>(null)
  const [date, setDate] = useState(today)
  const [dateTouched, setDateTouched] = useState(false)
  // Conflits calculés pour un couple cours + jour ; affichés seulement s'ils correspondent au choix courant.
  const [conflictState, setConflictState] = useState<{ key: string; list: Array<{ muscle: MuscleGroup; date: string }> } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ where: string; date: string; classId: string | null } | null>(null)

  useEffect(() => { void fetchClasses() }, [fetchClasses])
  const classIds = classes.map((c) => c.id).join(',')
  useEffect(() => { if (classIds) void fetchSlots(classIds.split(',')) }, [classIds, fetchSlots])

  // Par défaut : le seul (ou le premier) cours, sinon le journal.
  const selected = target ?? (classes[0]?.id ?? JOURNAL)
  const classId = selected === JOURNAL ? null : selected

  // Le prochain jour de cours, tant que la date n'a pas été choisie à la main.
  const suggested = classId ? nextSlotDate(slotsByClass[classId] ?? [], today) : null
  const effectiveDate = dateTouched ? date : (suggested ?? today)

  const exerciseById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])
  const conflictKey = classId && workout.muscles.length > 0 ? `${classId}|${effectiveDate}` : null
  useEffect(() => {
    if (!classId || !conflictKey) return
    let alive = true
    void (async () => {
      const plans = await fetchClassPlansBetween(classId, shiftDate(effectiveDate, -1), shiftDate(effectiveDate, 1))
      const ids = [...new Set(plans.map((p) => p.workout_id).filter((id): id is string => Boolean(id)))]
      const { data } = ids.length ? await supabase.from('workout_exercises').select('workout_id, exercise_id').in('workout_id', ids) : { data: [] }
      const musclesOf = (wid: string | null) => (data ?? [])
        .filter((r) => r.workout_id === wid)
        .map((r) => exerciseById.get(r.exercise_id)?.primary_muscle)
        .filter((m): m is MuscleGroup => Boolean(m))
      const days: DayLoad[] = [shiftDate(effectiveDate, -1), shiftDate(effectiveDate, 1)].map((d) => ({
        date: d,
        primary: [...new Set(plans.filter((p) => p.scheduled_date === d).flatMap((p) => musclesOf(p.workout_id)))]
      }))
      if (alive) setConflictState({ key: conflictKey, list: conflictsFor(effectiveDate, workout.muscles, days) })
    })().catch(() => { /* le garde-fou est un bonus : sans lui, on programme quand même */ })
    return () => { alive = false }
  }, [classId, conflictKey, effectiveDate, workout.muscles, exerciseById])
  const conflicts = conflictState && conflictState.key === conflictKey ? conflictState.list : []

  const dayLabel = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })
  const className = (id: string | null) => classes.find((c) => c.id === id)?.name ?? ''

  async function schedule() {
    setBusy(true)
    setError(null)
    try {
      if (classId) {
        await createClassPlan({ classId, scheduledDate: effectiveDate, workoutId: workout.id, title: null, notes: null })
      } else {
        await scheduleWorkout({ scheduled_date: effectiveDate, workout_id: workout.id, title: null, notes: null })
      }
      setDone({ where: classId ? className(classId) : t('builder.schedule_journal'), date: effectiveDate, classId })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic', { ns: 'common' }))
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <section className="wb-schedwod is-done" role="status" aria-labelledby="schedwod-title">
        <p id="schedwod-title" className="wb-schedwod-title">✓ {t('builder.schedule_done', { name: workout.name, where: done.where, day: dayLabel(done.date) })}</p>
        <div className="wb-schedwod-actions">
          <Link
            className="wb-btn wb-btn--secondary wb-btn--sm"
            to={done.classId ? `${base}/classes?c=${done.classId}&tab=planning` : `${base}/journal`}
          >
            {done.classId ? t('builder.schedule_see_planning') : t('builder.schedule_see_journal')}
          </Link>
          <button type="button" className="wb-btn wb-btn--ghost wb-btn--sm" onClick={onClose}>{t('actions.close', { ns: 'common' })}</button>
        </div>
      </section>
    )
  }

  return (
    <section className="wb-schedwod" aria-labelledby="schedwod-title">
      <p id="schedwod-title" className="wb-schedwod-title">{t('builder.schedule_prompt', { name: workout.name })}</p>
      <div className="wb-schedwod-fields">
        <label className="wb-schedwod-field">
          <span>{t('builder.schedule_where')}</span>
          <select className="wb-input" value={selected} onChange={(e) => setTarget(e.target.value)}>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value={JOURNAL}>{t('builder.schedule_journal')}</option>
          </select>
        </label>
        <label className="wb-schedwod-field">
          <span>{t('builder.schedule_when')}</span>
          <input
            className="wb-input"
            type="date"
            value={effectiveDate}
            min={today}
            onChange={(e) => { setDate(e.target.value); setDateTouched(true) }}
          />
        </label>
      </div>
      {conflicts.length > 0 && (
        <ul className="wb-schedwod-warn" aria-label={t('builder.schedule_guard')}>
          {conflicts.map((c) => (
            <li key={`${c.muscle}-${c.date}`}>⚠ {t('classes.guard_conflict', { ns: 'common', muscle: t(MUSCLE_GROUP_I18N_KEYS[c.muscle], { ns: 'common' }), day: dayLabel(c.date) })}</li>
          ))}
        </ul>
      )}
      {error && <p className="wb-schedwod-error" role="alert">{error}</p>}
      <div className="wb-schedwod-actions">
        <button type="button" className="wb-btn wb-btn--primary wb-btn--sm" disabled={busy} onClick={() => { void schedule() }}>
          {busy ? t('status.loading', { ns: 'common' }) : t('builder.schedule_action')}
        </button>
        <button type="button" className="wb-btn wb-btn--ghost wb-btn--sm" onClick={onClose}>{t('builder.schedule_later')}</button>
      </div>
    </section>
  )
}
