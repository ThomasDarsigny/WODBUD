import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useSessionStore } from '../../stores/sessionStore'
import { activeMs, formatClock, isRunning, wallClockMs } from '../../lib/sessionTimer'
import { countdownSecond, hasFormatClock, workoutClock, type ClockState } from '../../lib/workoutClock'
import { holdScreenAwake, playCue, readSoundPref, unlockAudio, writeSoundPref } from '../../lib/gymCues'
import { METHOD_I18N_KEYS } from '../../types'

/**
 * Horloge vivante de la séance : rafraîchit l'affichage, déclenche les bips
 * et la vibration aux changements de segment, garde l'écran allumé.
 *
 * Un seul composant monte ce hook (RunnerPanel) : sinon les signaux
 * sonneraient en double.
 */
export function useGymClock() {
  const timer = useSessionStore((s) => s.timer)
  const format = useSessionStore((s) => s.format)
  const running = isRunning(timer)
  const [now, setNow] = useState(() => Date.now())
  const [sound, setSoundState] = useState(readSoundPref)
  const withFormat = hasFormatClock(format)

  // Le tick ne sert qu'à réafficher : la valeur vient toujours d'un écart
  // d'horodatage. Plus fin avec un format, pour que le « 3-2-1 » tombe juste.
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setNow(Date.now()), withFormat ? 250 : 1000)
    return () => window.clearInterval(id)
  }, [running, withFormat])

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

  useEffect(() => (running ? holdScreenAwake() : undefined), [running])

  const active = activeMs(timer, now)
  const clock = workoutClock(withFormat ? format : null, active)

  // Les signaux partent d'un changement observé, jamais du premier rendu :
  // recharger la page en plein Tabata ne doit pas faire biper.
  const last = useRef<{ key: string; second: number | null } | null>(null)
  useEffect(() => {
    const second = countdownSecond(clock.segmentRemainingMs)
    const prev = last.current
    last.current = { key: clock.segmentKey, second }
    if (!prev || !running || !withFormat) return
    if (prev.key !== clock.segmentKey) {
      playCue(clock.phase, sound)
    } else if (second !== prev.second && second !== null && second <= 3 && second >= 1) {
      playCue('tick', sound)
    }
  }, [clock.segmentKey, clock.segmentRemainingMs, clock.phase, running, withFormat, sound])

  const setSound = (on: boolean) => {
    if (on) unlockAudio()
    writeSoundPref(on)
    setSoundState(on)
  }

  return { clock, active, wall: wallClockMs(timer, now), running, withFormat, sound, setSound }
}

/** Ce qu'on lit en gros : un compte à rebours s'arrondit vers le haut. */
export function clockText(clock: ClockState): string {
  const ms = clock.direction === 'down' ? (countdownSecond(clock.displayMs) ?? 0) * 1000 : clock.displayMs
  return formatClock(ms)
}

export function useClockLabels(clock: ClockState) {
  const { t } = useTranslation(['workouts', 'common'])
  const phase = t(`session.phase_${clock.phase}`)
  const round = clock.round === null
    ? null
    : clock.totalRounds === null
      ? t('session.round_open', { round: clock.round })
      : t('session.round', { round: clock.round, total: clock.totalRounds })
  return { phase, round }
}

interface OverlayProps {
  gym: ReturnType<typeof useGymClock>
  title: string
  onClose: () => void
  onToggle: () => void
}

/**
 * Mode salle : le chrono en plein écran, lisible à trois mètres. La couleur
 * de fond dit la phase avant même qu'on lise un chiffre.
 */
export function GymOverlay({ gym, title, onClose, onToggle }: OverlayProps) {
  const { t } = useTranslation(['workouts', 'common'])
  const format = useSessionStore((s) => s.format)
  const { clock, running, withFormat, sound, setSound } = gym
  const labels = useClockLabels(clock)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const root = document.documentElement
    // Le plein écran est un bonus : Safari iPhone le refuse hors vidéo.
    if (root.requestFullscreen && !document.fullscreenElement) {
      root.requestFullscreen({ navigationUI: 'hide' }).catch(() => {})
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    }
  }, [onClose])

  const phase = running ? clock.phase : 'paused'

  // Hors de la mise en page : un parent qui défile ou se transforme ne doit
  // pas pouvoir rogner le plein écran.
  return createPortal(
    <div className="wb-gym" data-phase={phase} role="dialog" aria-modal="true" aria-label={t('session.gym_mode')}>
      <div className="wb-gym-top">
        <div className="wb-gym-title">
          <span>{title}</span>
          {withFormat && format && (
            <small>
              {t(METHOD_I18N_KEYS[format.method], { ns: 'common' })}
              {format.durationMinutes ? ` ${format.durationMinutes}′` : ''}
            </small>
          )}
        </div>
        <button
          type="button"
          className="wb-gym-icon"
          onClick={() => setSound(!sound)}
          aria-pressed={sound}
          aria-label={sound ? t('session.sound_on') : t('session.sound_off')}
        >
          {sound ? '🔊' : '🔇'}
        </button>
        <button ref={closeRef} type="button" className="wb-gym-icon" onClick={onClose} aria-label={t('session.gym_exit')}>
          ✕
        </button>
      </div>

      <div className="wb-gym-center" aria-live="off">
        <p className="wb-gym-phase">{running ? labels.phase : t('session.paused')}</p>
        <p className="wb-gym-clock">{clockText(clock)}</p>
        {labels.round && <p className="wb-gym-round">{labels.round}</p>}
        {withFormat && (
          <div className="wb-gym-bar" aria-hidden="true">
            <span style={{ transform: `scaleX(${clock.progress})` }} />
          </div>
        )}
        {withFormat && (
          <p className="wb-gym-active">{t('session.active_time')} {formatClock(gym.active)}</p>
        )}
      </div>

      <button
        type="button"
        className="wb-gym-main"
        onClick={() => { unlockAudio(); onToggle() }}
      >
        {running ? `❚❚ ${t('session.pause')}` : `▶ ${t('session.resume')}`}
      </button>
    </div>,
    document.body
  )
}
