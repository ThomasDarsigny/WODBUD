import type { Exercise } from '../types'

export type MissingField = 'equipment' | 'level' | 'technique'

/**
 * Ce qui manque pour publier un exercice de centre dans la base commune :
 * l'équipement (souvent vide sur un exercice importé), le niveau et les
 * consignes techniques (la description).
 */
export function missingForPublish(exercise: Pick<Exercise, 'equipment' | 'level' | 'description'> | undefined): MissingField[] {
  if (!exercise) return []
  const out: MissingField[] = []
  if (!exercise.equipment?.length) out.push('equipment')
  if (!exercise.level) out.push('level')
  if (!exercise.description.trim()) out.push('technique')
  return out
}
