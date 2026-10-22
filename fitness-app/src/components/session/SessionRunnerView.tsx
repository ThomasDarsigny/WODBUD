import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSessionStore } from '../../stores/sessionStore'
import { useWorkoutStore } from '../../stores/workoutStore'
import { formatClock } from '../../lib/sessionTimer'
import { unlockAudio } from '../../lib/gymCues'
import { METHOD_I18N_KEYS } from '../../types'
import { textarea as textareaStyle } from '../../styles/ui'
import { badgeDisplay, fetchBadgesByKeys, type Badge } from '../../lib/badges'
import { computeProgress, rankDisplay } from '../../lib/ranks'
import { useRankStore } from '../../stores/rankStore'
import BadgeToken from '../badges/BadgeToken'
import WorkoutMannequin from '../mannequin/WorkoutMannequin'
import { GymOverlay, clockText, useClockLabels, useGymClock } from './GymClock'
import ResultSheet from '../records/ResultSheet'
import { formatSeconds, fromKg, readUnit, type ExerciseResult, type ResultInput } from '../../lib/records'

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
        onClick={() => { unlockAudio(); startSession(null, t('session.free_session')) }}
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
              onClick={() => { unlockAudio(); startSession(w.id, w.name) }}
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

/* ── Activité cardio chronométrée ───────────────────────────────────────── */

/**
 * Seul le chrono enregistre des minutes : consigner après coup une séance
 * « déjà faite » permettait de gonfler les classements, c'est retiré.
 */
