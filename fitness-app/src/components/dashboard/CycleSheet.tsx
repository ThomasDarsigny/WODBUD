import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useWorkoutStore } from '../../stores/workoutStore'
import { useExerciseStore } from '../../stores/exerciseStore'
import { readUnit } from '../../lib/records'
import { localDate } from '../../lib/scheduledWorkouts'
import { createCycle, fetchCycleBase, hasProgression, MAX_WEEKS, MIN_WEEKS, planCycle, type CycleBase } from '../../lib/cycles'

/**
 * « Créer un cycle » (2.3) : un WOD de base, un premier jour, un nombre de
 * semaines et la progression. L'aperçu montre les charges de chaque semaine
 * avant de créer quoi que ce soit.
 */
export default function CycleSheet({ classId, onClose, onCreated }: { classId: string; onClose: () => void; onCreated: (weeks: number) => void }) {
  const { t, i18n } = useTranslation(['common', 'workouts'])
  const { savedWorkouts } = useWorkoutStore()
  const { exercises, fetchExercises } = useExerciseStore()
  const unit = readUnit()
  const [q, setQ] = useState('')
  const [workoutId, setWorkoutId] = useState<string | null>(null)
  const [base, setBase] = useState<CycleBase | null>(null)
  const [firstDate, setFirstDate] = useState(localDate())
  const [weeks, setWeeks] = useState(6)
  const [progress, setProgress] = useState(true)
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const sheetRef = useRef<HTMLElement>(null)

  // La feuille s'ouvre sous la semaine : l'amener à l'écran.
  useEffect(() => { sheetRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }) }, [])

  useEffect(() => { if (exercises.length === 0) void fetchExercises() }, [exercises.length, fetchExercises])
  useEffect(() => {
    if (!workoutId || exercises.length === 0) return
    let alive = true
    fetchCycleBase(workoutId, exercises).then((b) => { if (alive) setBase(b) }).catch(() => { if (alive) setBase(null) })
    return () => { alive = false }
  }, [workoutId, exercises])

  const list = savedWorkouts
    .filter((w) => w.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => Number(Boolean(b.is_benchmark)) - Number(Boolean(a.is_benchmark)) || a.name.localeCompare(b.name))
    .slice(0, 20)

  const plan = useMemo(() => (base ? planCycle(base, firstDate, weeks, progress, unit) : []), [base, firstDate, weeks, progress, unit])
  const loaded = Boolean(base && base.id === workoutId)
  const fmt = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric', month: 'short' })

  async function create() {
    if (!base) return
    setBusy(0)
    setError(null)
    try {
      await createCycle(classId, base, plan, (n) => setBusy(n))
      onCreated(plan.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'))
      setBusy(null)
    }
  }

  return (
    <section ref={sheetRef} className="wb-cycle" aria-label={t('classes.cycle_title')}>
      <div className="wb-cycle-head">
        <p className="wb-cycle-title">{t('classes.cycle_title')}</p>
        <button type="button" className="wb-tooeasy-close" onClick={onClose} aria-label={t('actions.close')}>✕</button>
      </div>
      <p className="wb-set-hint" style={{ margin: 0 }}>{t('classes.cycle_hint')}</p>

      <div className="wb-cycle-step">
        <p className="wb-bfilters-label">{t('classes.cycle_base')}</p>
        <div className="wb-search">
          <input id="cycle-search" className="wb-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('classes.week_search')} aria-label={t('classes.week_search')} />
        </div>
        <ul className="wb-week-picklist" role="listbox" aria-label={t('classes.cycle_base')}>
          {list.map((w) => (
            <li key={w.id}>
              <button type="button" role="option" aria-selected={workoutId === w.id} className={workoutId === w.id ? 'is-on' : undefined} onClick={() => { setBase(null); setWorkoutId(w.id) }}>
                {w.is_benchmark ? '★ ' : ''}{w.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="wb-cycle-row">
        <label className="wb-score-field" htmlFor="cycle-date">
          <span>{t('classes.cycle_first')}</span>
          <input id="cycle-date" className="wb-input" type="date" min={localDate()} value={firstDate} onChange={(e) => setFirstDate(e.target.value || localDate())} />
        </label>
        <label className="wb-score-field" htmlFor="cycle-weeks">
          <span>{t('classes.cycle_weeks')}</span>
          <select id="cycle-weeks" className="wb-input" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))}>
            {Array.from({ length: MAX_WEEKS - MIN_WEEKS + 1 }, (_, i) => i + MIN_WEEKS).map((n) => (
              <option key={n} value={n}>{t('classes.cycle_weeks_n', { count: n })}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="wb-links-chips" role="group" aria-label={t('classes.cycle_progress')}>
        <button type="button" className="wb-chip" aria-pressed={progress} onClick={() => setProgress(true)}>{t('classes.cycle_progress_on')}</button>
        <button type="button" className="wb-chip" aria-pressed={!progress} onClick={() => setProgress(false)}>{t('classes.cycle_progress_off')}</button>
      </div>

      {workoutId && !loaded && <p className="wb-set-hint">{t('status.loading')}</p>}
      {loaded && base && (
        <>
          {base.lines.length === 0 ? (
            <p className="wb-rec-error">{t('classes.cycle_empty_wod')}</p>
          ) : (
            <div className="wb-cycle-preview" role="table" aria-label={t('classes.cycle_preview')}>
              {plan.map((w) => (
                <div key={w.week} role="row" className="wb-cycle-week">
                  <span role="cell" className="wb-cycle-wk">S{w.week}<small>{fmt(w.date)}</small></span>
                  <span role="cell" className="wb-cycle-lines">
                    {w.lines.map((l) => (
                      <span key={l.position}><b>{l.exercise.name}</b> {[l.sets && l.reps ? `${l.sets} × ${l.reps}` : l.reps, l.weight].filter(Boolean).join(' · ')}</span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          )}
          {progress && base.lines.length > 0 && !hasProgression(plan) && <p className="wb-set-hint">{t('classes.cycle_no_numbers')}</p>}
          {error && <p className="wb-rec-error" role="alert">{error}</p>}
          <div className="wb-review-actions">
            <button type="button" className="wb-btn wb-btn--ghost wb-btn--sm" onClick={onClose}>{t('actions.cancel')}</button>
            <button type="button" className="wb-btn wb-btn--primary wb-btn--sm" disabled={busy !== null || base.lines.length === 0} onClick={() => { void create() }}>
              {busy !== null ? t('classes.cycle_creating', { done: busy, total: plan.length }) : t('classes.cycle_create', { count: plan.length })}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
