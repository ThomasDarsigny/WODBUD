import type { Exercise, MuscleGroup, WorkoutExercise } from '../../types'

/**
 * Mouvements de la démo du mannequin sur la landing.
 *
 * Copie figée des muscles tels qu'ils sont dans la bibliothèque (tables
 * exercise_muscles / muscle_groups) : la landing est publique et ne lit pas
 * la base. Si la bibliothèque change, ajuster ici.
 */
interface DemoMove {
  key: string
  name: { fr: string; en: string; es: string }
  primary: MuscleGroup
  secondary: MuscleGroup[]
  tertiary: MuscleGroup[]
}

export const DEMO_MOVES: DemoMove[] = [
  { key: 'thruster', name: { fr: 'Thruster', en: 'Thruster', es: 'Thruster' }, primary: 'quads', secondary: ['adductors', 'glutes', 'shoulders', 'triceps'], tertiary: ['core'] },
  { key: 'pullup', name: { fr: 'Traction', en: 'Pull-up', es: 'Dominada' }, primary: 'back', secondary: ['biceps'], tertiary: ['core', 'forearms', 'traps'] },
  { key: 'burpee', name: { fr: 'Burpee', en: 'Burpee', es: 'Burpee' }, primary: 'quads', secondary: ['cardio_lower', 'chest', 'shoulders'], tertiary: ['core', 'adductors', 'tibialis', 'triceps'] },
  { key: 'kbswing', name: { fr: 'Kettlebell swing', en: 'Kettlebell swing', es: 'Kettlebell swing' }, primary: 'glutes', secondary: ['hamstrings', 'lower_back'], tertiary: ['adductors', 'forearms', 'shoulders', 'traps'] },
  { key: 'wallball', name: { fr: 'Wall ball', en: 'Wall ball', es: 'Wall ball' }, primary: 'quads', secondary: ['adductors', 'glutes', 'shoulders'], tertiary: ['core', 'tibialis', 'triceps'] },
  { key: 'boxjump', name: { fr: 'Box jump', en: 'Box jump', es: 'Box jump' }, primary: 'quads', secondary: ['calves', 'glutes', 'tibialis'], tertiary: ['adductors', 'hamstrings'] },
  { key: 'pushup', name: { fr: 'Pompe', en: 'Push-up', es: 'Flexión' }, primary: 'chest', secondary: ['shoulders', 'triceps'], tertiary: ['core'] },
  { key: 't2b', name: { fr: 'Toes-to-bar', en: 'Toes-to-bar', es: 'Toes-to-bar' }, primary: 'core', secondary: ['back', 'obliques'], tertiary: ['forearms', 'traps'] },
  { key: 'deadlift', name: { fr: 'Soulevé de terre', en: 'Deadlift', es: 'Peso muerto' }, primary: 'hamstrings', secondary: ['glutes', 'lower_back', 'traps'], tertiary: ['adductors', 'back', 'forearms'] },
  { key: 'row', name: { fr: 'Rameur', en: 'Row', es: 'Remo' }, primary: 'cardio_upper', secondary: ['back', 'hamstrings'], tertiary: ['core', 'biceps', 'traps'] },
  { key: 'press', name: { fr: 'Développé militaire', en: 'Strict press', es: 'Press militar' }, primary: 'shoulders', secondary: ['triceps'], tertiary: ['core', 'lower_back', 'traps'] },
  { key: 'dubs', name: { fr: 'Double-unders', en: 'Double-unders', es: 'Double-unders' }, primary: 'calves', secondary: ['cardio_lower', 'tibialis'], tertiary: ['forearms', 'quads'] }
]

/** Séries comptées par mouvement dans la démo : un WOD typique de 3 à 5 tours. */
export const DEMO_SETS = 4

export function demoMoveName(move: DemoMove, lang: string): string {
  const l = lang.slice(0, 2) as keyof DemoMove['name']
  return move.name[l] ?? move.name.fr
}

/** Forme attendue par computeMuscleLoads, sans rien d'autre de réel. */
export function toWorkoutExercise(move: DemoMove, lang: string): WorkoutExercise {
  const exercise = {
    id: move.key,
    name: demoMoveName(move, lang),
    primary_muscle: move.primary,
    secondary_muscles: move.secondary,
    tertiary_muscles: move.tertiary
  } as Exercise
  return { id: move.key, exercise, position: 0, sets: DEMO_SETS }
}
