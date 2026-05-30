import type {
  WorkoutExercise,
  MuscleGroup,
  MuscleAlert,
  AlertLevel,
  RestAlert
} from '../types'

// ─── Within-workout muscle overlap alerts ─────────────────────────────────────

/**
 * Counts primary + secondary muscle occurrences across all workout exercises
 * and returns alert levels:
 *  - danger  (red)    : primary muscle appears 2+ times
 *  - warning (yellow) : secondary muscle appears 2+ times
 */
export function computeMuscleAlerts(exercises: WorkoutExercise[]): MuscleAlert[] {
  const primaryCount = new Map<MuscleGroup, string[]>()
  const secondaryCount = new Map<MuscleGroup, string[]>()

  for (const we of exercises) {
    const name = we.exercise.name
    const pm = we.exercise.primary_muscle

    if (!primaryCount.has(pm)) primaryCount.set(pm, [])
    primaryCount.get(pm)?.push(name)

    for (const sm of we.exercise.secondary_muscles) {
      if (!secondaryCount.has(sm)) secondaryCount.set(sm, [])
      secondaryCount.get(sm)?.push(name)
    }
  }

  const alerts: MuscleAlert[] = []
  const processed = new Set<MuscleGroup>()

  // Primary duplicates -> danger
  for (const [muscle, names] of primaryCount.entries()) {
    if (names.length >= 2) {
      alerts.push({ muscle, level: 'danger', count: names.length, exerciseNames: names })
      processed.add(muscle)
    }
  }

  // Secondary duplicates -> warning (skip if already danger)
  for (const [muscle, names] of secondaryCount.entries()) {
    if (!processed.has(muscle) && names.length >= 2) {
      alerts.push({ muscle, level: 'warning', count: names.length, exerciseNames: names })
    }
  }

  // Cardio upper/lower logic: if both cardio_upper and cardio_lower are present -> warning
  const hasCardioUpper = exercises.some(
    (e) =>
      e.exercise.primary_muscle === 'cardio_upper' ||
      e.exercise.secondary_muscles.includes('cardio_upper')
  )
  const hasCardioLower = exercises.some(
    (e) =>
      e.exercise.primary_muscle === 'cardio_lower' ||
      e.exercise.secondary_muscles.includes('cardio_lower')
  )
  if (hasCardioUpper && hasCardioLower) {
    const existingCardioUpper = alerts.find((a) => a.muscle === 'cardio_upper')
    if (!existingCardioUpper) {
      alerts.push({
        muscle: 'cardio_upper',
        level: 'warning',
        count: 2,
        exerciseNames: ['Cardio haut + bas du corps combines']
      })
    }
  }

  return alerts
}

/**
 * Get alert level for a specific muscle (used to highlight exercise cards).
 */
export function getMuscleAlertLevel(muscle: MuscleGroup, alerts: MuscleAlert[]): AlertLevel {
  return alerts.find((a) => a.muscle === muscle)?.level ?? 'none'
}

// ─── 48h rest rule (between sessions) ────────────────────────────────────────

/**
 * Given a list of past workouts (with dates) and the muscles in the current draft,
 * returns which muscles haven't had 48h rest yet.
 */
export function compute48hAlerts(
  currentMuscles: MuscleGroup[],
  pastWorkouts: Array<{ date: string; muscles: MuscleGroup[] }>
): RestAlert[] {
  const now = Date.now()
  const MS_48H = 48 * 60 * 60 * 1000

  const alerts: RestAlert[] = []

  for (const muscle of currentMuscles) {
    const relevant = pastWorkouts
      .filter((w) => w.muscles.includes(muscle))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    if (relevant.length === 0) continue

    const lastDate = new Date(relevant[0].date).getTime()
    const elapsed = now - lastDate
    const remaining = MS_48H - elapsed

    if (remaining > 0) {
      alerts.push({
        muscle,
        lastWorkoutDate: relevant[0].date,
        hoursRemaining: Math.ceil(remaining / (60 * 60 * 1000))
      })
    }
  }

  return alerts
}

/**
 * Extract all muscles (primary + secondary) from a list of WorkoutExercises.
 */
export function extractMuscles(exercises: WorkoutExercise[]): MuscleGroup[] {
  const set = new Set<MuscleGroup>()
  for (const we of exercises) {
    set.add(we.exercise.primary_muscle)
    for (const sm of we.exercise.secondary_muscles) set.add(sm)
  }
  return Array.from(set)
}