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
import RestBar from './RestBar'
import NavIcon from '../navigation/NavIcon'
import { formatSeconds, fromKg, readUnit, type ExerciseResult, type ResultInput } from '../../lib/records'
import { Celebrate, Pop } from '../ui/motion'

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

function Shell({ tag, title, subtitle, children }: { tag: string; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="wb-page">
      <header className="wb-ph">
        <div>
          <p className="wb-ph-tag">{tag}</p>
          <h1>{title}</h1>
          {subtitle && <p className="wb-ph-sub">{subtitle}</p>}
        </div>
      </header>
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
    <Shell tag={t('session.page_tag')} title={t('session.picker_title')} subtitle={t('session.picker_subtitle')}>
      <button
        type="button"
        className="wb-card wb-card--accent wb-pick-free"
        onClick={() => { unlockAudio(); startSession(null, t('session.free_session')) }}
      >
        <span className="wb-pick-play" aria-hidden="true">▶</span>
        <span>
          <strong>{t('session.free_session')}</strong>
          <small>{t('session.free_session_hint')}</small>
        </span>
      </button>

      <section className="wb-home-sec">
        <div className="wb-sec"><h2>{t('session.choose_workout')}</h2></div>
        {savedWorkouts.length === 0 ? (
          <div className="wb-empty">
            <strong>{t('session.no_workouts')}</strong>
          </div>
        ) : (
          <ul className="wb-list wb-stagger">
            {savedWorkouts.map((w) => (
              <li key={w.id}>
                <button type="button" className="wb-row" onClick={() => { unlockAudio(); startSession(w.id, w.name) }}>
                  <span className="wb-row-icon"><NavIcon name="bolt" size={20} /></span>
                  <span className="wb-row-main">
                    <strong>{w.name}</strong>
                    <span>
                      {t(METHOD_I18N_KEYS[w.method], { ns: 'common' })}
                      {w.duration_minutes ? ` · ${w.duration_minutes} ${t('fields.duration_unit_min')}` : ''}
                    </span>
                  </span>
                  <span className="wb-pick-go" aria-hidden="true">▶</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <QuickLogPanel />
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
    <section className="wb-home-sec">
      <div className="wb-sec"><h2>{t('session.log_title')}</h2></div>
      <div className="wb-card wb-cardio">
        <p className="wb-cardio-hint">{t('session.log_subtitle')}</p>
        <div className="wb-chips" role="group" aria-label={t('session.log_activity')}>
          {activities.map((a) => (
            <button key={a.id} type="button" className="wb-chip" aria-pressed={selectedId === a.id} onClick={() => setActivityId(a.id)}>
              {a.name}
            </button>
          ))}
          <button type="button" className="wb-chip" aria-pressed={selectedId === null} onClick={() => setActivityId(null)}>
            {t('session.log_other')}
          </button>
        </div>
        <button
          type="button"
          className="wb-btn wb-btn--primary wb-btn--block wb-btn--lg"
          onClick={() => { unlockAudio(); startActivity(selectedId, selectedName) }}
        >
          ▶ {t('session.log_start')}
        </button>
      </div>
    </section>
  )
}

/* ── Chrono en cours ────────────────────────────────────────────────────── */

function RunnerPanel() {
  const { t } = useTranslation(['workouts', 'common'])
  const {
    workoutId, workoutName, activityName, items, doneExerciseIds, notes, saving, error,
    pause, resume, toggleExercise, setNotes, finish, discard,
    pendingResults, addPendingResult, removePendingResult,
    setsDone, completeSet, undoSet
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
      <div className={`wb-card wb-run-main${running ? ' is-running' : ''}`}>
        <div className="wb-run-head">
          <p className="wb-run-title">{heading}</p>
          <span className={`wb-pill${running ? ' wb-pill--orange' : ''}`}>
            {running ? `● ${t('session.running')}` : `❚❚ ${t('session.paused')}`}
          </span>
        </div>

        <div className="wb-run-clock">{clockText(clock)}</div>
        {withFormat && (
          <p className="wb-run-phase" data-phase={running ? clock.phase : 'paused'}>
            {labels.phase}{labels.round ? ` · ${labels.round}` : ''}
          </p>
        )}
        <p className="wb-run-meta">
          {withFormat ? `${t('session.active_time')} ${formatClock(active)} · ` : `${t('session.active_time')} · `}{t('session.wall_time')} {formatClock(wall)}
        </p>

        {!running && <p className="wb-run-note">{t('session.paused_note')}</p>}
        {active < 30000 && <p className="wb-run-note">{t('session.zero_warning')}</p>}

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
        {confirmDiscard && <p className="wb-run-note">{t('session.discard_hint')}</p>}
      </div>

      {workoutId && (<div className="wb-card">
        <p className="wb-card-title">{t('mannequin.title', { ns: 'common' })}</p>
        <WorkoutMannequin key={workoutId} workoutId={workoutId} />
      </div>)}

      {items.length > 0 && (
        <div className="wb-card">
          <div className="wb-card-head">
            <p className="wb-card-title">{t('session.checklist')}</p>
            <span className="wb-pill">{t('session.checklist_progress', { done: doneCount, total: items.length })}</span>
          </div>
          <div className="wb-run-items">
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
                <button type="button" className="wb-run-check" onClick={() => toggleExercise(item.id)} aria-pressed={done}>
                  <span className="wb-run-tick" aria-hidden="true">{done ? '✓' : ''}</span>
                  <span className="wb-run-name">{item.name}</span>
                  {detail && <span className="wb-run-detail">{detail}</span>}
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
                {(item.sets ?? 0) > 1 && (() => {
                  const total = item.sets ?? 1
                  const doneSets = Math.min(total, setsDone[item.id] ?? 0)
                  return (
                    <div className="wb-run-sets">
                      <span className="wb-run-dots" role="img" aria-label={t('session.sets_progress', { done: doneSets, total })}>
                        {Array.from({ length: total }, (_, i) => <i key={i} className={i < doneSets ? 'is-on' : undefined} />)}
                      </span>
                      {doneSets > 0 && (
                        <button type="button" className="wb-run-undo" onClick={() => undoSet(item.id)} aria-label={t('session.set_undo')}>↶</button>
                      )}
                      {doneSets < total && (
                        <button type="button" className="wb-run-set" onClick={() => { unlockAudio(); completeSet(item.id) }}>
                          ✓ {t('session.set_done', { n: doneSets + 1, total })}
                        </button>
                      )}
                    </div>
                  )
                })()}
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

      <div className="wb-card">
        <label htmlFor="wb-session-notes" className="wb-card-title">{t('session.notes_label')}</label>
        <textarea
          id="wb-session-notes"
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

      {!gymOpen && <RestBar />}

      {gymOpen && <GymOverlay gym={gym} title={heading} onClose={closeGym} onToggle={toggle} />}

      {error && (
        <div className="wb-rec-error" role="alert">
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
    <Shell tag={t('session.page_tag')} title={summary.offline ? t('offline.done_title', { ns: 'common' }) : t('session.done_title')}>
      <div className="wb-card wb-run-done">
        {!summary.offline && <Celebrate big={summary.newRecords.length > 0 || summary.newBadges.length > 0} />}
        <Pop>
          <p className="wb-run-done-big">
            {t('session.done_minutes', { count: summary.activeMinutes })}
          </p>
        </Pop>
        {summary.offline ? (
          // Totaux, rang et badges viennent du serveur : on ne les invente pas.
          <p className="wb-run-offline">{t('offline.done_hint', { ns: 'common' })}</p>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1.1rem' }}>
            <Stat label={t('session.done_total', { total: summary.totalMinutes })} />
            <Stat label={t('session.done_streak', { days: summary.currentStreak })} />
          </div>
        )}

        {summary.newRecords.length > 0 && (
          <Pop delay={0.25}>
          <div className="wb-run-prs">
            <p>{t('records.new_pr', { ns: 'common', count: summary.newRecords.length })}</p>
            <ul className="wb-stagger">
              {summary.newRecords.map(({ name, result }) => (
                <li key={result.id}><strong>{name}</strong> <span>{resultText(result)}</span></li>
              ))}
            </ul>
          </div>
          </Pop>
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
                <BadgeToken icon={b.icon} art={b.art} fresh state="unlocked" size={72} title={badgeDisplay(b, i18n.language)} />
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
  return <span className="wb-pill">{label}</span>
}

function ActionButton({ children, onClick, variant, disabled }: {
  children: ReactNode
  onClick: () => void
  variant: 'primary' | 'ghost' | 'danger'
  disabled?: boolean
}) {
  const cls = { primary: 'wb-btn--primary', ghost: 'wb-btn--secondary', danger: 'wb-btn--danger is-armed' }[variant]
  return (
    <button type="button" className={`wb-btn ${cls}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}
