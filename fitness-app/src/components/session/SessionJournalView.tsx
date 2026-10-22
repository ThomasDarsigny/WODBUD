import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchJournal, groupByMonth, type JournalEntry } from '../../lib/journal'
import { fetchUpcoming, scheduleWorkout, deleteScheduledWorkout, localDate, type ScheduledEntry } from '../../lib/scheduledWorkouts'
import { useWorkoutStore } from '../../stores/workoutStore'
import { useSessionStore } from '../../stores/sessionStore'
import NavIcon, { type NavIconName } from '../navigation/NavIcon'
import EmptyState from '../ui/EmptyState'
import ConfirmButton from '../ui/ConfirmButton'
import Skeleton from '../ui/Skeleton'
import { label, text, field as inputStyle, textarea as textareaStyle, btnPrimary as actionBtnStyle, btnSecondary as ghostBtnStyle } from '../../styles/ui'
import { AnimatedNumber } from '../ui/motion'
import { formatMinutes } from '../../lib/ranks'

/**
 * Journal des séances.
 *
 * Regroupé par mois plutôt qu'en liste plate : « 6 séances en septembre »
 * répond à la question qu'on se pose vraiment en ouvrant un historique —
 * est-ce que je m'entraîne assez régulièrement — là où une suite de dates
 * demande de compter soi-même.
 */
const KIND_ICON: Record<JournalEntry['kind'], NavIconName> = {
  wod: 'workout',
  cardio: 'session',
  free: 'exercises'
}

