import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { localDate } from '../lib/scheduledWorkouts'
import { fetchClassPlansBetween, type ClassPlan } from '../lib/classPlans'
import { checkInPath, fetchAttendanceBetween, openCheckIn, type Attendance } from '../lib/attendance'
import { fetchWhiteboard, type WhiteboardRow } from '../lib/whiteboard'
import { formatScore } from '../lib/scores'
import { readUnit } from '../lib/records'
import { formatSlotTime, nextOccurrence, type ClassSlot } from '../lib/classSlots'
import { useClassStore } from '../stores/classStore'
import { useClassSlotStore } from '../stores/classSlotStore'
import { METHOD_I18N_KEYS, type ClassMember, type WorkoutMethod } from '../types'

interface Line { position: number; sets: number | null; reps: string | null; weight: string | null; name: string }
interface Wod { method: WorkoutMethod | null; duration: number | null; notes: string | null; lines: Line[] }

const NO_MEMBERS: ClassMember[] = []
const NO_SLOTS: ClassSlot[] = []
const ATTENDANCE_MS = 10_000
const BOARD_MS = 15_000
const PLANS_MS = 5 * 60_000
const QR_MS = 10 * 60_000
const ROTATE_MS = 30_000

/**
 * Mode TV (3.3) : l'écran de la salle. Le WOD du jour lisible à 5 mètres,
 * le QR de présence et les arrivées en direct, puis le tableau blanc.
 * Tout se rafraîchit seul ; l'écran reste allumé tant que la page est ouverte.
 */
