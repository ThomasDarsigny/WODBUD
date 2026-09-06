import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MAX_LOGGED_MINUTES, useSessionStore } from '../../stores/sessionStore'
import { useWorkoutStore } from '../../stores/workoutStore'
import { activeMs, formatClock, isRunning, wallClockMs } from '../../lib/sessionTimer'
import { METHOD_I18N_KEYS } from '../../types'
import { field as inputStyle, textarea as textareaStyle } from '../../styles/ui'

interface Props {
  /** '/dashboard' côté coach, '/athlete' côté athlète. */
  basePath: string
}

export default function SessionRunnerView({ basePath }: Props) {
  const { t } = useTranslation(['workouts', 'common'])
  const timer = useSessionStore((s) => s.timer)
  const lastSummary = useSessionStore((s) => s.lastSummary)

  if (lastSummary) return <SummaryPanel basePath={basePath} />
  if (timer.startedAt === null) return <SessionPicker />

  return (
    <Shell tag={t('session.page_tag')} title={t('session.in_progress')}>
      <RunnerPanel />
    </Shell>
  )
}

function Shell({ tag, title, children }: { tag: string; title: string; children: ReactNode }) {
  return (
    <div style={{ padding: 'var(--page-pad)', maxWidth: 880 }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--orange)', marginBottom: '0.35rem' }}>
          {tag}
        </p>
        <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '1.75rem', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.05, letterSpacing: '0.03em', margin: 0 }}>
          {title}
        </h1>
      </div>
      {children}
    </div>
  )
}

/* ── Choix de la séance ─────────────────────────────────────────────────── */