export default function SessionJournalView() {
  const { t, i18n } = useTranslation(['workouts', 'common'])
  const { savedWorkouts, fetchWorkouts } = useWorkoutStore()
  const startSession = useSessionStore((s) => s.startSession)
  const sessionRunning = useSessionStore((s) => s.timer.startedAt !== null)
  const navigate = useNavigate()
  const sessionPath = useLocation().pathname.startsWith('/athlete') ? '/athlete/session' : '/dashboard/session'
  const today = localDate()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [upcoming, setUpcoming] = useState<ScheduledEntry[]>([])
  const [loadingUpcoming, setLoadingUpcoming] = useState(true)
  const [showScheduleForm, setShowScheduleForm] = useState(false)

  // Pas de `setLoadingUpcoming(true)` ici : l'état initial vaut déjà `true`
  // pour le premier appel (au montage), et un rechargement après ajout
  // met simplement la liste à jour sans repasser par le squelette.
  function reloadUpcoming() {
    return fetchUpcoming()
      .then(setUpcoming)
      .catch(() => {}) // secondaire au journal : une erreur ici ne doit pas bloquer la page
      .finally(() => setLoadingUpcoming(false))
  }

  useEffect(() => {
    let cancelled = false
    fetchJournal()
      .then((rows) => { if (!cancelled) setEntries(rows) })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t('errors.generic', { ns: 'common' }))
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [t])

  useEffect(() => {
    void reloadUpcoming()
    fetchWorkouts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const months = useMemo(
    () => groupByMonth(entries, i18n.language),
    [entries, i18n.language]
  )
  const totalMinutes = useMemo(
    () => entries.reduce((sum, e) => sum + (e.active_minutes || 0), 0),
    [entries]
  )

  async function handleDeleteUpcoming(id: string) {
    await deleteScheduledWorkout(id)
    setUpcoming((prev) => prev.filter((e) => e.id !== id))
  }

  // Une séance déjà en cours n'est jamais écrasée : on y renvoie plutôt que
  // de perdre le chrono qui tourne.
  function handleStartPlan(e: ScheduledEntry) {
    if (!sessionRunning) {
      startSession(e.workout_id, e.title ?? e.workout_title ?? t('journal.free_session'), e.id)
    }
    navigate(sessionPath)
  }

  return (
    <div className="wb-page">
      <header className="wb-ph">
        <div>
          <p className="wb-ph-tag">{t('journal.tag')}</p>
          <h1>{t('journal.title')}</h1>
        </div>
      </header>

      {!loading && entries.length > 0 && (
        <div className="wb-stats wb-stats--2">
          <div className="wb-stat"><strong><AnimatedNumber value={entries.length} /></strong><span>{t('journal.stat_sessions')}</span></div>
          <div className="wb-stat wb-stat--accent"><strong><AnimatedNumber value={totalMinutes} format={formatMinutes} /></strong><span>{t('journal.stat_minutes')}</span></div>
        </div>
      )}

      <section className="wb-home-sec">
        <div className="wb-sec">
          <h2>{t('journal.upcoming_title')}</h2>
          <button type="button" onClick={() => setShowScheduleForm((v) => !v)}>
            {showScheduleForm ? t('actions.cancel', { ns: 'common' }) : `+ ${t('journal.schedule_add')}`}
          </button>
        </div>

        {showScheduleForm && (
          <ScheduleForm
            savedWorkouts={savedWorkouts}
            onCancel={() => setShowScheduleForm(false)}
            onSaved={() => { setShowScheduleForm(false); void reloadUpcoming() }}
          />
        )}

        {loadingUpcoming ? (
          <Skeleton height={60} lines={1} />
        ) : upcoming.length === 0 ? (
          !showScheduleForm && <p className="wb-muted-line">{t('journal.upcoming_empty')}</p>
        ) : (
          <ul className="wb-list wb-stagger">
            {upcoming.map((e) => {
              const done = e.session_id !== null
              const overdue = !done && e.scheduled_date < today
              const startable = !done && e.scheduled_date <= today
              return (
                <li key={e.id}>
                  <div className="wb-row wb-row--top">
                    <span className="wb-row-icon" data-tone={done ? 'green' : undefined}><NavIcon name="calendar" size={20} /></span>
                    <span className="wb-row-main">
                      <strong>{e.title ?? e.workout_title ?? t('journal.free_session')}</strong>
                      <span>
                        {new Date(`${e.scheduled_date}T00:00:00`).toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })}
                        {e.class_name ? ` · ${e.class_name}` : ''}
                      </span>
                      {e.notes && <span className="wb-row-note">{e.notes}</span>}
                      {overdue && <span className="wb-pill wb-pill--orange wb-row-pill">{t('journal.plan_overdue')}</span>}
                    </span>
                    <span className="wb-row-actions">
                      {done ? (
                        <span className="wb-pill wb-pill--green">✓ {t('journal.plan_done')}</span>
                      ) : (
                        <>
                          {startable && (
                            <button type="button" className="wb-btn wb-btn--primary wb-btn--sm" onClick={() => handleStartPlan(e)}>
                              ▶ {t('journal.plan_start')}
                            </button>
                          )}
                          <ConfirmButton
                            onConfirm={() => handleDeleteUpcoming(e.id)}
                            title={t('journal.delete_scheduled')}
                            style={{ minHeight: 40, minWidth: 40, padding: '0 0.7rem', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}
                          >
                            ✕
                          </ConfirmButton>
                        </>
                      )}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {loading ? (
        <Skeleton height={68} lines={4} />
      ) : error ? (
        <div className="wb-rec-error" role="alert">{error}</div>
      ) : entries.length === 0 ? (
        <EmptyState icon="session" title={t('journal.empty')} hint={t('journal.empty_hint')} />
      ) : (
        months.map((month) => (
          <section key={month.key} className="wb-home-sec">
            <div className="wb-sec">
              <h2 className="wb-cap">{month.label}</h2>
              <span className="wb-sec-meta">{t('journal.month_summary', { count: month.entries.length, minutes: month.minutes })}</span>
            </div>
            <ul className="wb-list wb-stagger">
              {month.entries.map((e) => (
                <li key={e.id}>
                  <div className="wb-row wb-row--top">
                    <span className="wb-row-icon"><NavIcon name={KIND_ICON[e.kind]} size={20} /></span>
                    <span className="wb-row-main">
                      <strong>{e.title ?? t('journal.free_session')}</strong>
                      <span>
                        {new Date(e.performed_at).toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })}
                        {e.planned ? ` · ✓ ${t('journal.plan_tag')}` : ''}
                      </span>
                      {e.notes && <span className="wb-row-note">{e.notes}</span>}
                    </span>
                    <span className="wb-row-side">{t('journal.minutes', { minutes: e.active_minutes })}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}

/** Formulaire de planification — date obligatoire, tout le reste optionnel. */
function ScheduleForm({ savedWorkouts, onCancel, onSaved }: {
  savedWorkouts: { id: string; name: string }[]
  onCancel: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation(['workouts', 'common'])
  const [date, setDate] = useState('')
  const [workoutId, setWorkoutId] = useState('')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!date) return
    setSaving(true)
    setError(null)
    try {
      await scheduleWorkout({
        scheduled_date: date,
        title: title.trim() || null,
        notes: notes.trim() || null,
        workout_id: workoutId || null
      })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic', { ns: 'common' }))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="wb-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--s3)' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s1)' }}>
          <span style={label}>{t('journal.schedule_date')}</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s1)' }}>
          <span style={label}>{t('journal.schedule_workout')}</span>
          <select value={workoutId} onChange={(e) => setWorkoutId(e.target.value)} style={inputStyle}>
            <option value="">{t('journal.schedule_workout_none')}</option>
            {savedWorkouts.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </label>
      </div>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s1)' }}>
        <span style={label}>{t('journal.schedule_title')}</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('journal.schedule_title_placeholder')}
          style={inputStyle}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s1)' }}>
        <span style={label}>{t('journal.schedule_notes')}</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={textareaStyle} />
      </label>

      {error && <p style={{ color: 'var(--orange)', fontSize: text.sm, margin: 0 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 'var(--s2)' }}>
        <button onClick={() => { void handleSubmit() }} disabled={!date || saving} style={{ ...actionBtnStyle, opacity: !date || saving ? 0.6 : 1 }}>
          {saving ? t('status.loading', { ns: 'common' }) : t('journal.schedule_save')}
        </button>
        <button onClick={onCancel} style={ghostBtnStyle}>{t('actions.cancel', { ns: 'common' })}</button>
      </div>
    </div>
  )
}
