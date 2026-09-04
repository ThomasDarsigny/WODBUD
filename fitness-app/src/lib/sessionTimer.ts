/**
 * Chronomètre de séance — logique pure, sans React et sans horloge interne.
 *
 * Le temps actif est reconstruit à partir d'écarts d'horodatage epoch plutôt
 * que d'un compteur incrémenté par setInterval. C'est volontaire : dans un gym
 * l'écran se verrouille, l'onglet passe en arrière-plan et le navigateur
 * étrangle les timers. Un compteur dériverait; des écarts d'horodatage, non.
 *
 * Le temps déjà écoulé est « banqué » dans accumulatedMs à chaque pause, et le
 * segment en cours est mesuré depuis runningSince. Le total est donc toujours
 * exact, même après une mise en veille de trois heures.
 */

export interface SessionTimer {
  /** Début réel de la séance, ISO. null = pas encore démarrée. */
  startedAt: string | null
  /** Temps actif déjà banqué, pauses exclues (ms). */
  accumulatedMs: number
  /** Epoch ms du début du segment courant. null = en pause. */
  runningSince: number | null
}

export const EMPTY_TIMER: SessionTimer = {
  startedAt: null,
  accumulatedMs: 0,
  runningSince: null
}

export function startTimer(now: number = Date.now()): SessionTimer {
  return {
    startedAt: new Date(now).toISOString(),
    accumulatedMs: 0,
    runningSince: now
  }
}

export function isRunning(timer: SessionTimer): boolean {
  return timer.runningSince !== null
}

export function hasStarted(timer: SessionTimer): boolean {
  return timer.startedAt !== null
}

/** Temps actif total en ms, segment en cours inclus. */
export function activeMs(timer: SessionTimer, now: number = Date.now()): number {
  if (timer.runningSince === null) return timer.accumulatedMs
  // Une horloge système reculée ne doit jamais retrancher du temps déjà acquis.
  return timer.accumulatedMs + Math.max(0, now - timer.runningSince)
}

export function pauseTimer(timer: SessionTimer, now: number = Date.now()): SessionTimer {
  if (timer.runningSince === null) return timer
  return {
    ...timer,
    accumulatedMs: activeMs(timer, now),
    runningSince: null
  }
}

export function resumeTimer(timer: SessionTimer, now: number = Date.now()): SessionTimer {
  if (timer.runningSince !== null) return timer
  return { ...timer, runningSince: now }
}

/** Temps écoulé au mur (pauses incluses), pour duration_minutes. */
export function wallClockMs(timer: SessionTimer, now: number = Date.now()): number {
  if (timer.startedAt === null) return 0
  return Math.max(0, now - Date.parse(timer.startedAt))
}

/**
 * Conversion vers la colonne active_minutes (entier).
 *
 * Arrondi et non troncature : tronquer perdrait jusqu'à 59 secondes par séance,
 * ce qui fausse le cumul des rangs sur des centaines de séances. En contrepartie
 * une séance de moins de 30 secondes vaut 0 minute et ne compte pas dans la
 * série — c'est le comportement voulu, un échauffement avorté n'est pas un jour
 * d'entraînement.
 */
export function toActiveMinutes(ms: number): number {
  return Math.round(ms / 60000)
}

/** H:MM:SS au-delà d'une heure, MM:SS sinon. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}
