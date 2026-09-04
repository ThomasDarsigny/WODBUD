// ─── Muscle Groups ────────────────────────────────────────────────────────────
export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'traps'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'core'
  | 'obliques'
  | 'lower_back'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'adductors'
  | 'calves'
  | 'tibialis'
  | 'cardio_upper'
  | 'cardio_lower'

export const MUSCLE_GROUP_I18N_KEYS: Record<MuscleGroup, string> = {
  chest: 'labels.muscles.chest',
  back: 'labels.muscles.back',
  traps: 'labels.muscles.traps',
  shoulders: 'labels.muscles.shoulders',
  biceps: 'labels.muscles.biceps',
  triceps: 'labels.muscles.triceps',
  forearms: 'labels.muscles.forearms',
  core: 'labels.muscles.core',
  obliques: 'labels.muscles.obliques',
  lower_back: 'labels.muscles.lower_back',
  glutes: 'labels.muscles.glutes',
  quads: 'labels.muscles.quads',
  hamstrings: 'labels.muscles.hamstrings',
  adductors: 'labels.muscles.adductors',
  calves: 'labels.muscles.calves',
  tibialis: 'labels.muscles.tibialis',
  cardio_upper: 'labels.muscles.cardio_upper',
  cardio_lower: 'labels.muscles.cardio_lower'
}

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Pectoraux',
  back: 'Dos',
  traps: 'Trapezes',
  shoulders: 'Epaules',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Avant-bras',
  core: 'Abdominaux',
  obliques: 'Obliques',
  lower_back: 'Lombaires',
  glutes: 'Fessiers',
  quads: 'Quadriceps',
  hamstrings: 'Ischio-jambiers',
  adductors: 'Adducteurs',
  calves: 'Mollets',
  tibialis: 'Jambier anterieur',
  cardio_upper: 'Cardio - Haut du corps',
  cardio_lower: 'Cardio - Bas du corps'
}

