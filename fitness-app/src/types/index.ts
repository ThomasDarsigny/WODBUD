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

export const MUSCLE_GROUP_I18N_KEYS: Record<MuscleGroup, string> = {
  chest: 'labels.muscles.chest',
  back: 'labels.muscles.back',
  shoulders: 'labels.muscles.shoulders',
  biceps: 'labels.muscles.biceps',
  triceps: 'labels.muscles.triceps',
  forearms: 'labels.muscles.forearms',
  core: 'labels.muscles.core',
  glutes: 'labels.muscles.glutes',
  quads: 'labels.muscles.quads',
  hamstrings: 'labels.muscles.hamstrings',
  calves: 'labels.muscles.calves',
  cardio_upper: 'labels.muscles.cardio_upper',
  cardio_lower: 'labels.muscles.cardio_lower'
}

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

export const CATEGORY_I18N_KEYS: Record<ExerciseCategory, string> = {
  strength: 'labels.categories.strength',
  olympic: 'labels.categories.olympic',
  gymnastics: 'labels.categories.gymnastics',
  cardio: 'labels.categories.cardio',
  mobility: 'labels.categories.mobility',
  accessory: 'labels.categories.accessory'
}

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

export const METHOD_I18N_KEYS: Record<WorkoutMethod, string> = {
  amrap: 'labels.methods.amrap',
  emom: 'labels.methods.emom',
  for_time: 'labels.methods.for_time',
  rounds: 'labels.methods.rounds',
  strength: 'labels.methods.strength',
  tabata: 'labels.methods.tabata',
  custom: 'labels.methods.custom'
}

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
  reps?: number
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

// ─── Classes ──────────────────────────────────────────────────────────────────
export interface Class {
  id: string
  name: string
  description: string | null
  schedule: string | null
  coach_id: string
  invite_token: string
  created_at: string
}

export type ClassInsert = Pick<Class, 'name' | 'description' | 'schedule'>

export interface ClassMember {
  class_id: string
  athlete_id: string
  joined_at: string
  profile?: { full_name: string | null }
}

// ─── Vote Sessions ────────────────────────────────────────────────────────────
export type VoteSessionStatus = 'open' | 'closed'

export interface VoteSession {
  id: string
  class_id: string
  coach_id: string
  title: string
  exercise_options: string[]
  status: VoteSessionStatus
  deadline: string | null
  created_at: string
}

export type VoteSessionInsert = Pick<VoteSession, 'class_id' | 'title' | 'exercise_options' | 'deadline'>