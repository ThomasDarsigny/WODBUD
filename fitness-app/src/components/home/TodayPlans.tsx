import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchUpcoming, localDate, type ScheduledEntry } from '../../lib/scheduledWorkouts'
import { useSessionStore } from '../../stores/sessionStore'
import { unlockAudio } from '../../lib/gymCues'

/**
 * WODs programmés pour aujourd'hui et pas encore faits, avec « Démarrer ».
 * N'apparaît pas du tout s'il n'y a rien : un bandeau « rien de prévu » sur
 * l'accueil serait du bruit.
 */
export default function TodayPlans({ basePath }: { basePath: '/dashboard' | '/athlete' }) {
  const { t } = useTranslation(['common', 'workouts'])
  const navigate = useNavigate()
  const startSession = useSessionStore((s) => s.startSession)
  const sessionRunning = useSessionStore((s) => s.timer.startedAt !== null)
  const [plans, setPlans] = useState<ScheduledEntry[]>([])

  useEffect(() => {
    let mounted = true
    const today = localDate()
    fetchUpcoming()
      .then((rows) => { if (mounted) setPlans(rows.filter((r) => r.scheduled_date === today && r.session_id === null)) })
      .catch(() => { /* l'accueil reste utilisable sans les plans */ })
    return () => { mounted = false }
  }, [])

  if (plans.length === 0) return null

  function start(p: ScheduledEntry) {
    unlockAudio()
    if (!sessionRunning) {
      startSession(p.workout_id, p.title ?? p.workout_title ?? t('journal.free_session', { ns: 'workouts' }), p.id)
    }
    navigate(`${basePath}/session`)
  }

  return (
    <section className="wb-home-sec">
      <div className="wb-sec"><h2>{t('home.today_plans')}</h2></div>
      <div className="wb-grid">
        {plans.map((p) => (
          <div key={p.id} className="wb-card wb-card--accent wb-plan">
            <div className="wb-plan-main">
              <strong>{p.title ?? p.workout_title ?? t('journal.free_session', { ns: 'workouts' })}</strong>
              {(p.class_name || p.notes) && <span>{[p.class_name, p.notes].filter(Boolean).join(' · ')}</span>}
            </div>
            <button type="button" className="wb-btn wb-btn--primary" onClick={() => start(p)}>
              ▶ {t('journal.plan_start', { ns: 'workouts' })}
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
