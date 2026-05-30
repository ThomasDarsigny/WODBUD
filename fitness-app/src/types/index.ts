// ─── Muscle Groups ────────────────────────────────────────────────────────────
export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'core'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'calves'
  | 'cardio_upper'
  | 'cardio_lower'

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Pectoraux',
  back: 'Dos',
  shoulders: 'Epaules',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Avant-bras',
  core: 'Abdominaux / Core',
  glutes: 'Fessiers',
  quads: 'Quadriceps',
  hamstrings: 'Ischio-jambiers',
  calves: 'Mollets',
  cardio_upper: 'Cardio - Haut du corps',
  cardio_lower: 'Cardio - Bas du corps'
}

export const CARDIO_MUSCLES: MuscleGroup[] = ['cardio_upper', 'cardio_lower']
export const UPPER_MUSCLES: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'cardio_upper'
]
export const LOWER_MUSCLES: MuscleGroup[] = [
  'glutes',
  'quads',
  'hamstrings',
  'calves',
  'cardio_lower'
]

// ─── Exercise Categories ──────────────────────────────────────────────────────
export type ExerciseCategory =
  | 'strength'
  | 'olympic'
  | 'gymnastics'
  | 'cardio'
  | 'mobility'
  | 'accessory'

export const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  strength: 'Force',
  olympic: 'Halterophilie',
  gymnastics: 'Gymnastics',
  cardio: 'Cardio',
  mobility: 'Mobilite',
  accessory: 'Accessoire'
}

// ─── Exercise ─────────────────────────────────────────────────────────────────
export interface Exercise {
  id: string
  name: string
  description: string
  category: ExerciseCategory
  primary_muscle: MuscleGroup
  secondary_muscles: MuscleGroup[]
  video_url: string | null
  video_path?: string | null
  created_at: string
  updated_at: string
}

export type ExerciseInsert = Omit<Exercise, 'id' | 'created_at' | 'updated_at'>
export type ExerciseUpdate = Partial<ExerciseInsert>

// ─── Workout ──────────────────────────────────────────────────────────────────
export type WorkoutMethod =
  | 'amrap'
  | 'emom'
  | 'for_time'
  | 'rounds'
  | 'strength'
  | 'tabata'
  | 'custom'

export const METHOD_LABELS: Record<WorkoutMethod, string> = {
  amrap: 'AMRAP',
  emom: 'EMOM',
  for_time: 'For Time',
  rounds: 'Rounds',
  strength: 'Force / Charge',
  tabata: 'Tabata',
  custom: 'Personnalise'
}

export interface WorkoutExercise {
  id: string
  exercise: Exercise
  position: number
  sets?: number
  reps?: string
  weight?: string
  rest_seconds?: number
  notes?: string
}

export interface Workout {
  id: string
  name: string
  method: WorkoutMethod
  duration_minutes?: number
  notes?: string
  exercises: WorkoutExercise[]
  created_at: string
}

export type WorkoutInsert = Omit<Workout, 'id' | 'created_at'>

// ─── Muscle Alert ─────────────────────────────────────────────────────────────
export type AlertLevel = 'none' | 'warning' | 'danger'

export interface MuscleAlert {
  muscle: MuscleGroup
  level: AlertLevel
  count: number
  exerciseNames: string[]
}

// ─── 48h Rule ─────────────────────────────────────────────────────────────────
export interface RestAlert {
  muscle: MuscleGroup
  lastWorkoutDate: string
  hoursRemaining: number
}