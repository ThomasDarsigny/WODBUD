import type { ThemePref } from '../types'

const STORAGE_KEY = 'wodbud_theme'

export function readStoredTheme(): ThemePref {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'clair' || v === 'sombre' || v === 'auto') return v
  } catch {
    // navigation privée, stockage bloqué : on retombe sur 'auto'
  }
  return 'auto'
}

export function storeTheme(pref: ThemePref) {
  try {
    localStorage.setItem(STORAGE_KEY, pref)
  } catch {
    // best-effort
  }
}

function systemPrefersLight(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches
}

/** Pose data-theme sur <html>. 'sombre' est le défaut, donc pas d'attribut. */
export function applyTheme(pref: ThemePref) {
  const light = pref === 'clair' || (pref === 'auto' && systemPrefersLight())
  const root = document.documentElement
  if (light) root.setAttribute('data-theme', 'clair')
  else root.removeAttribute('data-theme')
}

/**
 * Applique le thème et, en mode auto, suit les changements système en
 * cours de session. Retourne une fonction de nettoyage.
 */
export function initTheme(pref: ThemePref): () => void {
  applyTheme(pref)
  if (pref !== 'auto' || typeof window === 'undefined') return () => {}

  const mq = window.matchMedia('(prefers-color-scheme: light)')
  const onChange = () => applyTheme('auto')
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}
