import { supabase } from './supabase'
import { getLocalUser } from './currentUser'
import { readFunctionErrorMessage } from './edgeFunctionError'
import { matchAgainstExisting, normalizeExerciseName } from './textSimilarity'
import type { Exercise, ExerciseCategory, MuscleGroup } from '../types'
import { MUSCLE_GROUP_I18N_KEYS } from '../types'

/**
 * Import d'exercices (050) : CSV, PDF ou photos de feuilles d'entraînement,
 * par un centre ou par WODBUD. Chaque nom trouvé est compté (occurrences),
 * fusionné s'il revient dans plusieurs fichiers, puis relié à l'exercice
 * existant quand il y en a un. Les mentions servent à WODBUD pour choisir les
 * vidéos officielles à tourner en priorité.
 */

export type ImportSource = 'photo' | 'pdf' | 'csv'

export interface ExtractedRow {
  name: string
  category: ExerciseCategory
  primary_muscle: MuscleGroup
  description: string
  occurrences: number
  source: ImportSource
  label: string
}

export type Match = { kind: 'exact' | 'similar'; exercise: Exercise } | { kind: 'none' }

export interface ImportRow {
  uid: string
  name: string
  category: ExerciseCategory
  primary_muscle: MuscleGroup
  description: string
  occurrences: number
  sources: ImportSource[]
  labels: string[]
  match: Match
  /** Créer un nouvel exercice ; sinon, la mention est reliée à l'existant. */
  selected: boolean
  status: 'pending' | 'importing' | 'done' | 'error'
  error?: string
  createdId?: string
}

export const CATEGORIES: ExerciseCategory[] = ['strength', 'olympic', 'gymnastics', 'cardio', 'mobility', 'accessory']
export const MUSCLES = Object.keys(MUSCLE_GROUP_I18N_KEYS) as MuscleGroup[]

// ─── Valeurs tolérantes (OCR et tableurs écrits à la main) ──────────

const CATEGORY_WORDS: Record<string, ExerciseCategory> = {
  force: 'strength', strength: 'strength', fuerza: 'strength', musculation: 'strength',
  halterophilie: 'olympic', haltero: 'olympic', olympic: 'olympic', olympique: 'olympic', weightlifting: 'olympic',
  gymnastique: 'gymnastics', gymnastics: 'gymnastics', gym: 'gymnastics', gimnasia: 'gymnastics',
  cardio: 'cardio', endurance: 'cardio', conditioning: 'cardio',
  mobilite: 'mobility', mobility: 'mobility', movilidad: 'mobility', etirements: 'mobility',
  accessoire: 'accessory', accessory: 'accessory', accesorio: 'accessory'
}

const MUSCLE_WORDS: Record<string, MuscleGroup> = {
  pectoraux: 'chest', pecs: 'chest', poitrine: 'chest', dos: 'back', trapezes: 'traps', epaules: 'shoulders',
  abdos: 'core', abdominaux: 'core', abs: 'core', tronc: 'core', obliques: 'obliques', lombaires: 'lower_back',
  fessiers: 'glutes', quadriceps: 'quads', quads: 'quads', ischios: 'hamstrings', ischio: 'hamstrings',
  adducteurs: 'adductors', mollets: 'calves', 'avant bras': 'forearms', jambier: 'tibialis'
}

export function toCategory(v: unknown): ExerciseCategory {
  const s = normalizeExerciseName(String(v ?? ''))
  if (CATEGORIES.includes(s as ExerciseCategory)) return s as ExerciseCategory
  return CATEGORY_WORDS[s] ?? 'strength'
}

export function toMuscle(v: unknown): MuscleGroup {
  const raw = String(v ?? '').trim()
  if (MUSCLES.includes(raw as MuscleGroup)) return raw as MuscleGroup
  const s = normalizeExerciseName(raw)
  return MUSCLE_WORDS[s] ?? (MUSCLES.includes(s.replace(/ /g, '_') as MuscleGroup) ? (s.replace(/ /g, '_') as MuscleGroup) : 'core')
}

const toCount = (v: unknown) => {
  const n = Math.round(Number(String(v ?? '').replace(',', '.')))
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 10000) : 1
}

// ─── CSV ────────────────────────────────────────────────────────────

/** Lecture CSV : guillemets, retours à la ligne entre guillemets, `,` ou `;` (Excel en français). */
export function parseCsv(text: string): string[][] {
  // Marque d'ordre des octets (BOM) en tête des CSV exportés par Excel.
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? ''
  const delim = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ','
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i]
    if (quoted) {
      if (c === '"' && clean[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === delim) { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && clean[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.some((x) => x.trim())) rows.push(row)
      row = []
    } else cell += c
  }
  row.push(cell)
  if (row.some((x) => x.trim())) rows.push(row)
  return rows
}

const HEADERS: Record<'name' | 'category' | 'muscle' | 'description' | 'occurrences', string[]> = {
  name: ['nom', 'name', 'exercice', 'exercise', 'ejercicio', 'nombre del ejercicio', 'mouvement', 'movement'],
  category: ['categorie', 'category', 'categoria', 'type'],
  muscle: ['muscle', 'muscle principal', 'primary muscle', 'primary_muscle', 'musculo'],
  description: ['description', 'consignes', 'notes', 'instructions', 'descripcion'],
  occurrences: ['occurrences', 'nombre', 'count', 'fois', 'frequence', 'veces', 'cantidad']
}

