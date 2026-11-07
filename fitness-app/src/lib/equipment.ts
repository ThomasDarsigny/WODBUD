/**
 * Équipement qu'un centre (ou un compte perso, à la maison) a sous la main.
 * Demandé à l'inscription, modifiable dans les réglages ; servira à proposer
 * d'abord les exercices faisables. Les identifiants sont stockés tels quels
 * (centers.equipment, profiles.equipment) : ne pas les renommer.
 */
export const EQUIPMENT = [
  'barbell',
  'plates',
  'rack',
  'bench',
  'dumbbells',
  'kettlebells',
  'pullup_bar',
  'rings',
  'climb_rope',
  'jump_rope',
  'box',
  'wall_ball',
  'medicine_ball',
  'sandbag',
  'sled',
  'ghd',
  'rower',
  'air_bike',
  'ski_erg',
  'treadmill',
  'bands',
  'mat'
] as const

export type EquipmentId = (typeof EQUIPMENT)[number]

/** Ce qu'une box CrossFit a presque toujours : coché d'un geste. */
export const BOX_PRESET: EquipmentId[] = [
  'barbell', 'plates', 'rack', 'dumbbells', 'kettlebells', 'pullup_bar', 'rings',
  'jump_rope', 'box', 'wall_ball', 'rower', 'air_bike', 'mat'
]

/** À la maison, le point de départ le plus courant. */
export const HOME_PRESET: EquipmentId[] = ['dumbbells', 'jump_rope', 'bands', 'mat']

export function cleanEquipment(list: readonly string[] | null | undefined): EquipmentId[] {
  const known = new Set<string>(EQUIPMENT)
  return [...new Set((list ?? []).filter((e) => known.has(e)))] as EquipmentId[]
}
