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
  } catch {}
}

export function loadFromCache<K extends CacheKey>(key: K): CacheValue[K] | null {
  try {
    const raw = localStorage.getItem(KEYS[key])
    return raw ? (JSON.parse(raw) as CacheValue[K]) : null
  } catch {
    return null
  }
}