export default function TvModeView() {
  const { classId = '' } = useParams<{ classId: string }>()
  const { t, i18n } = useTranslation(['common', 'workouts'])
  const lang = i18n.language
  const unit = readUnit()
  const [now, setNow] = useState(() => new Date())
  const today = localDate(now)
  const [className, setClassName] = useState<string | null | undefined>(undefined)
  const [plans, setPlans] = useState<ClassPlan[] | null>(null)
  const [planIndex, setPlanIndex] = useState(0)
  const [wods, setWods] = useState<Record<string, Wod>>({})
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [qr, setQr] = useState<{ code: string; expires_at: string } | null | 'denied'>(null)
  const [board, setBoard] = useState<WhiteboardRow[] | null>(null)
  const [view, setView] = useState<'wod' | 'board'>('wod')
  const [rotate, setRotate] = useState(false)
  const members = useClassStore((s) => s.members[classId] ?? NO_MEMBERS)
  const fetchMembers = useClassStore((s) => s.fetchMembers)
  const slots = useClassSlotStore((s) => s.byClass[classId] ?? NO_SLOTS)
  const fetchSlots = useClassSlotStore((s) => s.fetchSlots)

  const plan = plans && plans.length ? plans[Math.min(planIndex, plans.length - 1)] : null
  const wod = plan?.workout_id ? wods[plan.workout_id] : undefined

  // Horloge (et passage à minuit).
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15_000)
    return () => window.clearInterval(id)
  }, [])

  // Le cours, ses membres et son horaire.
  useEffect(() => {
    let alive = true
    supabase.from('classes').select('name').eq('id', classId).maybeSingle()
      .then(({ data }) => { if (alive) setClassName(data?.name ?? null) })
    void fetchMembers(classId)
    void fetchSlots([classId])
    return () => { alive = false }
  }, [classId, fetchMembers, fetchSlots])

  // Les séances du jour, relues toutes les 5 minutes (le coach peut changer le WOD).
  const loadPlans = useCallback(() => fetchClassPlansBetween(classId, today, today), [classId, today])
  useEffect(() => {
    let alive = true
    const run = () => { loadPlans().then((p) => { if (alive) setPlans(p) }).catch(() => { if (alive) setPlans([]) }) }
    run()
    const id = window.setInterval(run, PLANS_MS)
    return () => { alive = false; window.clearInterval(id) }
  }, [loadPlans])

  // Le contenu de chaque WOD du jour.
  const wodIds = (plans ?? []).map((p) => p.workout_id).filter((id): id is string => Boolean(id)).sort().join(',')
  useEffect(() => {
    if (!wodIds) return
    let alive = true
    supabase
      .from('workouts')
      .select('id, method, duration_minutes, notes, workout_exercises(position, sets, reps, weight, exercises(name))')
      .in('id', wodIds.split(','))
      .then(({ data }) => {
        if (!alive) return
        const next: Record<string, Wod> = {}
        for (const w of data ?? []) {
          next[w.id] = {
            method: (w.method as WorkoutMethod) ?? null,
            duration: w.duration_minutes,
            notes: w.notes,
            lines: [...(w.workout_exercises ?? [])]
              .sort((a, b) => a.position - b.position)
              .map((l) => ({ position: l.position, sets: l.sets, reps: l.reps, weight: l.weight, name: l.exercises?.name ?? '' }))
          }
        }
        setWods(next)
      })
    return () => { alive = false }
  }, [wodIds])

  // Présences du jour, en direct.
  useEffect(() => {
    let alive = true
    const run = () => { fetchAttendanceBetween(classId, today, today).then((r) => { if (alive) setAttendance(r) }).catch(() => {}) }
    run()
    const id = window.setInterval(run, ATTENDANCE_MS)
    return () => { alive = false; window.clearInterval(id) }
  }, [classId, today])

  // QR : open_checkin rend le même code tant qu'il vaut encore 30 minutes, puis un neuf.
  useEffect(() => {
    let alive = true
    const run = () => { openCheckIn(classId).then((q) => { if (alive) setQr(q) }).catch(() => { if (alive) setQr('denied') }) }
    run()
    const id = window.setInterval(run, QR_MS)
    return () => { alive = false; window.clearInterval(id) }
  }, [classId])

  // Tableau blanc de la séance affichée.
  const planId = plan?.id ?? null
  useEffect(() => {
    if (!planId) return
    let alive = true
    const run = () => { fetchWhiteboard(planId).then((r) => { if (alive) setBoard(r) }).catch(() => { if (alive) setBoard([]) }) }
    run()
    const id = window.setInterval(run, BOARD_MS)
    return () => { alive = false; window.clearInterval(id) }
  }, [planId])

  // Alterner WOD / tableau blanc.
  useEffect(() => {
    if (!rotate) return
    const id = window.setInterval(() => setView((v) => (v === 'wod' ? 'board' : 'wod')), ROTATE_MS)
    return () => window.clearInterval(id)
  }, [rotate])

  // Garder l'écran allumé (si le navigateur le permet).
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    const ask = () => {
      if (document.visibilityState !== 'visible' || !('wakeLock' in navigator)) return
      navigator.wakeLock.request('screen').then((l) => { lock = l }).catch(() => {})
    }
    ask()
    document.addEventListener('visibilitychange', ask)
    return () => { document.removeEventListener('visibilitychange', ask); void lock?.release().catch(() => {}) }
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    else void document.documentElement.requestFullscreen?.().catch(() => {})
  }, [])

  // Raccourcis : W (WOD), B (tableau blanc), F (plein écran), ← → (séance).
  const planCount = plans?.length ?? 0
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      const k = e.key.toLowerCase()
      if (k === 'w') setView('wod')
      else if (k === 'b' || k === 't') setView('board')
      else if (k === 'f') toggleFullscreen()
      else if (e.key === 'ArrowRight' && planCount > 1) setPlanIndex((i) => (i + 1) % planCount)
      else if (e.key === 'ArrowLeft' && planCount > 1) setPlanIndex((i) => (i - 1 + planCount) % planCount)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleFullscreen, planCount])

  const names = useMemo(() => new Map(members.map((m) => [m.athlete_id, m.profile?.full_name || t('attendance.member')])), [members, t])
  const arrivals = [...attendance].sort((a, b) => b.checked_in_at.localeCompare(a.checked_in_at))
  const next = nextOccurrence(slots, now)
  const clock = formatSlotTime(`${now.getHours()}:${now.getMinutes()}`, lang)
  const dateLabel = now.toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'long' })
  const title = plan ? (plan.title || plan.workout_title || t('tv.wod')) : null
  const lineText = (l: Line) => [l.sets && l.reps ? `${l.sets} × ${l.reps}` : l.reps].filter(Boolean).join('')
  const qrUrl = qr && qr !== 'denied' ? `${window.location.origin}${checkInPath(classId, qr.code)}` : ''

  if (className === null) {
    return (
      <main className="wb-tv wb-tv--empty">
        <p className="wb-tv-big">{t('tv.not_found')}</p>
        <Link to="/dashboard/classes" className="wb-btn wb-btn--secondary">{t('tv.exit')}</Link>
      </main>
    )
  }

  return (
    <main className="wb-tv" data-view={view}>
      <header className="wb-tv-head">
        <span className="wb-tv-brand">WOD<span>BUD</span></span>
        <div className="wb-tv-class">
          <strong>{className ?? ''}</strong>
          <span>
            {dateLabel}
            {next && ` · ${next.ongoing ? t('tv.ongoing', { time: formatSlotTime(next.slot.start_time, lang) }) : next.date === today ? t('tv.next_today', { time: formatSlotTime(next.slot.start_time, lang) }) : ''}`}
          </span>
        </div>
        <time className="wb-tv-clock" dateTime={now.toISOString()}>{clock}</time>
      </header>

      <div className="wb-tv-body">
        <section className="wb-tv-main" aria-live="polite">
          {plans === null ? (
            <p className="wb-tv-muted">{t('status.loading')}</p>
          ) : !plan ? (
            <div className="wb-tv-none">
              <p className="wb-tv-big">{t('tv.no_wod')}</p>
              <p className="wb-tv-muted">{t('tv.no_wod_hint')}</p>
            </div>
          ) : view === 'wod' ? (
            <>
              <p className="wb-tv-tag">
                {t('tv.wod_of_day')}
                {planCount > 1 && ` · ${planIndex + 1}/${planCount}`}
              </p>
              <h1 className="wb-tv-title">{title}</h1>
              {wod && (wod.method || wod.duration) && (
                <p className="wb-tv-meta">
                  {wod.method && <span>{t(METHOD_I18N_KEYS[wod.method])}</span>}
                  {wod.duration ? <span>{t('tv.minutes', { count: wod.duration })}</span> : null}
                </p>
              )}
              {wod && wod.lines.length > 0 && (
                <ol className="wb-tv-lines">
                  {wod.lines.map((l) => (
                    <li key={l.position}>
                      {lineText(l) && <span className="wb-tv-reps">{lineText(l)}</span>}
                      <span className="wb-tv-move">{l.name}</span>
                      {l.weight && <span className="wb-tv-load">{l.weight}</span>}
                    </li>
                  ))}
                </ol>
              )}
              {(plan.notes || wod?.notes) && <p className="wb-tv-notes">{plan.notes || wod?.notes}</p>}
            </>
          ) : (
            <>
              <p className="wb-tv-tag">{t('tv.board')} · {title}</p>
              {board === null ? (
                <p className="wb-tv-muted">{t('status.loading')}</p>
              ) : board.length === 0 ? (
                <div className="wb-tv-none">
                  <p className="wb-tv-big">{t('tv.board_empty')}</p>
                  <p className="wb-tv-muted">{t('tv.board_empty_hint')}</p>
                </div>
              ) : (
                <ol className="wb-tv-board">
                  {board.slice(0, 12).map((r, i) => (
                    <li key={r.scoreId}>
                      <span className="wb-tv-rank">{i + 1}</span>
                      <span className="wb-tv-name">{r.fullName ?? t('whiteboard.anonymous')}</span>
                      <span className="wb-tv-score">{formatScore(r, unit)}</span>
                      <span className={`wb-tv-rx${r.rx === 'rx' ? ' is-rx' : ''}`}>{t(`score.rx_${r.rx}`, { ns: 'workouts' })}</span>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </section>

        <aside className="wb-tv-side" aria-label={t('attendance.title')}>
          {qr && qr !== 'denied' && (
            <div className="wb-tv-qr">
              <div className="wb-tv-qr-code"><QRCodeSVG value={qrUrl} size={512} marginSize={2} title={t('attendance.qr_title')} /></div>
              <p>{t('tv.scan')}</p>
            </div>
          )}
          <div className="wb-tv-arrivals">
            <p className="wb-tv-count">{t('tv.present', { count: attendance.length })}</p>
            <ul>
              {arrivals.slice(0, 10).map((a) => <li key={a.id}>{names.get(a.user_id) ?? t('attendance.member')}</li>)}
            </ul>
            {arrivals.length > 10 && <p className="wb-tv-muted">{t('tv.more', { count: arrivals.length - 10 })}</p>}
          </div>
        </aside>
      </div>

      <nav className="wb-tv-controls" aria-label={t('tv.controls')}>
        <button type="button" aria-pressed={view === 'wod'} onClick={() => { setRotate(false); setView('wod') }}>{t('tv.show_wod')} <kbd>W</kbd></button>
        <button type="button" aria-pressed={view === 'board'} onClick={() => { setRotate(false); setView('board') }}>{t('tv.show_board')} <kbd>B</kbd></button>
        <button type="button" aria-pressed={rotate} onClick={() => setRotate((r) => !r)}>{t('tv.rotate')}</button>
        {planCount > 1 && <button type="button" onClick={() => setPlanIndex((i) => (i + 1) % planCount)}>{t('tv.next_plan')} <kbd>→</kbd></button>}
        <button type="button" onClick={toggleFullscreen}>{t('tv.fullscreen')} <kbd>F</kbd></button>
        <Link to={`/dashboard/classes?c=${classId}`}>{t('tv.exit')}</Link>
      </nav>
    </main>
  )
}