function SessionPicker() {
  const { t } = useTranslation(['workouts', 'common'])
  const { savedWorkouts, fetchWorkouts } = useWorkoutStore()
  const startSession = useSessionStore((s) => s.startSession)

  useEffect(() => { fetchWorkouts() }, [fetchWorkouts])

  return (
    <Shell tag={t('session.page_tag')} title={t('session.picker_title')}>
      <p style={{ color: 'var(--muted)', marginTop: '-1rem', marginBottom: '1.5rem' }}>
        {t('session.picker_subtitle')}
      </p>

      <QuickLogPanel />

      <button
        onClick={() => startSession(null, t('session.free_session'))}
        style={{
          width: '100%', textAlign: 'left', cursor: 'pointer',
          border: '1px solid rgba(255,77,0,0.35)', background: 'rgba(255,77,0,0.06)',
          padding: '1.15rem 1.25rem', marginBottom: '1.75rem', color: 'var(--white)'
        }}
      >
        <span style={{ display: 'block', fontFamily: 'var(--font-d)', fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--orange)' }}>
          ▶ {t('session.free_session')}
        </span>
        <span style={{ display: 'block', color: 'var(--muted)', fontSize: '0.8125rem', marginTop: '0.3rem' }}>
          {t('session.free_session_hint')}
        </span>
      </button>

      <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '0.9375rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 0.9rem' }}>
        {t('session.choose_workout')}
      </h2>

      {savedWorkouts.length === 0 ? (
        <div style={{ padding: '1.5rem', border: '1px solid var(--border)', background: 'var(--dark)', color: 'var(--muted)', textAlign: 'center', fontFamily: 'var(--font-d)', fontSize: '0.8125rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {t('session.no_workouts')}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.7rem' }}>
          {savedWorkouts.map((w) => (
            <button
              key={w.id}
              onClick={() => startSession(w.id, w.name)}
              style={{
                textAlign: 'left', cursor: 'pointer', color: 'var(--white)',
                border: '1px solid var(--border)', background: 'var(--dark)', padding: '0.95rem 1rem'
              }}
            >
              <span style={{ display: 'block', fontFamily: 'var(--font-d)', fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {w.name}
              </span>
              <span style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--orange)', border: '1px solid var(--border)', padding: '0.16rem 0.43rem' }}>
                  {t(METHOD_I18N_KEYS[w.method], { ns: 'common' })}
                </span>
                {w.duration_minutes ? (
                  <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', border: '1px solid var(--border)', padding: '0.16rem 0.43rem' }}>
                    {w.duration_minutes} {t('fields.duration_unit_min')}
                  </span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      )}
    </Shell>
  )
}

/* ── Journal rapide (activité déjà faite, sans chrono) ──────────────────── */

function todayISO(): string {
  // Date locale, pas UTC : à 20 h à Montréal, toISOString() donnerait déjà
  // le lendemain et la séance tomberait le mauvais jour dans la série.
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function QuickLogPanel() {
  const { t } = useTranslation(['workouts', 'common'])
  const { activities, saving, fetchActivities, logActivity } = useSessionStore()

  // `undefined` = l'utilisateur n'a rien choisi, on prend la première activité.
  // `null` = il a explicitement choisi « autre ». Dériver la valeur évite un
  // setState synchrone dans un effet, et donc un rendu en cascade.
  const [activityId, setActivityId] = useState<string | null | undefined>(undefined)
  const [minutes, setMinutes] = useState('30')
  const [date, setDate] = useState(todayISO())
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => { void fetchActivities() }, [fetchActivities])

  // Course à pied en premier choix : c'est le cas d'usage qui a motivé l'écran.
  const selectedId = activityId === undefined ? (activities[0]?.id ?? null) : activityId

  async function submit() {
    setLocalError(null)
    try {
      await logActivity({ exerciseId: selectedId, minutes: Number(minutes), date })
      setMinutes('30')
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : t('errors.generic', { ns: 'common' }))
    }
  }

  const parsed = Number(minutes)
  const valid = Number.isFinite(parsed) && parsed >= 1 && parsed <= MAX_LOGGED_MINUTES

  return (
    <div style={{ border: '1px solid var(--border)', background: 'var(--dark)', padding: '1.25rem', marginBottom: '1.75rem' }}>
      <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '0.9375rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 0.4rem' }}>
        {t('session.log_title')}
      </h2>
      <p style={{ color: 'var(--muted)', fontSize: '0.8125rem', margin: '0 0 1.1rem', lineHeight: 1.5 }}>
        {t('session.log_subtitle')}
      </p>

      <FieldLabel>{t('session.log_activity')}</FieldLabel>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {activities.map((a) => (
          <Chip key={a.id} label={a.name} active={selectedId === a.id} onClick={() => setActivityId(a.id)} />
        ))}
        <Chip label={t('session.log_other')} active={selectedId === null} onClick={() => setActivityId(null)} />
      </div>

      <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 150px', minWidth: 130 }}>
          <FieldLabel>{t('session.log_minutes')}</FieldLabel>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_LOGGED_MINUTES}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ flex: '1 1 160px', minWidth: 140 }}>
          <FieldLabel>{t('session.log_date')}</FieldLabel>
          <input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            style={inputStyle}
          />
        </div>
        <ActionButton onClick={() => { void submit() }} variant="primary" disabled={!valid || saving}>
          {saving ? t('session.saving') : `+ ${t('session.log_save')}`}
        </ActionButton>
      </div>

      <p style={{ color: 'var(--muted)', fontSize: '0.8125rem', margin: '0.85rem 0 0', opacity: 0.8 }}>
        {t('session.log_hint')}
      </p>

      {localError && (
        <div style={{ marginTop: '0.8rem', padding: '0.6rem 0.85rem', background: 'rgba(255,77,0,0.1)', border: '1px solid rgba(255,77,0,0.3)', color: 'var(--orange)', fontSize: '0.8125rem' }}>
          {localError}
        </div>
      )}
    </div>
  )
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label style={{ display: 'block', fontFamily: 'var(--font-d)', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.35rem' }}>
      {children}
    </label>
  )
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: 'var(--font-d)', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: active ? 'var(--black)' : 'var(--muted)',
        background: active ? 'var(--orange)' : 'transparent',
        border: `1px solid ${active ? 'var(--orange)' : 'var(--border)'}`,
        padding: '0.35rem 0.7rem', cursor: 'pointer'
      }}
    >
      {label}
    </button>
  )
}

/* ── Chrono en cours ────────────────────────────────────────────────────── */

