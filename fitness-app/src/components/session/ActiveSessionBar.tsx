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
    <Link
      to={sessionPath}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0,
        background: 'rgba(255,77,0,0.12)', borderBottom: '1px solid rgba(255,77,0,0.3)',
        padding: '0.5rem 1.5rem', textDecoration: 'none',
        fontFamily: 'var(--font-d)', fontSize: '0.78rem', letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--orange)'
      }}
    >
      <span>{running ? '●' : '❚❚'}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatClock(activeMs(timer, now))}</span>
      <span style={{ color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {workoutName || t('session.in_progress')}
      </span>
      <span style={{ marginLeft: 'auto', flexShrink: 0 }}>
        {running ? t('session.running') : t('session.paused')} ›
      </span>
    </Link>
  )
}
