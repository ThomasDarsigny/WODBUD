/**
 * Génère src/components/mannequin/bodyPaths.ts depuis react-native-body-highlighter.
 *
 * L'artwork vient de ce paquet, sous licence MIT (© 2022 ELABBASSI Hicham).
 * On n'installe PAS le paquet comme dépendance : c'est du React Native, il
 * tire react-native-svg dont on n'a aucun usage ici. On extrait uniquement les
 * données de tracés, ce que la licence MIT permet explicitement à condition de
 * conserver l'avis de copyright — voir THIRD-PARTY-NOTICES.md.
 *
 * Pour régénérer :  npm run mannequin
 */
import { execSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const VERSION = '3.2.0'
const PKG = `react-native-body-highlighter@${VERSION}`

/**
 * Correspondance entre les zones du paquet et les groupes de muscle_groups.
 * `null` = zone neutre : jamais colorée, parce qu'un genou vert ou des
 * adducteurs allumés ne voudraient rien dire faute d'exercice qui les cible.
 */
const MAP = {
  chest: 'chest',
  obliques: 'obliques',
  abs: 'core',
  biceps: 'biceps',
  triceps: 'triceps',
  trapezius: 'traps',
  'upper-back': 'back',
  'lower-back': 'lower_back',
  deltoids: 'shoulders',
  quadriceps: 'quads',
  hamstring: 'hamstrings',
  gluteal: 'glutes',
  calves: 'calves',
  tibialis: 'tibialis',
  adductors: 'adductors',
  forearm: 'forearms',
  neck: null,
  head: null,
  hair: null,
  hands: null,
  feet: null,
  ankles: null,
  knees: null
}

const tmp = mkdtempSync(join(tmpdir(), 'wodbud-mannequin-'))
try {
  console.log(`Récupération de ${PKG}...`)
  execSync(`npm pack ${PKG}`, { cwd: tmp, stdio: 'pipe' })
  const tgz = readdirSync(tmp).find((f) => f.endsWith('.tgz'))
  execSync(`tar xzf ${tgz}`, { cwd: tmp, stdio: 'pipe' })

  const req = createRequire(join(tmp, 'package', 'x.cjs'))
  const load = (f, key) => req(join(tmp, 'package', 'dist', 'assets', f))[key]

  const views = {
    maleFront: load('bodyFront.js', 'bodyFront'),
    maleBack: load('bodyBack.js', 'bodyBack'),
    femaleFront: load('bodyFemaleFront.js', 'bodyFemaleFront'),
    femaleBack: load('bodyFemaleBack.js', 'bodyFemaleBack')
  }

  const licence = readFileSync(join(tmp, 'package', 'LICENSE'), 'utf8')
  writeFileSync(
    new URL('../THIRD-PARTY-NOTICES.md', import.meta.url),
    `# Composants tiers\n\n## react-native-body-highlighter\n\n` +
      `Les tracés SVG du mannequin (\`src/components/mannequin/bodyPaths.ts\`) sont\n` +
      `extraits de [react-native-body-highlighter](https://github.com/HichamELBSI/react-native-body-highlighter)\n` +
      `version ${VERSION}, distribué sous licence MIT. Le paquet lui-même n'est pas\n` +
      `une dépendance du projet : seules les données de tracés sont reprises.\n\n` +
      '```\n' + licence.trim() + '\n```\n'
  )

  const unknown = new Set()
  /** Groupes réellement dessinés dans une vue : évite une liste tenue à la main
      qui se désynchronise au premier changement de correspondance. */
  const visible = (groups) =>
    [...new Set(groups.map((g) => MAP[g.slug]).filter(Boolean))].map((m) => `'${m}'`).join(', ')

  const emit = (groups) =>
    groups
      .flatMap((g) => {
        if (!(g.slug in MAP)) unknown.add(g.slug)
        const muscle = MAP[g.slug] ?? null
        const paths = [...(g.path?.left ?? []), ...(g.path?.right ?? [])]
        return paths.map((d) => ({ muscle, d }))
      })
      .map((s) => `  { muscle: ${s.muscle ? `'${s.muscle}'` : 'null'}, d: '${s.d}' }`)
      .join(',\n')

  const out = `// GÉNÉRÉ par scripts/build-mannequin.mjs — ne pas modifier à la main.
// Tracés extraits de react-native-body-highlighter ${VERSION}, licence MIT,
// © 2022 ELABBASSI Hicham. Voir THIRD-PARTY-NOTICES.md.
// Régénérer :  npm run mannequin
import type { MuscleGroup } from '../../types'

export type MannequinView = 'front' | 'back'
export type MannequinBody = 'male' | 'female'

export interface BodyShape {
  /** null = zone neutre : tête, mains, genoux, adducteurs. Jamais colorée. */
  muscle: MuscleGroup | null
  d: string
}

/** Cadrage d'origine du paquet : chaque vue occupe une zone distincte. */
export const VIEW_BOXES: Record<MannequinBody, Record<MannequinView, string>> = {
  male: { front: '0 0 724 1448', back: '724 0 724 1448' },
  female: { front: '-50 -40 734 1538', back: '756 0 774 1448' }
}

export const BODY_SHAPES: Record<MannequinBody, Record<MannequinView, BodyShape[]>> = {
  male: {
    front: [
${emit(views.maleFront)}
    ],
    back: [
${emit(views.maleBack)}
    ]
  },
  female: {
    front: [
${emit(views.femaleFront)}
    ],
    back: [
${emit(views.femaleBack)}
    ]
  }
}

/** Muscles visibles de face / de dos — déduits des tracés, jamais saisis à la main. */
export const MUSCLES_BY_VIEW: Record<MannequinView, MuscleGroup[]> = {
  front: [${visible(views.maleFront)}],
  back: [${visible(views.maleBack)}]
}

/** cardio_upper / cardio_lower n'ont pas de zone : ce ne sont pas des muscles. */
export const NON_ANATOMICAL: MuscleGroup[] = ['cardio_upper', 'cardio_lower']
`

  writeFileSync(new URL('../src/components/mannequin/bodyPaths.ts', import.meta.url), out)
  if (unknown.size) console.warn('Zones non rattachées :', [...unknown].join(', '))
  console.log('bodyPaths.ts généré :', out.length, 'octets')
  console.log('THIRD-PARTY-NOTICES.md écrit')
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
