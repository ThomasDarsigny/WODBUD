import type { Exercise } from '../types'
import type { Workout } from '../types'

const KEYS = {
  exercises: 'fx_exercises_v1',
  workouts: 'fx_workouts_v1'
} as const

type CacheKey = keyof typeof KEYS
type CacheValue = { exercises: Exercise[]; workouts: Workout[] }

export function saveToCache<K extends CacheKey>(key: K, data: CacheValue[K]): void {
  try {
    localStorage.setItem(KEYS[key], JSON.stringify(data))
  } catch {
    // Quota plein ou mode privé : le cache hors-ligne est un bonus, jamais
    // une condition de fonctionnement. On abandonne silencieusement.
  }
}

export function loadFromCache<K extends CacheKey>(key: K): CacheValue[K] | null {
  try {
    const raw = localStorage.getItem(KEYS[key])
    return raw ? (JSON.parse(raw) as CacheValue[K]) : null
  } catch {
    return null
  }
}

/* ── Séance au sous-sol (A5) ────────────────────────────────────────────────
 * Ce qu'il faut pour lancer une séance sans réseau, gardé avec son heure :
 * les séances programmées d'un compte (`upcoming:<compte>`) et le contenu
 * des WODs à venir (`pack:<workout>`). Effacé à la déconnexion.
 */

const OFFLINE_PREFIX = 'wodbud_offline:'
/** Contenus de WOD gardés au plus : les plus anciens partent d'abord. */
const MAX_PACKS = 40

export interface Stamped<T> { at: number; value: T }

/**
 * Un compte est connecté : supabase-js garde sa session sous
 * `sb-<projet>-auth-token`. Sans elle, rien n'est gardé : une lecture partie
 * avant la déconnexion ne réécrit pas ce que la déconnexion vient d'effacer.
 */
function signedIn(): boolean {
  for (let i = 0; i < localStorage.length; i++) {
    if (/^sb-.+-auth-token$/.test(localStorage.key(i) ?? '')) return true
  }
  return false
}

export function saveOffline(key: string, value: unknown, now = Date.now()): void {
  try {
    if (!signedIn()) return
    localStorage.setItem(OFFLINE_PREFIX + key, JSON.stringify({ at: now, value }))
    if (key.startsWith('pack:')) trimPacks()
  } catch {
    // Voir saveToCache : jamais bloquant.
  }
}

export function loadOffline<T>(key: string): Stamped<T> | null {
  try {
    const raw = localStorage.getItem(OFFLINE_PREFIX + key)
    const parsed = raw ? (JSON.parse(raw) as Stamped<T>) : null
    return parsed && typeof parsed.at === 'number' ? parsed : null
  } catch {
    return null
  }
}

function offlineKeys(): string[] {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith(OFFLINE_PREFIX)) keys.push(k)
  }
  return keys
}

function trimPacks(): void {
  const packs = offlineKeys()
    .filter((k) => k.startsWith(`${OFFLINE_PREFIX}pack:`))
    .map((k) => ({ k, at: loadOffline<unknown>(k.slice(OFFLINE_PREFIX.length))?.at ?? 0 }))
    .sort((a, b) => a.at - b.at)
  for (const { k } of packs.slice(0, Math.max(0, packs.length - MAX_PACKS))) localStorage.removeItem(k)
}

/** Déconnexion : rien d'un compte ne reste pour le suivant. */
export function clearOffline(): void {
  try {
    for (const k of offlineKeys()) localStorage.removeItem(k)
  } catch {
    // Stockage indisponible : rien à effacer.
  }
}