function RunnerPanel() {
  const { t } = useTranslation(['workouts', 'common'])
  const {
    workoutName, timer, items, doneExerciseIds, notes, saving, error,
    pause, resume, toggleExercise, setNotes, finish, discard
  } = useSessionStore()

  const [now, setNow] = useState(() => Date.now())
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const running = isRunning(timer)

  // Le tick ne sert qu'à réafficher : la valeur vient toujours d'un écart
  // d'horodatage, donc un intervalle étranglé en arrière-plan ne fausse rien.
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [running])

  // Au retour d'un écran verrouillé, on resynchronise immédiatement.
  useEffect(() => {
    const sync = () => setNow(Date.now())
    document.addEventListener('visibilitychange', sync)
    window.addEventListener('focus', sync)
    return () => {
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener('focus', sync)
    }
  }, [])

  const active = activeMs(timer, now)
  const wall = wallClockMs(timer, now)
  const doneCount = useMemo(
    () => items.filter((i) => doneExerciseIds.includes(i.id)).length,
    [items, doneExerciseIds]
  )

  return (
    <>
      <div style={{ border: `1px solid ${running ? 'rgba(255,77,0,0.35)' : 'var(--border)'}`, background: running ? 'rgba(255,77,0,0.05)' : 'var(--dark)', padding: '1.5rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
          <p style={{ fontFamily: 'var(--font-d)', fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0, color: 'var(--white)' }}>
            {workoutName}
          </p>
          <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: running ? 'var(--orange)' : 'var(--muted)', border: `1px solid ${running ? 'rgba(255,77,0,0.4)' : 'var(--border)'}`, padding: '0.14rem 0.5rem' }}>
            {running ? `● ${t('session.running')}` : `❚❚ ${t('session.paused')}`}
          </span>
        </div>

        <div style={{ fontFamily: 'var(--font-d)', fontSize: 'clamp(3rem, 13vw, 5.5rem)', fontWeight: 900, lineHeight: 1, letterSpacing: '0.02em', color: running ? 'var(--white)' : 'var(--muted)', margin: '0.9rem 0 0.2rem', fontVariantNumeric: 'tabular-nums' }}>
          {formatClock(active)}
        </div>
        <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)', margin: 0 }}>
          {t('session.active_time')} · {t('session.wall_time')} {formatClock(wall)}
        </p>

        {!running && (
          <p style={{ color: 'var(--muted)', fontSize: '0.8125rem', marginTop: '0.8rem', marginBottom: 0 }}>
            {t('session.paused_note')}
          </p>
        )}
        {active < 30000 && (
          <p style={{ color: 'var(--muted)', fontSize: '0.8125rem', marginTop: '0.8rem', marginBottom: 0, opacity: 0.8 }}>
            {t('session.zero_warning')}
          </p>
        )}

        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.3rem', flexWrap: 'wrap' }}>
          <ActionButton onClick={running ? pause : resume} variant="ghost">
            {running ? `❚❚ ${t('session.pause')}` : `▶ ${t('session.resume')}`}
          </ActionButton>
          <ActionButton onClick={() => { void finish() }} variant="primary" disabled={saving}>
            {saving ? t('session.saving') : `■ ${t('session.finish')}`}
          </ActionButton>
          <ActionButton
            onClick={() => { if (confirmDiscard) { discard(); setConfirmDiscard(false) } else setConfirmDiscard(true) }}
            variant={confirmDiscard ? 'danger' : 'ghost'}
          >
            {confirmDiscard ? t('session.discard_confirm') : t('session.discard')}
          </ActionButton>
        </div>
        {confirmDiscard && (
          <p style={{ color: 'var(--muted)', fontSize: '0.8125rem', marginTop: '0.6rem', marginBottom: 0 }}>
            {t('session.discard_hint')}
          </p>
        )}
      </div>

      {items.length > 0 && (
        <div style={{ border: '1px solid var(--border)', background: 'var(--dark)', padding: '1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.9rem' }}>
            <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '0.9375rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
              {t('session.checklist')}
            </h2>
            <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.8125rem', letterSpacing: '0.1em', color: 'var(--muted)' }}>
              {t('session.checklist_progress', { done: doneCount, total: items.length })}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {items.map((item) => {
              const done = doneExerciseIds.includes(item.id)
              const detail = [
                item.sets ? `${item.sets}×` : null,
                item.reps ?? null,
                item.weight ?? null
              ].filter(Boolean).join(' ')
              return (
                <button
                  key={item.id}
                  onClick={() => toggleExercise(item.id)}
                  aria-pressed={done}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.7rem', textAlign: 'left', cursor: 'pointer',
                    border: `1px solid ${done ? 'rgba(34,197,94,0.35)' : 'var(--border)'}`,
                    background: done ? 'rgba(34,197,94,0.06)' : 'transparent',
                    padding: '0.6rem 0.8rem', width: '100%',
                    color: done ? 'var(--muted)' : 'var(--white)'
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.9375rem', color: done ? '#22c55e' : 'var(--muted)', flexShrink: 0 }}>
                    {done ? '✓' : '○'}
                  </span>
                  <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.8125rem', letterSpacing: '0.05em', textTransform: 'uppercase', textDecoration: done ? 'line-through' : 'none' }}>
                    {item.name}
                  </span>
                  {detail && (
                    <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: '0.8125rem', flexShrink: 0 }}>
                      {detail}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ border: '1px solid var(--border)', background: 'var(--dark)', padding: '1.25rem' }}>
        <label style={{ display: 'block', fontFamily: 'var(--font-d)', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
          {t('session.notes_label')}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('session.notes_placeholder')}
          rows={3}
          style={textareaStyle}
        />
      </div>

      {error && (
        <div style={{ marginTop: '0.9rem', padding: '0.65rem 0.9rem', background: 'rgba(255,77,0,0.1)', border: '1px solid rgba(255,77,0,0.3)', color: 'var(--orange)', fontSize: '0.8125rem' }}>
          {error}
        </div>
      )}
    </>
  )
}

/* ── Résumé après enregistrement ────────────────────────────────────────── */

function SummaryPanel({ basePath }: { basePath: string }) {
  const { t } = useTranslation(['workouts', 'common'])
  const navigate = useNavigate()
  const summary = useSessionStore((s) => s.lastSummary)
  const clearSummary = useSessionStore((s) => s.clearSummary)
  if (!summary) return null

  return (
    <Shell tag={t('session.page_tag')} title={t('session.done_title')}>
      <div style={{ border: '1px solid rgba(34,197,94,0.35)', background: 'rgba(34,197,94,0.06)', padding: '1.75rem' }}>
        <p style={{ fontFamily: 'var(--font-d)', fontSize: 'clamp(2rem, 8vw, 3rem)', fontWeight: 900, color: '#22c55e', margin: 0, lineHeight: 1 }}>
          {t('session.done_minutes', { minutes: summary.activeMinutes })}
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1.1rem' }}>
          <Stat label={t('session.done_total', { total: summary.totalMinutes })} />
          <Stat label={t('session.done_streak', { days: summary.currentStreak })} />
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          <ActionButton onClick={() => { clearSummary(); navigate(`${basePath}/rank`) }} variant="primary">
            {t('session.done_rank')}
          </ActionButton>
          <ActionButton onClick={clearSummary} variant="ghost">
            {t('session.done_close')}
          </ActionButton>
        </div>
      </div>
    </Shell>
  )
}

function Stat({ label }: { label: string }) {
  return (
    <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', border: '1px solid var(--border)', padding: '0.25rem 0.6rem' }}>
      {label}
    </span>
  )
}

function ActionButton({ children, onClick, variant, disabled }: {
  children: ReactNode
  onClick: () => void
  variant: 'primary' | 'ghost' | 'danger'
  disabled?: boolean
}) {
  const palette = {
    primary: { color: 'var(--black)', background: 'var(--orange)', border: '1px solid var(--orange)' },
    ghost: { color: 'var(--white)', background: 'transparent', border: '1px solid var(--border)' },
    danger: { color: 'var(--black)', background: '#ef4444', border: '1px solid #ef4444' }
  }[variant]

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: 'var(--font-d)', fontSize: '0.8125rem', fontWeight: 700, letterSpacing: '0.1em',
        textTransform: 'uppercase', padding: '0.7rem 1.3rem',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1,
        ...palette
      }}
    >
      {children}
    </button>
  )
}
