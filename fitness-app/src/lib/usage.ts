import { supabase } from './supabase'
import { isInstalledApp, isNativeApp } from './platform'
import { localDate } from './scheduledWorkouts'

/**
 * Statistiques d'usage, sans service tiers (migration 074) : une fois par
 * jour et par appareil, « ce compte a ouvert WODBUD aujourd'hui, sur cette
 * plateforme ». Ni page vue, ni clic, ni durée.
 */
export type UsagePlatform = 'web' | 'pwa' | 'android' | 'ios'

export function usagePlatform(): UsagePlatform {
  if (isNativeApp()) {
    const capacitor = (window as Window & { Capacitor?: { getPlatform?: () => string } }).Capacitor
    return capacitor?.getPlatform?.() === 'ios' ? 'ios' : 'android'
  }
  return isInstalledApp() ? 'pwa' : 'web'
}

const KEY = 'wodbud_usage_day'
// Au démarrage, la session restaurée et la connexion arrivent ensemble : un seul envoi.
let pending: string | null = null

/** Une fois par jour, par compte et par appareil ; sans réseau, réessayé à la prochaine ouverture. */
export async function touchUsage(userId: string, today = localDate()): Promise<void> {
  const mark = `${today}|${userId}`
  try {
    if (localStorage.getItem(KEY) === mark || pending === mark) return
  } catch {
    return
  }
  pending = mark
  try {
    const { error } = await supabase.rpc('touch_usage', { p_platform: usagePlatform() })
    if (error) return
    try { localStorage.setItem(KEY, mark) } catch { /* stockage indisponible */ }
  } finally {
    pending = null
  }
}

/** À la connexion, au démarrage avec une session, et quand l'app revient au premier plan. */
export function initUsage(): void {
  supabase.auth.onAuthStateChange((event, session) => {
    if (!session || (event !== 'INITIAL_SESSION' && event !== 'SIGNED_IN')) return
    // Hors du rappel : supabase-js y garde son verrou de session.
    setTimeout(() => { void touchUsage(session.user.id) }, 0)
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void touchUsage(data.session.user.id)
    })
  })
}
