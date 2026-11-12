/**
 * Équipement qu'un centre (ou un compte perso, à la maison) a sous la main,
 * et celui qu'un exercice demande. Demandé à l'inscription, modifiable dans
 * les réglages ; sert à proposer d'abord les exercices faisables. Les
 * identifiants sont stockés tels quels (centers.equipment,
 * profiles.equipment, exercises.equipment) : ne pas les renommer.
 */
export const EQUIPMENT_GROUPS = [
  { id: 'bars', items: ['barbell', 'light_bar', 'ez_bar', 'trap_bar', 'plates', 'rack', 'bench'] },
  { id: 'free', items: ['dumbbells', 'kettlebells', 'wall_ball', 'medicine_ball', 'sandbag', 'weighted_roller', 'weight_vest'] },
  { id: 'gymnastics', items: ['pullup_bar', 'rig', 'rings', 'suspension_straps', 'parallel_bars', 'parallettes', 'climb_rope', 'pegboard', 'ghd'] },
  { id: 'cardio', items: ['rower', 'air_bike', 'ski_erg', 'treadmill', 'stationary_bike', 'elliptical', 'stair_climber', 'jump_rope'] },
  { id: 'machines', items: ['smith_machine', 'cable_machine', 'lat_pulldown', 'leg_press', 'leg_extension'] },
  { id: 'strongman', items: ['sled', 'yoke', 'tire', 'sledgehammer', 'battle_ropes'] },
  { id: 'accessories', items: ['box', 'bands', 'mat', 'stability_ball', 'bosu', 'foam_roller', 'ab_wheel', 'agility_ladder', 'cones'] }
] as const

type Group = (typeof EQUIPMENT_GROUPS)[number]
export type InventoryId = Group['items'][number]

/** Sur un exercice seulement : aucun matériel. Une liste vide veut dire « pas renseigné ». */
export const BODYWEIGHT = 'bodyweight'
export type EquipmentId = InventoryId | typeof BODYWEIGHT

export const EQUIPMENT: InventoryId[] = EQUIPMENT_GROUPS.flatMap((g) => [...g.items])

/** Ce qu'une box CrossFit a presque toujours : coché d'un geste. */
export const BOX_PRESET: EquipmentId[] = [
  'barbell', 'plates', 'rack', 'dumbbells', 'kettlebells', 'pullup_bar', 'rig', 'rings',
  'jump_rope', 'box', 'wall_ball', 'rower', 'air_bike', 'mat'
]

/** À la maison, le point de départ le plus courant. */
export const HOME_PRESET: EquipmentId[] = ['dumbbells', 'jump_rope', 'bands', 'mat']

export function cleanEquipment(list: readonly string[] | null | undefined): EquipmentId[] {
  const known = new Set<string>([...EQUIPMENT, BODYWEIGHT])
  return [...new Set((list ?? []).filter((e) => known.has(e)))] as EquipmentId[]
}

/**
 * Ce qui manque pour faire un exercice. Rien ne manque pour un exercice au
 * poids du corps, ni pour un exercice dont l'équipement n'est pas renseigné
 * (on ne cache pas ce qu'on ne connaît pas).
 */
export function missingEquipment(required: readonly string[] | null | undefined, available: readonly string[]): EquipmentId[] {
  const have = new Set(available)
  return cleanEquipment(required).filter((e) => e !== BODYWEIGHT && !have.has(e))
}
