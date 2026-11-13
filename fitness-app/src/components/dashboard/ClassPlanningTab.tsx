import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createClassPlan, deleteClassPlan, fetchClassPlans, type ClassPlan } from '../../lib/classPlans'
import { Link } from 'react-router-dom'
import ClassWeekPlanner from './ClassWeekPlanner'
import { localDate } from '../../lib/scheduledWorkouts'
import { useWorkoutStore } from '../../stores/workoutStore'
import ConfirmButton from '../ui/ConfirmButton'
import EmptyState from '../ui/EmptyState'
import Skeleton from '../ui/Skeleton'
import Field from '../ui/Field'

/**
 * Planning d'un cours : le coach programme une séance pour tous les
 * athlètes, puis voit combien l'ont faite.
 */
export default function ClassPlanningTab({ classId }: { classId: string }) {
  const { t } = useTranslation('common')
  // Semaine par défaut (2.2) ; la liste reste pour l'historique et le suivi.
  const [view, setView] = useState<'week' | 'list'>('week')
  return (
    <div>
      <div className="wb-links-chips wb-plist-views" role="group" aria-label={t('classes.plan_view')}>
        <button type="button" className="wb-chip" aria-pressed={view === 'week'} onClick={() => setView('week')}>{t('classes.plan_view_week')}</button>
        <button type="button" className="wb-chip" aria-pressed={view === 'list'} onClick={() => setView('list')}>{t('classes.plan_view_list')}</button>
      </div>
      {view === 'week' ? <ClassWeekPlanner key={classId} classId={classId} /> : <ClassPlanList classId={classId} />}
    </div>
  )
}

function ClassPlanList({ classId }: { classId: string }) {
  const { t, i18n } = useTranslation(['common', 'workouts'])
  const { savedWorkouts, fetchWorkouts } = useWorkoutStore()
  // Clé par cours : changer de cours ne doit pas afficher l'ancien planning.
  const [loaded, setLoaded] = useState<{ classId: string; plans: ClassPlan[] } | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ready = loaded?.classId === classId
  const plans = ready ? loaded.plans : []
  const today = localDate()
  const upcoming = plans.filter((p) => p.scheduled_date >= today)
  const past = plans.filter((p) => p.scheduled_date < today).reverse()

  function reload() {
    return fetchClassPlans(classId)
      .then((rows) => setLoaded({ classId, plans: rows }))
      .catch((err: unknown) => {
        setLoaded({ classId, plans: [] })
        setError(err instanceof Error ? err.message : t('errors.generic'))
      })
  }

  useEffect(() => {
    let cancelled = false
    fetchClassPlans(classId)
      .then((rows) => { if (!cancelled) setLoaded({ classId, plans: rows }) })
      .catch(() => { if (!cancelled) setLoaded({ classId, plans: [] }) })
    return () => { cancelled = true }
  }, [classId])

  useEffect(() => { fetchWorkouts() }, [fetchWorkouts])

  async function handleDelete(id: string) {
    setError(null)
    try {
      await deleteClassPlan(id)
      setLoaded((prev) => prev && { ...prev, plans: prev.plans.filter((p) => p.id !== id) })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'))
    }
  }

  function planTitle(p: ClassPlan) {
    return p.title ?? p.workout_title ?? t('journal.free_session', { ns: 'workouts' })
  }

  function planDate(p: ClassPlan) {
    return new Date(`${p.scheduled_date}T00:00:00`).toLocaleDateString(i18n.language, {
      weekday: 'long', day: 'numeric', month: 'long'
    })
  }

  return (
    <div>
      <div className="wb-plist-top">
        <p className="wb-plist-intro">{t('classes.plan_intro')}</p>
        <button type="button" onClick={() => setShowForm((v) => !v)} aria-expanded={showForm} className="wb-btn wb-btn--ghost wb-btn--sm">
          {showForm ? t('actions.cancel') : t('classes.plan_add')}
        </button>
      </div>

      {showForm && (
        <PlanForm
          classId={classId}
          savedWorkouts={savedWorkouts}
          onCancel={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); void reload() }}
        />
      )}

      {error && <p className="wb-plist-error" role="alert">{error}</p>}

      {!ready ? (
        <Skeleton height={56} lines={2} />
      ) : plans.length === 0 ? (
        !showForm && <EmptyState compact icon="calendar" title={t('classes.plan_empty')} hint={t('classes.plan_empty_hint')} />
      ) : (
        <>
          <PlanList
            heading={t('classes.plan_upcoming')}
            plans={upcoming}
            planTitle={planTitle}
            planDate={planDate}
            onDelete={handleDelete}
          />
          <PlanList
            heading={t('classes.plan_past')}
            plans={past}
            planTitle={planTitle}
            planDate={planDate}
            onDelete={handleDelete}
            muted
          />
        </>
      )}
    </div>
  )
}

