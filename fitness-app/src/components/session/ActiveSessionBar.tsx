import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSessionStore } from '../../stores/sessionStore'
import { activeMs, formatClock, isRunning } from '../../lib/sessionTimer'

/**
 * Bandeau persistant : tant qu'une séance tourne, le chrono reste visible
 * depuis n'importe quel écran. Sans ça, on quitte la page de séance pour
 * consulter un exercice et on oublie que le chrono tourne encore.
 */
export default function ActiveSessionBar({ basePath }: { basePath: string }) {
  const { t } = useTranslation(['workouts', 'common'])
  const location = useLocation()
  const timer = useSessionStore((s) => s.timer)
  const workoutName = useSessionStore((s) => s.workoutName)
  const [now, setNow] = useState(() => Date.now())

  const started = timer.startedAt !== null
  const running = isRunning(timer)

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [running])

  const sessionPath = `${basePath}/session`
  if (!started || location.pathname === sessionPath) return null

  return (
    <Link to={sessionPath} className="wb-active-bar">
      <span aria-hidden="true">{running ? '●' : '❚❚'}</span>
      <span className="wb-active-bar-clock">{formatClock(activeMs(timer, now))}</span>
      <span className="wb-active-bar-name">{workoutName || t('session.in_progress')}</span>
      <span className="wb-active-bar-state">
        {running ? t('session.running') : t('session.paused')} ›
      </span>
    </Link>
  )
}
