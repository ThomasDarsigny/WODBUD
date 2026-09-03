import type { LoadLevel, MuscleGroup, MuscleLoad, WorkoutExercise } from '../types'

/**
 * Moteur de charge musculaire du mannequin.
 *
 * Toute la logique ajustable vit dans REGLES. C'est le seul point d'ancrage :
 * aucun autre fichier ne connaît les seuils. Pour brancher des règles venant
 * de Supabase, passer `override` à computeMuscleLoads().
 */
export const REGLES = {
  /** Poids d'une série selon le rôle du muscle dans l'exercice. */
  roleWeight: { primary: 1, secondary: 0.5, tertiary: 0.25 } as Record<string, number>,

  /**
   * Plafond de séries par séance et par muscle, selon sa taille.
   * Un gros muscle encaisse plus qu'un petit — un plafond unique
   * mettrait les biceps dans le rouge en permanence.
   */
  capBySize: { large: 12, medium: 9, small: 6 } as Record<string, number>,

  /** Taille de chaque groupe. Miroir de muscle_groups.size_class. */
  sizeByMuscle: {
    chest: 'large', back: 'large', glutes: 'large', quads: 'large', hamstrings: 'large',
    shoulders: 'medium', core: 'medium', lower_back: 'medium',
    cardio_upper: 'medium', cardio_lower: 'medium',
    biceps: 'small', triceps: 'small', forearms: 'small', obliques: 'small', calves: 'small'
  } as Record<MuscleGroup, string>,

  /** Seuils de bascule d'un état à l'autre, en ratio du plafond. */
  seuils: { under: 0.55, optimal: 1.0, high: 1.35 },

  /**
   * Charge résiduelle des jours précédents, en fraction.
   * Si t'as massacré tes quads hier, le squat d'aujourd'hui passe au rouge
   * même s'il serait vert isolément. C'est ça qui rend le mannequin utile.
   */
  recuperation: [0.55, 0.3, 0.15, 0.05]
} as const

export type ReglesCharge = typeof REGLES

export function capForMuscle(muscle: MuscleGroup, regles: ReglesCharge = REGLES): number {
  const size = regles.sizeByMuscle[muscle] ?? 'medium'
  return regles.capBySize[size] ?? 9
}

export function levelForRatio(ratio: number, regles: ReglesCharge = REGLES): LoadLevel {
  if (ratio <= 0) return 'unused'
  if (ratio < regles.seuils.under) return 'under'
  if (ratio <= regles.seuils.optimal) return 'optimal'
  if (ratio <= regles.seuils.high) return 'high'
  return 'overload'
}

export interface HistoriqueJour {
  /** 1 = hier, 2 = avant-hier, etc. */
  daysAgo: number
  setsByMuscle: Partial<Record<MuscleGroup, number>>
}

/**
 * Charge de chaque muscle pour la séance en cours, plus la charge résiduelle
 * des jours précédents si un historique est fourni.
 */
export function computeMuscleLoads(
  exercises: WorkoutExercise[],
  options: { historique?: HistoriqueJour[]; regles?: ReglesCharge } = {}
): MuscleLoad[] {
  const regles = options.regles ?? REGLES
  const sets = new Map<MuscleGroup, number>()
  const names = new Map<MuscleGroup, Set<string>>()

  const add = (muscle: MuscleGroup, amount: number, exName: string) => {
    if (amount <= 0) return
    sets.set(muscle, (sets.get(muscle) ?? 0) + amount)
    if (!names.has(muscle)) names.set(muscle, new Set())
    names.get(muscle)!.add(exName)
  }

  for (const we of exercises) {
    // Sans nombre de séries saisi, on compte l'exercice pour une série.
    const n = we.sets && we.sets > 0 ? we.sets : 1
    const ex = we.exercise
    add(ex.primary_muscle, n * regles.roleWeight.primary, ex.name)
    for (const m of ex.secondary_muscles) add(m, n * regles.roleWeight.secondary, ex.name)
    for (const m of ex.tertiary_muscles ?? []) add(m, n * regles.roleWeight.tertiary, ex.name)
  }

  // Charge résiduelle : elle compte dans le ratio, pas dans le compte de séries
  // affiché — sinon l'athlète ne comprend pas d'où sort le chiffre.
  const residuel = new Map<MuscleGroup, number>()
  for (const jour of options.historique ?? []) {
    const facteur = regles.recuperation[jour.daysAgo - 1]
    if (!facteur) continue
    for (const [muscle, n] of Object.entries(jour.setsByMuscle) as [MuscleGroup, number][]) {
      residuel.set(muscle, (residuel.get(muscle) ?? 0) + n * facteur)
    }
  }

  const touched = new Set<MuscleGroup>([...sets.keys(), ...residuel.keys()])
  const loads: MuscleLoad[] = []

  for (const muscle of touched) {
    const own = sets.get(muscle) ?? 0
    const total = own + (residuel.get(muscle) ?? 0)
    const cap = capForMuscle(muscle, regles)
    const ratio = cap > 0 ? total / cap : 0
    loads.push({
      muscle,
      ratio,
      level: own <= 0 && ratio < regles.seuils.under ? 'unused' : levelForRatio(ratio, regles),
      sets: Math.round(own * 10) / 10,
      exerciseNames: Array.from(names.get(muscle) ?? [])
    })
  }

  return loads.sort((a, b) => b.ratio - a.ratio)
}

/** Accès direct au niveau d'un muscle, pour colorer une zone du mannequin. */
export function levelOf(muscle: MuscleGroup, loads: MuscleLoad[]): LoadLevel {
  return loads.find((l) => l.muscle === muscle)?.level ?? 'unused'
}

export function loadOf(muscle: MuscleGroup, loads: MuscleLoad[]): MuscleLoad | undefined {
  return loads.find((l) => l.muscle === muscle)
}
