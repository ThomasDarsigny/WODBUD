import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createClassPlan, deleteClassPlan, fetchClassPlans, type ClassPlan } from '../../lib/classPlans'
import { localDate } from '../../lib/scheduledWorkouts'
import { useWorkoutStore } from '../../stores/workoutStore'
import ConfirmButton from '../ui/ConfirmButton'
import EmptyState from '../ui/EmptyState'
import Skeleton from '../ui/Skeleton'
import { label, text, field as inputStyle, textarea as textareaStyle, btnPrimary as actionBtnStyle, btnSecondary as ghostBtnStyle } from '../../styles/ui'

/**
 * Planning d'un cours : le coach programme une séance pour tous les
 * athlètes, puis voit combien l'ont faite.
 */
export default function ClassPlanningTab({ classId }: { classId: string }) {
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
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--s3)', marginBottom: 'var(--s3)', flexWrap: 'wrap' }}>
        <p style={{ color: 'var(--muted)', fontSize: text.sm, margin: 0 }}>{t('classes.plan_intro')}</p>
        <button onClick={() => setShowForm((v) => !v)} style={{ ...ghostBtnStyle, fontSize: '0.75rem' }}>
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

      {error && <p style={{ color: 'var(--orange)', fontSize: text.sm, margin: '0 0 var(--s3)' }}>{error}</p>}

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
    <section style={{ marginBottom: 'var(--s5)' }}>
      <h3 style={{ ...label, color: 'var(--white)', margin: '0 0 var(--s2)' }}>{heading}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--border)', border: '1px solid var(--border)' }}>
        {plans.map((p) => {
          const allDone = p.total > 0 && p.done === p.total
          return (
            <article key={p.id} style={{ background: 'var(--dark)', padding: 'var(--s4)', display: 'flex', gap: 'var(--s4)', alignItems: 'center', flexWrap: 'wrap', opacity: muted ? 0.8 : 1 }}>
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <p style={{ fontFamily: 'var(--font-d)', fontSize: text.lg, fontWeight: 800, letterSpacing: '0.02em', textTransform: 'uppercase', lineHeight: 1.15, margin: 0 }}>
                  {planTitle(p)}
                </p>
                <p style={{ ...label, marginTop: 'var(--s1)' }}>{planDate(p)}</p>
                {p.notes && (
                  <p style={{ fontSize: text.sm, color: 'var(--muted)', lineHeight: 1.5, margin: 'var(--s2) 0 0' }}>{p.notes}</p>
                )}
              </div>
              <span
                style={{ ...label, display: 'inline', fontVariantNumeric: 'tabular-nums', color: allDone ? '#22c55e' : 'var(--white)', border: `1px solid ${allDone ? 'rgba(34,197,94,0.35)' : 'var(--border)'}`, padding: '0.35rem 0.6rem', flexShrink: 0 }}
              >
                {t('classes.plan_progress', { done: p.done, total: p.total })}
              </span>
              <ConfirmButton
                onConfirm={() => onDelete(p.id)}
                title={t('classes.plan_delete')}
                style={{ ...ghostBtnStyle, fontSize: '0.75rem', flexShrink: 0, color: 'rgba(255,77,0,0.8)', borderColor: 'rgba(255,77,0,0.35)' }}
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
    <div style={{ border: '1px solid var(--border)', background: 'var(--dark)', padding: 'var(--s4)', marginBottom: 'var(--s4)', display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--s3)' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s1)' }}>
          <span style={label}>{t('journal.schedule_date', { ns: 'workouts' })}</span>
          <input type="date" value={date} min={localDate()} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s1)' }}>
          <span style={label}>{t('classes.plan_workout')}</span>
          <select value={workoutId} onChange={(e) => setWorkoutId(e.target.value)} style={inputStyle}>
            <option value="">{t('journal.schedule_workout_none', { ns: 'workouts' })}</option>
            {savedWorkouts.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </label>
      </div>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s1)' }}>
        <span style={label}>{t('journal.schedule_title', { ns: 'workouts' })}</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('classes.plan_title_placeholder')} style={inputStyle} />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s1)' }}>
        <span style={label}>{t('classes.plan_notes')}</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder={t('classes.plan_notes_placeholder')} style={textareaStyle} />
      </label>

      {!valid && date && <p style={{ color: 'var(--muted)', fontSize: text.sm, margin: 0 }}>{t('classes.plan_need_content')}</p>}
      {error && <p style={{ color: 'var(--orange)', fontSize: text.sm, margin: 0 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 'var(--s2)' }}>
        <button onClick={() => { void handleSubmit() }} disabled={!valid || saving} style={{ ...actionBtnStyle, opacity: !valid || saving ? 0.6 : 1 }}>
          {saving ? t('status.loading') : t('classes.plan_save')}
        </button>
        <button onClick={onCancel} style={ghostBtnStyle}>{t('actions.cancel')}</button>
      </div>
    </div>
  )
}
