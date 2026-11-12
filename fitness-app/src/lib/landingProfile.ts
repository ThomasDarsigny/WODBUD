import type { ProfileRole } from './profileRole'

/**
 * Landing en trois pages (7.2–7.5) : chaque profil a son adresse, plus facile
 * à référencer et à cibler en publicité. Le profil vu sur la landing est
 * retenu pour être proposé en premier dans Bienvenue après l'inscription.
 */
export type LandingProfile = ProfileRole

export const PROFILE_PATHS: Record<LandingProfile, string> = {
  center: '/centres',
  member: '/membres',
  perso: '/perso'
}

export const LANDING_PROFILES: LandingProfile[] = ['center', 'member', 'perso']

const HINT_KEY = 'wodbud_profile_hint'

export function rememberProfileHint(p: LandingProfile): void {
  try { localStorage.setItem(HINT_KEY, p) } catch { /* mode privé */ }
}

export function readProfileHint(): LandingProfile | null {
  try {
    const v = localStorage.getItem(HINT_KEY)
    return v === 'center' || v === 'member' || v === 'perso' ? v : null
  } catch {
    return null
  }
}
