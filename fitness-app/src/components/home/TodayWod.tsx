import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { fetchUpcoming, localDate, type ScheduledEntry } from '../../lib/scheduledWorkouts'
import { formatScore, type Score, type ScoreType, type Rx } from '../../lib/scores'
import { readUnit } from '../../lib/records'
import { useSessionStore } from '../../stores/sessionStore'
import { unlockAudio } from '../../lib/gymCues'
import { METHOD_I18N_KEYS, type WorkoutMethod } from '../../types'

interface Line { name: string; sets: number | null; reps: string | null; weight: string | null }
interface Detail { method: WorkoutMethod | null; lines: Line[] }

/**
 * Le WOD du jour (phase 1, 1.3) : ce que mon cours a programmé aujourd'hui,
 * en tête de l'accueil athlète. Le contenu du WOD est visible avant de
 * commencer ; une fois fait, la carte reste avec « Fait » et mon score.
 * Rien ne s'affiche si rien n'est prévu : la carte n'est pas un bandeau vide.
 */
export default function TodayWod() {
  const { t } = useTranslation(['common', 'workouts'])
  const navigate = useNavigate()
  const startSession = useSessionStore((s) => s.startSession)
  const sessionRunning = useSessionStore((s) => s.timer.startedAt !== null)
  const [plans, setPlans] = useState<ScheduledEntry[] | null>(null)
  const [details, setDetails] = useState<Record<string, Detail>>({})
  const [scores, setScores] = useState<Record<string, Score>>({})

  useEffect(() => {
    let alive = true
    const today = localDate()
    fetchUpcoming()
      .then(async (rows) => {
        const todays = rows.filter((r) => r.scheduled_date === today)
        if (!alive) return
        setPlans(todays)
        const ids = [...new Set(todays.map((p) => p.workout_id).filter((id): id is string => Boolean(id)))]
        if (ids.length) {
          const { data } = await supabase
            .from('workouts')
            .select('id, method, workout_exercises(position, sets, reps, weight, exercises(name))')
            .in('id', ids)
          if (!alive) return
          const next: Record<string, Detail> = {}
          for (const w of data ?? []) {
            const rows = [...(w.workout_exercises ?? [])].sort((a, b) => a.position - b.position)
            next[w.id] = {
              method: (w.method as WorkoutMethod) ?? null,
              lines: rows.map((r) => ({ name: (r.exercises as { name: string } | null)?.name ?? '—', sets: r.sets, reps: r.reps, weight: r.weight }))
            }
          }
          setDetails(next)
        }
        const sessionIds = todays.map((p) => p.session_id).filter((id): id is string => Boolean(id))
        if (sessionIds.length) {
          const { data } = await supabase.from('workout_scores').select('*').in('session_id', sessionIds)
          if (!alive) return
          const next: Record<string, Score> = {}
          for (const s of data ?? []) {
            next[s.session_id] = {
              id: s.id, sessionId: s.session_id, workoutId: s.workout_id, scoreType: s.score_type as ScoreType,
              seconds: s.seconds ?? undefined, rounds: s.rounds ?? undefined, reps: s.reps ?? undefined,
              loadKg: s.load_kg === null ? undefined : Number(s.load_kg), capped: s.capped, rx: s.rx as Rx
            }
          }
          setScores(next)
        }
      })
      .catch(() => { if (alive) setPlans([]) })
    return () => { alive = false }
  }, [])

  if (!plans || plans.length === 0) return null

  function start(p: ScheduledEntry) {
    unlockAudio()
    if (!sessionRunning) startSession(p.workout_id, p.title ?? p.workout_title ?? t('journal.free_session', { ns: 'workouts' }), p.id)
    navigate('/athlete/session')
  }

  return (
    <section className="wb-home-sec wb-today" aria-label={t('home.today_wod')}>
      {plans.map((p) => {
        const d = p.workout_id ? details[p.workout_id] : undefined
        const done = p.session_id !== null
        const score = p.session_id ? scores[p.session_id] : undefined
        return (
          <article key={p.id} className={`wb-card wb-today-card${done ? ' is-done' : ' wb-card--accent'}`}>
            <p className="wb-today-tag">
              {t('home.today_wod')}{p.class_name ? ` · ${p.class_name}` : ''}
              {d?.method && <span className="wb-pill wb-pill--orange">{t(METHOD_I18N_KEYS[d.method])}</span>}
            </p>
            <h2>{p.title ?? p.workout_title ?? t('journal.free_session', { ns: 'workouts' })}</h2>
            {d && d.lines.length > 0 && (
              <ol className="wb-today-lines">
                {d.lines.map((l, i) => (
                  <li key={i}>
                    <span>{l.name}</span>
                    <small>{[l.sets && l.reps ? `${l.sets} × ${l.reps}` : l.reps ? `${l.reps} reps` : l.sets ? `${l.sets} ${t('home.today_sets')}` : null, l.weight].filter(Boolean).join(' · ')}</small>
                  </li>
                ))}
              </ol>
            )}
            {p.notes && <p className="wb-today-notes">{p.notes}</p>}
            {p.class_plan_id && (
              <Link to={`/athlete/whiteboard/${p.class_plan_id}`} className="wb-today-board">{t('whiteboard.open')} ›</Link>
            )}
            {done ? (
              <p className="wb-today-done">
                <span className="wb-pill wb-pill--green">✓ {t('journal.plan_done', { ns: 'workouts' })}</span>
                {score && <strong>{formatScore(score, readUnit())} <span className={`wb-pill${score.rx === 'rx' ? ' wb-pill--orange' : ''}`}>{t(`score.rx_${score.rx}`, { ns: 'workouts' })}</span></strong>}
              </p>
            ) : (
              <button type="button" className="wb-btn wb-btn--primary wb-btn--lg" onClick={() => start(p)}>
                ▶ {sessionRunning ? t('home.resume_session') : t('home.today_do')}
              </button>
            )}
          </article>
        )
      })}
    </section>
  )
}
