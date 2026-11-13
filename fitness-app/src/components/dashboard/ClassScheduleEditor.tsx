import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useClassSlotStore } from '../../stores/classSlotStore'
import { DURATIONS, formatSlotTime, MAX_SLOTS, WEEKDAYS, weekdayName, type ClassSlot } from '../../lib/classSlots'

const EMPTY: ClassSlot[] = []

/**
 * Horaire récurrent d'un cours (3.1), vu et réglé par le coach : les
 * créneaux de la semaine, puis jours + heure + durée pour en ajouter.
 * L'ancien horaire en texte libre reste affiché tant qu'aucun créneau n'existe.
 */
export default function ClassScheduleEditor({ classId, legacyText }: { classId: string; legacyText: string | null }) {
  const { t, i18n } = useTranslation('common')
  const lang = i18n.language
  const slots = useClassSlotStore((s) => s.byClass[classId] ?? EMPTY)
  const { addSlots, removeSlot } = useClassSlotStore()
  const [editing, setEditing] = useState(false)
  const [days, setDays] = useState<number[]>([])
  const [time, setTime] = useState('06:00')
  const [duration, setDuration] = useState(60)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const label = (s: ClassSlot) => `${weekdayName(s.weekday, lang)} ${formatSlotTime(s.start_time, lang)}`

  function errorText(err: unknown): string {
    const msg = err instanceof Error ? err.message : String((err as { message?: string })?.message ?? '')
    return msg.includes('class_slots_limit') ? t('classes.sched_limit', { max: MAX_SLOTS }) : t('errors.generic')
  }

  async function add() {
    if (days.length === 0 || !time) return
    setBusy(true)
    setError(null)
    try {
      await addSlots(classId, days, time, duration)
      setDays([])
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  async function remove(slot: ClassSlot) {
    setError(null)
    try { await removeSlot(slot) } catch (err) { setError(errorText(err)) }
  }

  return (
    <section className="wb-sched" aria-labelledby={`sched-${classId}`}>
      <div className="wb-sched-head">
        <p id={`sched-${classId}`} className="wb-sched-title">{t('classes.sched_title')}</p>
        <button type="button" className="wb-btn wb-btn--ghost wb-btn--sm" aria-expanded={editing} onClick={() => { setEditing((v) => !v); setError(null) }}>
          {editing ? t('classes.sched_done') : slots.length ? t('classes.sched_edit') : t('classes.sched_add_cta')}
        </button>
      </div>

      {slots.length === 0 ? (
        <p className="wb-set-hint is-flush">
          {legacyText ? t('classes.sched_text_fallback', { text: legacyText }) : t('classes.sched_empty')}
        </p>
      ) : (
        <ul className="wb-sched-list">
          {slots.map((s) => (
            <li key={s.id} className="wb-sched-slot">
              <span className="wb-sched-dow">{weekdayName(s.weekday, lang)}</span>
              <strong>{formatSlotTime(s.start_time, lang)}</strong>
              <small>{t('classes.sched_minutes', { count: s.duration_minutes })}</small>
              {editing && (
                <button type="button" className="wb-sched-del" onClick={() => { void remove(s) }} aria-label={t('classes.sched_remove', { slot: label(s) })}>✕</button>
              )}
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <div className="wb-sched-add">
          <div className="wb-sched-days" role="group" aria-label={t('classes.sched_days')}>
            {WEEKDAYS.map((d) => (
              <button
                key={d}
                type="button"
                className="wb-chip"
                aria-pressed={days.includes(d)}
                aria-label={weekdayName(d, lang, 'long')}
                onClick={() => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]))}
              >
                {weekdayName(d, lang)}
              </button>
            ))}
          </div>
          <div className="wb-cycle-row">
            <label className="wb-score-field" htmlFor={`sched-time-${classId}`}>
              <span>{t('classes.sched_time')}</span>
              <input id={`sched-time-${classId}`} className="wb-input" type="time" step={300} value={time} onChange={(e) => setTime(e.target.value)} />
            </label>
            <label className="wb-score-field" htmlFor={`sched-dur-${classId}`}>
              <span>{t('classes.sched_duration')}</span>
              <select id={`sched-dur-${classId}`} className="wb-input" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {DURATIONS.map((m) => <option key={m} value={m}>{t('classes.sched_minutes', { count: m })}</option>)}
              </select>
            </label>
          </div>
          <div className="wb-review-actions">
            <button type="button" className="wb-btn wb-btn--primary wb-btn--sm" disabled={busy || days.length === 0 || !time} onClick={() => { void add() }}>
              {days.length > 1 ? t('classes.sched_add_n', { count: days.length }) : t('classes.sched_add')}
            </button>
          </div>
          {days.length === 0 && <p className="wb-set-hint is-flush">{t('classes.sched_pick_day')}</p>}
        </div>
      )}
      {error && <p className="wb-rec-error" role="alert">{error}</p>}
    </section>
  )
}
