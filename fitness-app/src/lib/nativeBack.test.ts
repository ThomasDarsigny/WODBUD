import { afterEach, describe, expect, it, vi } from 'vitest'
import { backAction } from './nativeBack'
import { PUBLIC_SITE_URL, publicOrigin } from './publicUrl'

describe('retour Android (app des boutiques)', () => {
  it('ferme d’abord la fenêtre ouverte, même sur un accueil', () => {
    expect(backAction({ path: '/dashboard/today', overlay: true, canGoBack: true })).toBe('back')
    expect(backAction({ path: '/athlete', overlay: true, canGoBack: false })).toBe('back')
  })

  it('passe en arrière-plan depuis un accueil, sans revenir à la connexion', () => {
    for (const path of ['/dashboard/today', '/athlete', '/bienvenue', '/login', '/dashboard/admin', '/athlete/']) {
      expect(backAction({ path, overlay: false, canGoBack: true })).toBe('minimize')
    }
  })

  it('revient à l’écran précédent ailleurs', () => {
    expect(backAction({ path: '/dashboard/classes', overlay: false, canGoBack: true })).toBe('back')
    expect(backAction({ path: '/signup', overlay: false, canGoBack: true })).toBe('back')
  })

  it('passe en arrière-plan quand il n’y a pas d’écran précédent (app ouverte par un lien)', () => {
    expect(backAction({ path: '/rejoindre/abc', overlay: false, canGoBack: false })).toBe('minimize')
  })
})

describe('origine des liens partagés', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('garde l’adresse de la page sur le web (production, aperçu, local)', () => {
    vi.stubGlobal('window', { location: { origin: 'https://fitness-abc-thomasdarsignys-projects.vercel.app' } })
    expect(publicOrigin()).toBe('https://fitness-abc-thomasdarsignys-projects.vercel.app')
  })

  it('prend l’adresse publique dans l’app des boutiques, jamais https://localhost', () => {
    vi.stubGlobal('window', { location: { origin: 'https://localhost' }, Capacitor: { isNativePlatform: () => true } })
    expect(publicOrigin()).toBe(PUBLIC_SITE_URL)
    expect(PUBLIC_SITE_URL).toMatch(/^https:\/\/[^/]+[^/]$/)
    expect(PUBLIC_SITE_URL).not.toContain('localhost')
  })
})
