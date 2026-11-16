import { beforeEach, describe, expect, it, vi } from 'vitest'
import { visibleUpcoming, workoutsToPack, type ScheduledEntry } from './scheduledWorkouts'
import { clearOffline, loadOffline, saveOffline } from './offlineCache'

const entry = (id: string, scheduled_date: string, extra: Partial<ScheduledEntry> = {}): ScheduledEntry => ({
  id, scheduled_date, title: null, notes: null, workout_id: `w-${id}`, workout_title: id, session_id: null, class_name: null, class_plan_id: null, ...extra
})

describe('séances programmées sans réseau (A5)', () => {
  // Liste lue le lundi 16 novembre ; le téléphone est hors ligne le mercredi 18.
  const list = [
    entry('ancien', '2026-11-05'),
    entry('lundi-fait', '2026-11-16', { session_id: 's1' }),
    entry('lundi-pas-fait', '2026-11-16'),
    entry('mercredi', '2026-11-18'),
    entry('vendredi', '2026-11-20'),
    entry('dans-dix-jours', '2026-11-28'),
    entry('libre', '2026-11-19', { workout_id: null })
  ]
  const wednesday = new Date(2026, 10, 18, 5, 45)

  it('refait « à venir » pour le jour où on le lit', () => {
    expect(visibleUpcoming(list, wednesday).map((e) => e.id)).toEqual(['lundi-pas-fait', 'mercredi', 'vendredi', 'dans-dix-jours', 'libre'])
  })

  it('garde le contenu des WODs pas encore faits des 7 prochains jours', () => {
    expect(workoutsToPack(list, wednesday)).toEqual(['w-mercredi', 'w-vendredi'])
  })
})

describe('stockage hors ligne', () => {
  beforeEach(() => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v) },
      removeItem: (k: string) => { store.delete(k) },
      key: (i: number) => [...store.keys()][i] ?? null,
      get length() { return store.size }
    })
    localStorage.setItem('sb-projet-auth-token', '{}')
  })

  it('ne garde rien sans compte connecté (lecture finie après la déconnexion)', () => {
    localStorage.removeItem('sb-projet-auth-token')
    saveOffline('admin:u1', true)
    expect(loadOffline('admin:u1')).toBeNull()
  })

  it('garde la valeur avec son heure', () => {
    saveOffline('upcoming:u1', [1, 2], 1000)
    expect(loadOffline('upcoming:u1')).toEqual({ at: 1000, value: [1, 2] })
  })

  it('ne garde que les 40 contenus de WOD les plus récents', () => {
    for (let i = 0; i < 42; i++) saveOffline(`pack:w${i}`, { items: [] }, 1000 + i)
    expect(loadOffline('pack:w0')).toBeNull()
    expect(loadOffline('pack:w1')).toBeNull()
    expect(loadOffline('pack:w2')).not.toBeNull()
    expect(loadOffline('pack:w41')).not.toBeNull()
  })

  it('la déconnexion efface tout le hors-ligne, mais pas les séances à envoyer', () => {
    saveOffline('upcoming:u1', [])
    saveOffline('pack:w1', {})
    localStorage.setItem('wodbud_session_outbox', '[{"id":"s"}]')
    clearOffline()
    expect(loadOffline('upcoming:u1')).toBeNull()
    expect(loadOffline('pack:w1')).toBeNull()
    expect(localStorage.getItem('wodbud_session_outbox')).not.toBeNull()
  })
})