export function csvToRows(text: string, label: string): ExtractedRow[] {
  const table = parseCsv(text)
  if (!table.length) return []
  const head = table[0].map((h) => normalizeExerciseName(h))
  const col = (key: keyof typeof HEADERS) => head.findIndex((h) => HEADERS[key].includes(h))
  const nameCol = col('name')
  // Sans en-tête reconnu : la première colonne est le nom, et la première
  // ligne est déjà un exercice.
  const hasHeader = nameCol >= 0
  const idx = {
    name: hasHeader ? nameCol : 0,
    category: col('category'), muscle: col('muscle'), description: col('description'), occurrences: col('occurrences')
  }
  return table.slice(hasHeader ? 1 : 0)
    .map((r) => ({
      name: (r[idx.name] ?? '').trim().slice(0, 120),
      category: toCategory(idx.category >= 0 ? r[idx.category] : ''),
      primary_muscle: toMuscle(idx.muscle >= 0 ? r[idx.muscle] : ''),
      description: (idx.description >= 0 ? r[idx.description] ?? '' : '').trim(),
      occurrences: idx.occurrences >= 0 ? toCount(r[idx.occurrences]) : 1,
      source: 'csv' as const,
      label
    }))
    .filter((r) => r.name.length > 0)
}

// ─── Photos et pages de PDF (lecture par IA, côté serveur) ──────────

function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function analyzeImage(file: File, label: string, source: ImportSource, centerId?: string): Promise<ExtractedRow[]> {
  const base64 = await fileToBase64(file)
  const { data, error } = await supabase.functions.invoke('ocr-import', {
    body: { base64, mimeType: file.type, center_id: centerId }
  })
  if (error) {
    const detail = await readFunctionErrorMessage(error)
    throw new Error(detail ?? error.message ?? 'OCR')
  }
  const raw = ((data as { rows?: unknown[] })?.rows ?? []) as Array<Record<string, unknown>>
  return raw
    .map((r) => ({
      name: String(r.name ?? '').trim().slice(0, 120),
      category: toCategory(r.category),
      primary_muscle: toMuscle(r.primary_muscle),
      description: String(r.description ?? '').trim(),
      occurrences: toCount(r.occurrences),
      source,
      label
    }))
    .filter((r) => r.name.length > 0)
}

// ─── Fusion, doublons, liens ────────────────────────────────────────

/** Le même exercice trouvé dans plusieurs fichiers devient une ligne, occurrences additionnées. */
export function aggregate(rows: ExtractedRow[], existing: Exercise[]): ImportRow[] {
  const byName = new Map<string, ImportRow>()
  for (const r of rows) {
    const key = normalizeExerciseName(r.name)
    if (!key) continue
    const found = byName.get(key)
    if (found) {
      found.occurrences += r.occurrences
      if (!found.sources.includes(r.source)) found.sources.push(r.source)
      if (!found.labels.includes(r.label)) found.labels.push(r.label)
      if (!found.description && r.description) found.description = r.description
      continue
    }
    const match = findMatch(r.name, existing)
    byName.set(key, {
      uid: crypto.randomUUID(),
      name: r.name,
      category: r.category,
      primary_muscle: r.primary_muscle,
      description: r.description,
      occurrences: r.occurrences,
      sources: [r.source],
      labels: [r.label],
      match,
      // Doublon certain : relié d'office. Nom proche : relié aussi, la
      // personne coche si c'est vraiment un autre exercice.
      selected: match.kind === 'none',
      status: 'pending'
    })
  }
  return [...byName.values()].sort((a, b) => b.occurrences - a.occurrences || a.name.localeCompare(b.name))
}

export function findMatch(name: string, existing: Exercise[]): Match {
  const n = normalizeExerciseName(name)
  const exact = existing.find((e) => normalizeExerciseName(e.name) === n)
  if (exact) return { kind: 'exact', exercise: exact }
  const similar = existing.find((e) => matchAgainstExisting(name, [normalizeExerciseName(e.name)]) === 'similar')
  return similar ? { kind: 'similar', exercise: similar } : { kind: 'none' }
}

/** Une ligne par exercice trouvé : reliée à ce qui a été créé, ou à l'existant. */
export async function saveMentions(rows: ImportRow[], centerId: string | null): Promise<void> {
  const { data } = await getLocalUser()
  const userId = data.user?.id
  if (!userId || !rows.length) return
  const payload = rows.map((r) => ({
    center_id: centerId,
    exercise_id: r.createdId ?? (r.match.kind !== 'none' && !r.selected ? r.match.exercise.id : null),
    name: r.name.trim().slice(0, 120),
    name_normalized: normalizeExerciseName(r.name),
    occurrences: Math.max(1, Math.min(10000, r.occurrences)),
    source: r.sources[0],
    created_by: userId
  }))
  const { error } = await supabase.from('exercise_mentions').insert(payload)
  if (error) throw error
}
