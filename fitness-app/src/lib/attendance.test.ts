import { beforeEach, describe, expect, it, vi } from 'vitest'
import { checkInPath, clearPendingCheckIn, expectedSessions, readPendingCheckIn, savePendingCheckIn, selfCheckInSlot } from './attendance'

const slot = (weekday: number, start_time: string, duration_minutes = 60) => ({ id: `${weekday}-${start_time}`, class_id: 'c', weekday, start_time, duration_minutes })
// Lundi, mercredi, vendredi à 6 h ; mercredi aussi à 17 h 30.
const slots = [slot(1, '06:00'), slot(3, '06:00'), slot(5, '06:00'), slot(3, '17:30', 45)]

describe('présences', () => {
  it('propose « Je suis là » de 30 min avant à 30 min après le cours', () => {
    const wed = '2026-11-18'
    expect(selfCheckInSlot(slots, wed, new Date(2026, 10, 18, 5, 29))).toBeNull()
    expect(selfCheckInSlot(slots, wed, new Date(2026, 10, 18, 5, 30))?.start_time).toBe('06:00')
    expect(selfCheckInSlot(slots, wed, new Date(2026, 10, 18, 7, 30))?.start_time).toBe('06:00')
    expect(selfCheckInSlot(slots, wed, new Date(2026, 10, 18, 7, 31))).toBeNull()
    expect(selfCheckInSlot(slots, wed, new Date(2026, 10, 18, 17, 10))?.start_time).toBe('17:30')
    // Mardi : aucun cours.
    expect(selfCheckInSlot(slots, '2026-11-17', new Date(2026, 10, 17, 6, 0))).toBeNull()
  })

  it('compte les jours de cours d’une période (un jour à deux créneaux compte une fois)', () => {
    // Du lundi 16 au dimanche 29 novembre : 3 jours par semaine.
    expect(expectedSessions(slots, '2026-11-16', '2026-11-29')).toBe(6)
    expect(expectedSessions(slots, '2026-11-17', '2026-11-17')).toBe(0)
    expect(expectedSessions([], '2026-11-16', '2026-11-29')).toBe(0)
  })

  describe('QR scanné sans être connecté', () => {
    beforeEach(() => {
      // Pas de localStorage sous Node : une version en mémoire suffit.
      const store = new Map<string, string>()
      vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v) }, removeItem: (k: string) => { store.delete(k) } })
      clearPendingCheckIn()
    })

    it('garde seulement un chemin de présence', () => {
      savePendingCheckIn('/dashboard/admin')
      expect(readPendingCheckIn()).toBeNull()
      savePendingCheckIn(checkInPath('abc', 'k 1'))
      expect(readPendingCheckIn()).toBe('/presence/abc?k=k%201')
      clearPendingCheckIn()
      expect(readPendingCheckIn()).toBeNull()
    })
  })
})