export const CARDIO_MUSCLES: MuscleGroup[] = ['cardio_upper', 'cardio_lower']
export const CORE_MUSCLES: MuscleGroup[] = ['core', 'obliques', 'lower_back']
export const UPPER_MUSCLES: MuscleGroup[] = [
  'chest',
  'back',
  'traps',
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
  'adductors',
  'calves',
  'tibialis',
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
  body_region: BodyRegion
  movement_type: MovementType | null
  secondary_movements: MovementType[]
  methods: TrainingMethod[]
  primary_muscle: MuscleGroup
  secondary_muscles: MuscleGroup[]
  tertiary_muscles: MuscleGroup[]
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
  created_by?: string | null
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

// ─── Vote Options & Results ───────────────────────────────────────────────────
// Une option de vote est une ligne de `vote_options`. Sa couleur est dérivée de
// sa position par un trigger en base : le client ne l'envoie jamais, il la lit.
export interface VoteOption {
  id: string
  vote_session_id: string
  exercise_id: string | null
  label: string | null
  color: string
  position: number
}

// Reflet exact de la vue `vote_results` : libellé, couleur, décompte,
// pourcentage et « en tête » sortent d'une seule requête, déjà agrégés.
// `percentage` arrive en chaîne — PostgREST sérialise les `numeric` ainsi.
export interface VoteResult {
  vote_session_id: string
  vote_option_id: string
  position: number
  label: string
  color: string
  exercise_id: string | null
  votes: number
  percentage: number
  is_leading: boolean
}
// ─── Body Regions ─────────────────────────────────────────────────────────────
// 'core' est une vraie région, pas un sous-ensemble de 'full'. Sans elle,
// tout le travail de gainage était classé « corps complet » et disparaissait
// des filtres.
export type BodyRegion = 'upper' | 'lower' | 'core' | 'full'

export const BODY_REGIONS: BodyRegion[] = ['upper', 'lower', 'core', 'full']

export const BODY_REGION_I18N_KEYS: Record<BodyRegion, string> = {
  upper: 'labels.zones.upper',
  lower: 'labels.zones.lower',
  core: 'labels.zones.core',
  full: 'labels.zones.full'
}

// ─── Movement Types ───────────────────────────────────────────────────────────
// Classement par patron de mouvement demandé par le client.
export type MovementType = 'pull' | 'push' | 'stabilize' | 'carry' | 'climb'

export const MOVEMENT_TYPES: MovementType[] = ['pull', 'push', 'stabilize', 'carry', 'climb']

export const MOVEMENT_TYPE_I18N_KEYS: Record<MovementType, string> = {
  pull: 'labels.movements.pull',
  push: 'labels.movements.push',
  stabilize: 'labels.movements.stabilize',
  carry: 'labels.movements.carry',
  climb: 'labels.movements.climb'
}

export const MOVEMENT_TYPE_DESC_I18N_KEYS: Record<MovementType, string> = {
  pull: 'labels.movements_desc.pull',
  push: 'labels.movements_desc.push',
  stabilize: 'labels.movements_desc.stabilize',
  carry: 'labels.movements_desc.carry',
  climb: 'labels.movements_desc.climb'
}

export const MOVEMENT_TYPE_COLORS: Record<MovementType, string> = {
  pull: '#38bdf8',
  push: '#ff4d00',
  stabilize: '#a78bfa',
  carry: '#facc15',
  climb: '#34d399'
}

// ─── Training Methods (équipement) ────────────────────────────────────────────
// Attention : `labels.methods` est déjà pris par les formats de WOD
// (AMRAP, EMOM, For Time). L'équipement vit sous `labels.training_methods`.
export type TrainingMethod =
  | 'bodyweight'
  | 'barbell'
  | 'dumbbell'
  | 'kettlebell'
  | 'suspension_trx'
  | 'resistance_band'
  | 'parallel_bar'
  | 'sandbag'
  | 'wall_ball'
  | 'slam_ball'

export const TRAINING_METHODS: TrainingMethod[] = [
  'bodyweight',
  'barbell',
  'dumbbell',
  'kettlebell',
  'suspension_trx',
  'resistance_band',
  'parallel_bar',
  'sandbag',
  'wall_ball',
  'slam_ball'
]

export const TRAINING_METHOD_I18N_KEYS: Record<TrainingMethod, string> = {
  bodyweight: 'labels.training_methods.bodyweight',
  barbell: 'labels.training_methods.barbell',
  dumbbell: 'labels.training_methods.dumbbell',
  kettlebell: 'labels.training_methods.kettlebell',
  suspension_trx: 'labels.training_methods.suspension_trx',
  resistance_band: 'labels.training_methods.resistance_band',
  parallel_bar: 'labels.training_methods.parallel_bar',
  sandbag: 'labels.training_methods.sandbag',
  wall_ball: 'labels.training_methods.wall_ball',
  slam_ball: 'labels.training_methods.slam_ball'
}

export const TRAINING_METHOD_SHORT: Record<TrainingMethod, string> = {
  bodyweight: 'BW',
  barbell: 'BB',
  dumbbell: 'DB',
  kettlebell: 'KB',
  suspension_trx: 'TRX',
  resistance_band: 'EL',
  parallel_bar: 'PB',
  sandbag: 'SB',
  wall_ball: 'WB',
  slam_ball: 'SL'
}

// ─── Charge musculaire (mannequin 2D) ─────────────────────────────────────────
// Cinq états, pas trois. Sans 'unused', un muscle non travaillé serait vert
// par défaut et le mannequin mentirait. Sans 'under', impossible de distinguer
// « bien dosé » de « à peine effleuré ».
export type LoadLevel = 'unused' | 'under' | 'optimal' | 'high' | 'overload'

export const LOAD_LEVELS: LoadLevel[] = ['unused', 'under', 'optimal', 'high', 'overload']

export const LOAD_LEVEL_I18N_KEYS: Record<LoadLevel, string> = {
  unused: 'labels.load.unused',
  under: 'labels.load.under',
  optimal: 'labels.load.optimal',
  high: 'labels.load.high',
  overload: 'labels.load.overload'
}

export interface MuscleLoad {
  muscle: MuscleGroup
  ratio: number
  level: LoadLevel
  sets: number
  exerciseNames: string[]
}

// ─── Rangs ────────────────────────────────────────────────────────────────────
export interface Rank {
  position: number
  key: string
  display_fr: string
  display_en: string
  display_es: string
  min_minutes: number
  color: string
  motto_fr: string | null
}

// ─── Préférences ──────────────────────────────────────────────────────────────
export type ThemePref = 'clair' | 'sombre' | 'auto'
export type UserSegment = 'individu' | 'gym'
