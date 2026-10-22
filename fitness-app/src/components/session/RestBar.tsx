import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSessionStore } from '../../stores/sessionStore'
import { formatClock } from '../../lib/sessionTimer'
import { playCue, readSoundPref } from '../../lib/gymCues'

/**
 * Repos entre deux séries : un compte à rebours collé au-dessus de la barre
 * d'onglets, réglable de 15 s en 15 s. Bip au 3-2-1 et à la fin, puis il
 * disparaît : la série suivante commence.
 */
export default function RestBar() {
  const { t } = useTranslation(['workouts', 'common'])
  const rest = useSessionStore((s) => s.rest)
  const items = useSessionStore((s) => s.items)
  const { adjustRest, skipRest } = useSessionStore()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!rest) return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [rest])

  const left = rest ? Math.max(0, rest.endsAt - now) : 0
  const second = Math.ceil(left / 1000)

  // Signaux sur un changement observé, jamais au premier rendu.
  const last = useRef<number | null>(null)
  useEffect(() => {
    if (!rest) { last.current = null; return }
    const prev = last.current
    last.current = second
    if (prev === null || prev === second) return
    const sound = readSoundPref()
    if (second === 0) {
      playCue('work', sound)
      skipRest()
    } else if (second <= 3) {
      playCue('tick', sound)
    }
  }, [second, rest, skipRest])

  if (!rest) return null
  const item = items.find((i) => i.id === rest.itemId)
  const progress = 1 - left / rest.totalMs

  return (
    <>
    {/* Réserve la place de la barre : la fin de la page reste atteignable. */}
    <div style={{ height: 96 }} aria-hidden="true" />
    <div className="wb-rest wb-above-tabbar" role="timer" aria-live="off" aria-label={t('session.rest_label')}>
      <div className="wb-rest-bar" aria-hidden="true"><span style={{ transform: `scaleX(${Math.min(1, Math.max(0, progress))})` }} /></div>
      <div className="wb-rest-body">
        <div className="wb-rest-text">
          <span>{t('session.rest')}{item ? ` · ${item.name}` : ''}</span>
          <strong>{formatClock(second * 1000)}</strong>
        </div>
        <button type="button" onClick={() => adjustRest(-15)} aria-label={t('session.rest_minus')}>−15</button>
        <button type="button" onClick={() => adjustRest(15)} aria-label={t('session.rest_plus')}>+15</button>
        <button type="button" className="wb-rest-skip" onClick={skipRest}>{t('session.rest_skip')}</button>
      </div>
    </div>
    </>
  )
}
