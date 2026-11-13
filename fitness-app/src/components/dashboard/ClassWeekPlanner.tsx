import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { createClassPlan, deleteClassPlan, fetchClassPlansBetween, type ClassPlan } from '../../lib/classPlans'
import { localDate } from '../../lib/scheduledWorkouts'
import { duplicationFor, shiftDate, weekDays, weekStart } from '../../lib/planWeek'
import { useWorkoutStore } from '../../stores/workoutStore'
import ConfirmButton from '../ui/ConfirmButton'
import Skeleton from '../ui/Skeleton'

/**
 * Calendrier d'un cours (2.2) : la semaine d'un coup d'œil, du lundi au
 * dimanche. Un « + » sur un jour programme un WOD (recherche, benchmarks
 * compris) ; « Dupliquer vers la semaine suivante » recopie la semaine.
 */
export default function ClassWeekPlanner({ classId }: { classId: string }) {
  const { t, i18n } = useTranslation(['common', 'workouts'])
  const { savedWorkouts, fetchWorkouts } = useWorkoutStore()
  const today = localDate()
  const [start, setStart] = useState(() => weekStart(today))
  const [plans, setPlans] = useState<ClassPlan[] | null>(null)
  const [picking, setPicking] = useState<string | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const days = useMemo(() => weekDays(start), [start])
  const end = days[6]

  const load = useCallback(async () => {
    // La semaine affichée et la suivante : la duplication a besoin des deux.
    return fetchClassPlansBetween(classId, start, shiftDate(end, 7))
  }, [classId, start, end])

  useEffect(() => { fetchWorkouts() }, [fetchWorkouts])
  useEffect(() => {
    let alive = true
    load().then((rows) => { if (alive) setPlans(rows) }).catch(() => { if (alive) setPlans([]) })
    return () => { alive = false }
  }, [load])

  const weekPlans = (plans ?? []).filter((p) => p.scheduled_date >= start && p.scheduled_date <= end)
  const nextPlans = (plans ?? []).filter((p) => p.scheduled_date > end)

  const title = (p: ClassPlan) => p.title ?? p.workout_title ?? t('journal.free_session', { ns: 'workouts' })
  const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Date(`${iso}T12:00:00`).toLocaleDateString(i18n.language, o)

  async function refresh() { setPlans(await load()) }

  async function add(date: string, workoutId: string, notes: string) {
    setBusy(true)
    setMessage(null)
    try {
      await createClassPlan({ classId, scheduledDate: date, workoutId, title: null, notes: notes.trim() || null })
      setPicking(null)
      await refresh()
    } catch (err) {
      setMessage({ kind: 'err', text: err instanceof Error ? err.message : t('errors.generic') })
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    setMessage(null)
    try {
      await deleteClassPlan(id)
      setPlans((list) => (list ?? []).filter((p) => p.id !== id))
    } catch (err) {
      setMessage({ kind: 'err', text: err instanceof Error ? err.message : t('errors.generic') })
    }
  }

  async function duplicate() {
    const toCreate = duplicationFor(weekPlans, nextPlans)
    if (toCreate.length === 0) { setMessage({ kind: 'ok', text: t('classes.week_duplicate_none') }); return }
    setBusy(true)
    setMessage(null)
    try {
      // Pas de notification par séance : 5 messages d'un coup pour la semaine prochaine, ce serait du bruit.
      for (const p of toCreate) {
        await createClassPlan({ classId, scheduledDate: p.scheduled_date, workoutId: p.workout_id, title: p.title, notes: p.notes }, { notify: false })
      }
      await refresh()
      setMessage({ kind: 'ok', text: t('classes.week_duplicated', { count: toCreate.length }) })
    } catch (err) {
      setMessage({ kind: 'err', text: err instanceof Error ? err.message : t('errors.generic') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="wb-week">
      <div className="wb-week-nav">
        <button type="button" className="wb-week-arrow" onClick={() => { setPlans(null); setStart(shiftDate(start, -7)) }} aria-label={t('classes.week_prev')}>‹</button>
        <div className="wb-week-range">
          <strong>{fmt(start, { day: 'numeric', month: 'short' })} – {fmt(end, { day: 'numeric', month: 'short' })}</strong>
          {start !== weekStart(today) && (
            <button type="button" className="wb-week-today" onClick={() => { setPlans(null); setStart(weekStart(today)) }}>{t('classes.week_this')}</button>
          )}
        </div>
        <button type="button" className="wb-week-arrow" onClick={() => { setPlans(null); setStart(shiftDate(start, 7)) }} aria-label={t('classes.week_next')}>›</button>
      </div>

      {message && <p className={message.kind === 'ok' ? 'wb-review-ok' : 'wb-rec-error'} role="status">{message.text}</p>}

      {plans === null ? (
        <Skeleton height={56} lines={4} />
      ) : (
        <ol className="wb-week-days">
          {days.map((day) => {
            const dayPlans = weekPlans.filter((p) => p.scheduled_date === day)
            const past = day < today
            return (
              <li key={day} className={`wb-week-day${day === today ? ' is-today' : ''}${past ? ' is-past' : ''}`}>
                <div className="wb-week-dayhead">
                  <span className="wb-week-dow">{fmt(day, { weekday: 'short' })}</span>
                  <span className="wb-week-date">{fmt(day, { day: 'numeric' })}</span>
                  {day === today && <span className="wb-pill wb-pill--orange">{t('classes.week_today')}</span>}
                </div>
                <div className="wb-week-plans">
                  {dayPlans.map((p) => (
                    <div key={p.id} className="wb-week-plan">
                      <span className="wb-week-plan-main">
                        <strong>{title(p)}</strong>
                        <span>{t('classes.plan_progress', { done: p.done, total: p.total })}</span>
                      </span>
                      <Link to={`/dashboard/whiteboard/${p.id}`} className="wb-week-board">{t('whiteboard.open')}</Link>
                      <ConfirmButton onConfirm={() => remove(p.id)} title={t('classes.plan_delete')} className="wb-week-del">✕</ConfirmButton>
                    </div>
                  ))}
                  {!past && picking !== day && (
                    <button type="button" className="wb-week-add" onClick={() => setPicking(day)} aria-label={t('classes.week_add_on', { date: fmt(day, { weekday: 'long', day: 'numeric', month: 'long' }) })}>
                      + {dayPlans.length ? t('classes.week_add_more') : t('classes.week_add')}
                    </button>
                  )}
                  {picking === day && (
                    <WodPicker
                      workouts={savedWorkouts}
                      busy={busy}
                      onCancel={() => setPicking(null)}
                      onPick={(id, notes) => { void add(day, id, notes) }}
                    />
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}

      <div className="wb-week-foot">
        <ConfirmButton onConfirm={duplicate} disabled={busy || weekPlans.length === 0} className="wb-btn wb-btn--secondary wb-btn--sm">
          {t('classes.week_duplicate')}
        </ConfirmButton>
      </div>
    </div>
  )
}

function WodPicker({ workouts, busy, onPick, onCancel }: {
  workouts: Array<{ id: string; name: string; is_benchmark?: boolean }>
  busy: boolean
  onPick: (workoutId: string, notes: string) => void
  onCancel: () => void
}) {
  const { t } = useTranslation(['common', 'workouts'])
  const [q, setQ] = useState('')
  const [chosen, setChosen] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const list = workouts
    .filter((w) => w.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => Number(Boolean(b.is_benchmark)) - Number(Boolean(a.is_benchmark)) || a.name.localeCompare(b.name))
    .slice(0, 30)

  return (
    <div className="wb-week-picker">
      <div className="wb-search">
        <input id="week-picker-search" className="wb-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('classes.week_search')} aria-label={t('classes.week_search')} autoFocus />
      </div>
      <ul className="wb-week-picklist" role="listbox" aria-label={t('classes.plan_workout')}>
        {list.map((w) => (
          <li key={w.id}>
            <button type="button" role="option" aria-selected={chosen === w.id} className={chosen === w.id ? 'is-on' : undefined} onClick={() => setChosen(w.id)}>
              {w.is_benchmark ? '★ ' : ''}{w.name}
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="wb-set-hint">{t('classes.week_no_match')}</li>}
      </ul>
      {chosen && (
        <textarea id="week-picker-notes" className="wb-input wb-support-text" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('classes.plan_notes_placeholder')} aria-label={t('classes.plan_notes')} />
      )}
      <div className="wb-review-actions">
        <button type="button" className="wb-btn wb-btn--ghost wb-btn--sm" onClick={onCancel}>{t('actions.cancel')}</button>
        <button type="button" className="wb-btn wb-btn--primary wb-btn--sm" disabled={!chosen || busy} onClick={() => chosen && onPick(chosen, notes)}>
          {busy ? t('status.loading') : t('classes.plan_save')}
        </button>
      </div>
    </div>
  )
}
