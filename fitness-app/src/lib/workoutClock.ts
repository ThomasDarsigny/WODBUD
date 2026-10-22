import type { WorkoutMethod } from '../types'

/**
 * Horloge du format de WOD — logique pure, dérivée du temps actif.
 *
 * Le chrono de séance (sessionTimer) mesure le temps actif; ce module le
 * traduit en ce qu'on lit sur le mur d'une box : le compte à rebours d'un
 * AMRAP, la minute en cours d'un EMOM, l'alternance 20/10 d'un Tabata. Rien
 * n'est compté à part : une pause fige donc aussi l'intervalle, et un écran
 * verrouillé ne décale rien au retour.
 */

export interface WorkoutFormat {
  method: WorkoutMethod
  /** null = pas de durée prévue : on compte simplement vers le haut. */
  durationMinutes: number | null
}

export type ClockPhase = 'work' | 'rest' | 'done'

export interface ClockState {
  /** 'down' = compte à rebours, 'up' = chrono qui monte. */
  direction: 'up' | 'down'
  phase: ClockPhase
  /** Ce qu'on affiche en gros. */
  displayMs: number
  /** Tour courant, à partir de 1. null quand le format n'a pas de tours. */
  round: number | null
  totalRounds: number | null
  /** Temps restant dans le segment courant, pour les bips 3-2-1. */
  segmentRemainingMs: number | null
  /** Change à chaque nouveau segment : c'est le déclencheur des signaux. */
  segmentKey: string
  /** Avancement du segment courant, entre 0 et 1. */
  progress: number
}

const MINUTE = 60_000
const TABATA_WORK = 20_000
const TABATA_REST = 10_000

function plain(ms: number): ClockState {
  return { direction: 'up', phase: 'work', displayMs: ms, round: null, totalRounds: null, segmentRemainingMs: null, segmentKey: 'work', progress: 0 }
}

function done(displayMs: number, totalRounds: number | null): ClockState {
  return { direction: 'down', phase: 'done', displayMs, round: totalRounds, totalRounds, segmentRemainingMs: null, segmentKey: 'done', progress: 1 }
}

export function workoutClock(format: WorkoutFormat | null, ms: number): ClockState {
  const t = Math.max(0, ms)
  if (!format) return plain(t)
  const total = format.durationMinutes && format.durationMinutes > 0 ? format.durationMinutes * MINUTE : null

  switch (format.method) {
    case 'amrap': {
      if (total === null) return plain(t)
      if (t >= total) return done(0, null)
      return { direction: 'down', phase: 'work', displayMs: total - t, round: null, totalRounds: null, segmentRemainingMs: total - t, segmentKey: 'work', progress: t / total }
    }

    case 'for_time': {
      // Le cap est une limite, pas un compte à rebours : on affiche le temps
      // réalisé, c'est lui qu'on note au tableau.
      if (total === null) return plain(t)
      if (t >= total) return { ...done(total, null), direction: 'up' }
      return { direction: 'up', phase: 'work', displayMs: t, round: null, totalRounds: null, segmentRemainingMs: total - t, segmentKey: 'work', progress: t / total }
    }

    case 'emom': {
      const rounds = total === null ? null : format.durationMinutes!
      if (rounds !== null && t >= total!) return done(0, rounds)
      const index = Math.floor(t / MINUTE)
      const inMinute = t - index * MINUTE
      return { direction: 'down', phase: 'work', displayMs: MINUTE - inMinute, round: index + 1, totalRounds: rounds, segmentRemainingMs: MINUTE - inMinute, segmentKey: `work-${index}`, progress: inMinute / MINUTE }
    }

    case 'tabata': {
      // 8 tours de 20 s / 10 s par défaut (4 min); une durée prévue en
      // demande deux par minute.
      const rounds = total === null ? 8 : format.durationMinutes! * 2
      const cycle = TABATA_WORK + TABATA_REST
      if (t >= rounds * cycle) return done(0, rounds)
      const index = Math.floor(t / cycle)
      const inCycle = t - index * cycle
      const working = inCycle < TABATA_WORK
      const left = working ? TABATA_WORK - inCycle : cycle - inCycle
      return {
        direction: 'down',
        phase: working ? 'work' : 'rest',
        displayMs: left,
        round: index + 1,
        totalRounds: rounds,
        segmentRemainingMs: left,
        segmentKey: `${working ? 'work' : 'rest'}-${index}`,
        progress: working ? inCycle / TABATA_WORK : (inCycle - TABATA_WORK) / TABATA_REST
      }
    }

    default:
      return plain(t)
  }
}

/** Secondes entières restantes, arrondies vers le haut : « 3 » dure toute la 3e seconde. */
export function countdownSecond(ms: number | null): number | null {
  return ms === null ? null : Math.ceil(ms / 1000)
}

/** Le format a-t-il quelque chose de plus à montrer qu'un chrono simple? */
export function hasFormatClock(format: WorkoutFormat | null): boolean {
  if (!format) return false
  if (format.method === 'tabata' || format.method === 'emom') return true
  return (format.method === 'amrap' || format.method === 'for_time') && Boolean(format.durationMinutes)
}