function QuickLogPanel() {
  const { t } = useTranslation(['workouts', 'common'])
  const { activities, fetchActivities, startActivity } = useSessionStore()

  // `undefined` = l'utilisateur n'a rien choisi, on prend la première activité.
  // `null` = il a explicitement choisi « autre ». Dériver la valeur évite un
  // setState synchrone dans un effet, et donc un rendu en cascade.
  const [activityId, setActivityId] = useState<string | null | undefined>(undefined)

  useEffect(() => { void fetchActivities() }, [fetchActivities])

  // Course à pied en premier choix : c'est le cas d'usage qui a motivé l'écran.
  const selectedId = activityId === undefined ? (activities[0]?.id ?? null) : activityId
  const selectedName =
    activities.find((a) => a.id === selectedId)?.name ?? t('session.log_other')

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

      <button
        onClick={() => { unlockAudio(); startActivity(selectedId, selectedName) }}
        style={{
          width: '100%',
          minHeight: 52,
          fontFamily: 'var(--font-d)',
          fontSize: '1.25rem',
          fontWeight: 900,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--black)',
          background: 'var(--orange)',
          border: '1px solid var(--orange)',
          cursor: 'pointer'
        }}
      >
        {t('session.log_start')}
      </button>
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
    workoutId, workoutName, activityName, items, doneExerciseIds, notes, saving, error,
    pause, resume, toggleExercise, setNotes, finish, discard,
    pendingResults, addPendingResult, removePendingResult
  } = useSessionStore()
  const [resultFor, setResultFor] = useState<{ id: string; name: string } | null>(null)
  const closeResult = useCallback(() => setResultFor(null), [])

  // Une séance cardio n'a pas de WOD : c'est le nom de l'activité qui titre.
  const heading = activityName || workoutName

  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [gymOpen, setGymOpen] = useState(false)
  const closeGym = useCallback(() => setGymOpen(false), [])

  const gym = useGymClock()
  const { clock, active, wall, running, withFormat, sound, setSound } = gym
  const labels = useClockLabels(clock)
  const toggle = () => { unlockAudio(); if (running) pause(); else resume() }
  const doneCount = useMemo(
    () => items.filter((i) => doneExerciseIds.includes(i.id)).length,
    [items, doneExerciseIds]
  )

  return (
    <>
      <div style={{ border: `1px solid ${running ? 'rgba(255,77,0,0.35)' : 'var(--border)'}`, background: running ? 'rgba(255,77,0,0.05)' : 'var(--dark)', padding: '1.5rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
          <p style={{ fontFamily: 'var(--font-d)', fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0, color: 'var(--white)' }}>
            {heading}
          </p>
          <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: running ? 'var(--orange)' : 'var(--muted)', border: `1px solid ${running ? 'rgba(255,77,0,0.4)' : 'var(--border)'}`, padding: '0.14rem 0.5rem' }}>
            {running ? `● ${t('session.running')}` : `❚❚ ${t('session.paused')}`}
          </span>
        </div>

        <div style={{ fontFamily: 'var(--font-d)', fontSize: 'clamp(3rem, 13vw, 5.5rem)', fontWeight: 900, lineHeight: 1, letterSpacing: '0.02em', color: running ? 'var(--white)' : 'var(--muted)', margin: '0.9rem 0 0.2rem', fontVariantNumeric: 'tabular-nums' }}>
          {clockText(clock)}
        </div>
        {withFormat && (
          <p className="wb-run-phase" data-phase={running ? clock.phase : 'paused'}>
            {labels.phase}{labels.round ? ` · ${labels.round}` : ''}
          </p>
        )}
        <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)', margin: 0 }}>
          {withFormat ? `${t('session.active_time')} ${formatClock(active)} · ` : `${t('session.active_time')} · `}{t('session.wall_time')} {formatClock(wall)}
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

        <button type="button" className="wb-run-gym" onClick={() => { unlockAudio(); setGymOpen(true) }}>
          <span aria-hidden="true">⛶</span> {t('session.gym_mode')}
          <small>{t('session.gym_hint')}</small>
        </button>
        <button
          type="button"
          className="wb-run-sound"
          onClick={() => setSound(!sound)}
          aria-pressed={sound}
        >
          {sound ? `🔊 ${t('session.sound_on')}` : `🔇 ${t('session.sound_off')}`}
        </button>

        <div className="wb-run-actions">
          <ActionButton onClick={toggle} variant="ghost">
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

      {workoutId && (<div style={{ border: '1px solid var(--border)', background: 'var(--dark)', padding: '1.25rem', marginBottom: '1.25rem' }}>
        <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', margin: '0 0 0.6rem' }}>
          {t('mannequin.title', { ns: 'common' })}
        </p>
        <WorkoutMannequin key={workoutId} workoutId={workoutId} />
      </div>)}

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
              const mine = pendingResults.filter((r) => r.exerciseId === item.exerciseId)
              return (
                <div key={item.id} className="wb-run-item">
                <div className="wb-run-item-row">
                <button
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
                <button
                  type="button"
                  className="wb-run-result"
                  onClick={() => setResultFor({ id: item.exerciseId, name: item.name })}
                  aria-label={t('records.add_for', { ns: 'common', name: item.name })}
                >
                  +
                </button>
                </div>
                {mine.length > 0 && (
                  <ul className="wb-run-chips">
                    {mine.map((r) => (
                      <li key={r.key}>
                        <span>🏋 {resultText(r)}</span>
                        <button type="button" onClick={() => removePendingResult(r.key)} aria-label={t('actions.delete', { ns: 'common' })}>✕</button>
                      </li>
                    ))}
                  </ul>
                )}
                </div>
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

      {resultFor && (
        <ResultSheet
          exercise={{ id: resultFor.id, name: resultFor.name, timeBased: false }}
          onSubmit={(input) => addPendingResult(input)}
          onClose={closeResult}
        />
      )}

      {gymOpen && <GymOverlay gym={gym} title={heading} onClose={closeGym} onToggle={toggle} />}

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
          {t('session.done_minutes', { count: summary.activeMinutes })}
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1.1rem' }}>
          <Stat label={t('session.done_total', { total: summary.totalMinutes })} />
          <Stat label={t('session.done_streak', { days: summary.currentStreak })} />
        </div>

        {summary.newRecords.length > 0 && (
          <div className="wb-run-prs">
            <p>{t('records.new_pr', { ns: 'common', count: summary.newRecords.length })}</p>
            <ul>
              {summary.newRecords.map(({ name, result }) => (
                <li key={result.id}><strong>{name}</strong> <span>{resultText(result)}</span></li>
              ))}
            </ul>
          </div>
        )}

        <SessionRewards
          badgeKeys={summary.newBadges}
          previousMinutes={summary.previousMinutes}
          totalMinutes={summary.totalMinutes}
        />
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

/**
 * Ce que la séance vient de rapporter.
 *
 * C'est le moment où la récompense a le plus de sens : juste après l'effort,
 * pas trois écrans plus loin. Le composant ne s'affiche que s'il y a vraiment
 * quelque chose à annoncer — un bandeau « rien de neuf » serait pire que rien.
 */
function SessionRewards({ badgeKeys, previousMinutes, totalMinutes }: {
  badgeKeys: string[]
  previousMinutes: number
  totalMinutes: number
}) {
  const { t, i18n } = useTranslation(['workouts', 'common'])
  const { ranks, fetchAll } = useRankStore()
  const [badges, setBadges] = useState<Badge[]>([])

  // L'échelle des rangs est nécessaire pour savoir si on vient d'en changer.
  useEffect(() => { void fetchAll() }, [fetchAll])

  useEffect(() => {
    // Rien à charger : `badges` reste à son état initial, pas de setState.
    if (badgeKeys.length === 0) return
    let cancelled = false
    fetchBadgesByKeys(badgeKeys)
      .then((rows) => { if (!cancelled) setBadges(rows) })
      .catch(() => { /* Les badges restent visibles dans « Mon rang ». */ })
    return () => { cancelled = true }
  }, [badgeKeys])

  // Le trigger ajoute exactement les minutes actives : comparer le rang
  // d'avant et d'après ne coûte aucune requête supplémentaire.
  const before = ranks.length ? computeProgress(ranks, previousMinutes).current : null
  const after = ranks.length ? computeProgress(ranks, totalMinutes).current : null
  const rankedUp = Boolean(after && before?.key !== after.key)

  if (!rankedUp && badges.length === 0) return null

  return (
    <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(34,197,94,0.25)' }}>
      {rankedUp && after && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: badges.length ? '1.1rem' : 0 }}>
          <span style={{ width: 26, height: 26, flexShrink: 0, border: `2px solid ${after.color}`, background: `${after.color}33`, display: 'inline-block', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
          <span>
            <span style={{ display: 'block', fontFamily: 'var(--font-d)', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              {t('session.new_rank')}
            </span>
            <span style={{ fontFamily: 'var(--font-d)', fontSize: '1.25rem', fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase', color: after.color }}>
              {rankDisplay(after, i18n.language)}
            </span>
          </span>
        </div>
      )}

      {badges.length > 0 && (
        <>
          <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', margin: '0 0 0.75rem' }}>
            {t('session.new_badges', { count: badges.length })}
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {badges.map((b) => (
              <div key={b.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', width: 96, textAlign: 'center' }}>
                <BadgeToken icon={b.icon} state="unlocked" size={56} title={badgeDisplay(b, i18n.language)} />
                <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1.2 }}>
                  {badgeDisplay(b, i18n.language)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/** Résultat lisible, dans l'unité choisie par l'athlète. */
function resultText(r: ResultInput | ExerciseResult): string {
  const unit = readUnit()
  if (r.weightKg != null) {
    const w = `${fromKg(r.weightKg, unit)} ${unit}`
    return r.reps && r.reps > 1 ? `${w} × ${r.reps}` : w
  }
  if (r.seconds != null) return formatSeconds(r.seconds)
  return `${r.reps ?? 0} reps`
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
        textTransform: 'uppercase', padding: '0.7rem 1.3rem', minHeight: 48,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1,
        ...palette
      }}
    >
      {children}
    </button>
  )
}