function PlanList({ heading, plans, planTitle, planDate, onDelete, muted }: {
  heading: string
  plans: ClassPlan[]
  planTitle: (p: ClassPlan) => string
  planDate: (p: ClassPlan) => string
  onDelete: (id: string) => Promise<void>
  muted?: boolean
}) {
  const { t } = useTranslation('common')
  if (plans.length === 0) return null

  return (
    <section className={`wb-plist${muted ? ' is-past' : ''}`}>
      <h3 className="wb-plist-heading">{heading}</h3>
      <div className="wb-plist-rows">
        {plans.map((p) => {
          const allDone = p.total > 0 && p.done === p.total
          return (
            <article key={p.id} className="wb-plist-row">
              <div className="wb-plist-main">
                <p className="wb-plist-title">{planTitle(p)}</p>
                <p className="wb-plist-date">{planDate(p)}</p>
                {p.notes && <p className="wb-plist-notes">{p.notes}</p>}
              </div>
              <span className={`wb-plist-progress${allDone ? ' is-done' : ''}`}>
                {t('classes.plan_progress', { done: p.done, total: p.total })}
              </span>
              <Link to={`/dashboard/whiteboard/${p.id}`} className="wb-btn wb-btn--ghost wb-btn--sm">
                {t('whiteboard.open')}
              </Link>
              <ConfirmButton
                onConfirm={() => onDelete(p.id)}
                title={t('classes.plan_delete')}
                ariaLabel={`${t('classes.plan_delete')} — ${planTitle(p)}`}
                className="wb-btn wb-btn--danger wb-btn--sm"
              >
                ✕
              </ConfirmButton>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function PlanForm({ classId, savedWorkouts, onCancel, onSaved }: {
  classId: string
  savedWorkouts: { id: string; name: string }[]
  onCancel: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation(['common', 'workouts'])
  const [date, setDate] = useState(localDate())
  const [workoutId, setWorkoutId] = useState('')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Une séance sans entraînement ni titre s'afficherait « Séance libre » chez
  // tous les athlètes, sans rien leur dire : l'un des deux est requis.
  const valid = Boolean(date) && Boolean(workoutId || title.trim())

  async function handleSubmit() {
    if (!valid) return
    setSaving(true)
    setError(null)
    try {
      await createClassPlan({
        classId,
        scheduledDate: date,
        workoutId: workoutId || null,
        title: title.trim() || null,
        notes: notes.trim() || null
      })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="wb-plist-form">
      <div className="wb-plist-grid">
        <Field label={t('journal.schedule_date', { ns: 'workouts' })}>
          <input className="wb-input" type="date" value={date} min={localDate()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label={t('classes.plan_workout')}>
          <select className="wb-input" value={workoutId} onChange={(e) => setWorkoutId(e.target.value)}>
            <option value="">{t('journal.schedule_workout_none', { ns: 'workouts' })}</option>
            {savedWorkouts.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label={t('journal.schedule_title', { ns: 'workouts' })}>
        <input className="wb-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('classes.plan_title_placeholder')} />
      </Field>
      <Field label={t('classes.plan_notes')}>
        <textarea className="wb-input wb-support-text" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder={t('classes.plan_notes_placeholder')} />
      </Field>

      {!valid && date && <p className="wb-plist-hint">{t('classes.plan_need_content')}</p>}
      {error && <p className="wb-plist-error" role="alert">{error}</p>}

      <div className="wb-plist-actions">
        <button type="button" onClick={() => { void handleSubmit() }} disabled={!valid || saving} className="wb-btn wb-btn--primary">
          {saving ? t('status.loading') : t('classes.plan_save')}
        </button>
        <button type="button" onClick={onCancel} className="wb-btn wb-btn--ghost">{t('actions.cancel')}</button>
      </div>
    </div>
  )
}
