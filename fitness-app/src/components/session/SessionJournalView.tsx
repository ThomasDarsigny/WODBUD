import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchJournal, groupByMonth, type JournalEntry } from '../../lib/journal'
import { fetchUpcoming, scheduleWorkout, deleteScheduledWorkout, type ScheduledEntry } from '../../lib/scheduledWorkouts'
import { useWorkoutStore } from '../../stores/workoutStore'
import NavIcon, { type NavIconName } from '../navigation/NavIcon'
import EmptyState from '../ui/EmptyState'
import ConfirmButton from '../ui/ConfirmButton'
import Skeleton from '../ui/Skeleton'
import { label, text, field as inputStyle, textarea as textareaStyle, btnPrimary as actionBtnStyle, btnSecondary as ghostBtnStyle } from '../../styles/ui'

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

  return (
    <div style={{ padding: 'var(--page-pad)', maxWidth: 880 }}>
      <div style={{ marginBottom: 'var(--s6)' }}>
        <p style={{ ...label, color: 'var(--orange)', letterSpacing: '0.28em', marginBottom: 'var(--s1)' }}>
          {t('journal.tag')}
        </p>
        <h1 style={{ fontFamily: 'var(--font-d)', fontSize: text.h1, fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.05, margin: 0 }}>
          {t('journal.title')}
        </h1>
        {!loading && entries.length > 0 && (
          <p style={{ color: 'var(--muted)', marginTop: 'var(--s2)', marginBottom: 0 }}>
            {t('journal.summary', { count: entries.length, minutes: totalMinutes })}
          </p>
        )}
      </div>

      <section style={{ marginBottom: 'var(--s6)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--s3)', marginBottom: 'var(--s3)', flexWrap: 'wrap' }}>
          <h2 style={{ ...label, color: 'var(--white)', fontSize: text.sm, margin: 0 }}>
            {t('journal.upcoming_title')}
          </h2>
          <button onClick={() => setShowScheduleForm((v) => !v)} style={{ ...ghostBtnStyle, fontSize: '0.75rem' }}>
            {showScheduleForm ? t('actions.cancel', { ns: 'common' }) : t('journal.schedule_add')}
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
          <Skeleton height={52} lines={1} />
        ) : upcoming.length === 0 ? (
          !showScheduleForm && (
            <p style={{ color: 'var(--muted)', fontSize: text.sm, margin: 0 }}>{t('journal.upcoming_empty')}</p>
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--border)', border: '1px solid var(--border)' }}>
            {upcoming.map((e) => (
              <article key={e.id} style={{ background: 'var(--dark)', padding: 'var(--s4)', display: 'flex', gap: 'var(--s4)', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--orange)', display: 'flex', marginTop: 2, flexShrink: 0 }}>
                  <NavIcon name="calendar" size={20} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'var(--font-d)', fontSize: text.h2, fontWeight: 800, letterSpacing: '0.02em', textTransform: 'uppercase', lineHeight: 1.15, margin: 0 }}>
                    {e.title ?? e.workout_title ?? t('journal.free_session')}
                  </p>
                  <p style={{ ...label, display: 'block', marginTop: 'var(--s1)' }}>
                    {new Date(`${e.scheduled_date}T00:00:00`).toLocaleDateString(i18n.language, {
                      weekday: 'long', day: 'numeric', month: 'long'
                    })}
                  </p>
                  {e.notes && (
                    <p style={{ fontSize: text.sm, color: 'var(--muted)', lineHeight: 1.5, margin: 'var(--s2) 0 0' }}>
                      {e.notes}
                    </p>
                  )}
                </div>
                <ConfirmButton
                  onConfirm={() => handleDeleteUpcoming(e.id)}
                  title={t('journal.delete_scheduled')}
                  style={{ ...ghostBtnStyle, fontSize: '0.75rem', flexShrink: 0, color: 'rgba(255,77,0,0.8)', borderColor: 'rgba(255,77,0,0.35)' }}
                >
                  ✕
                </ConfirmButton>
              </article>
            ))}
          </div>
        )}
      </section>

      <h2 style={{ ...label, color: 'var(--white)', fontSize: text.sm, margin: '0 0 var(--s3)' }}>
        {t('journal.past_title')}
      </h2>

      {loading ? (
        <Skeleton height={68} lines={4} />
      ) : error ? (
        <div style={{ border: '1px solid rgba(255,90,31,0.35)', background: 'rgba(255,90,31,0.08)', padding: 'var(--s4)', color: 'var(--orange)' }}>
          {error}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon="session"
          title={t('journal.empty')}
          hint={t('journal.empty_hint')}
        />
      ) : (
        months.map((month) => (
          <section key={month.key} style={{ marginBottom: 'var(--s6)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--s3)', marginBottom: 'var(--s3)', flexWrap: 'wrap' }}>
              <h2 style={{ ...label, color: 'var(--white)', fontSize: text.sm, margin: 0 }}>
                {month.label}
              </h2>
              <span style={{ ...label, fontVariantNumeric: 'tabular-nums', display: 'inline' }}>
                {t('journal.month_summary', { count: month.entries.length, minutes: month.minutes })}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--border)', border: '1px solid var(--border)' }}>
              {month.entries.map((e) => (
                <article
                  key={e.id}
                  style={{ background: 'var(--dark)', padding: 'var(--s4)', display: 'flex', gap: 'var(--s4)', alignItems: 'flex-start' }}
                >
                  <span style={{ color: 'var(--orange)', display: 'flex', marginTop: 2, flexShrink: 0 }}>
                    <NavIcon name={KIND_ICON[e.kind]} size={20} />
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: 'var(--font-d)', fontSize: text.h2, fontWeight: 800, letterSpacing: '0.02em', textTransform: 'uppercase', lineHeight: 1.15, margin: 0 }}>
                      {e.title ?? t('journal.free_session')}
                    </p>
                    <p style={{ ...label, display: 'block', marginTop: 'var(--s1)' }}>
                      {new Date(e.performed_at).toLocaleDateString(i18n.language, {
                        weekday: 'long', day: 'numeric', month: 'long'
                      })}
                    </p>
                    {e.notes && (
                      <p style={{ fontSize: text.sm, color: 'var(--muted)', lineHeight: 1.5, margin: 'var(--s2) 0 0' }}>
                        {e.notes}
                      </p>
                    )}
                  </div>

                  <span style={{ fontFamily: 'var(--font-d)', fontSize: text.h2, fontWeight: 900, color: 'var(--white)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                    {t('journal.minutes', { minutes: e.active_minutes })}
                  </span>
                </article>
              ))}
            </div>
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
    <div style={{ border: '1px solid var(--border)', background: 'var(--dark)', padding: 'var(--s4)', marginBottom: 'var(--s4)', display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
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
