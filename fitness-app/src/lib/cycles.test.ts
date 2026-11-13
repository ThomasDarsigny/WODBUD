import { describe, expect, it } from 'vitest'
import { hasProgression, planCycle, type CycleBase } from './cycles'
import type { EquipmentId } from './equipment'

const squat = { id: 'sq', name: 'Back squat', body_region: 'lower' as const, primary_muscle: 'quads' as const, equipment: ['barbell', 'plates', 'rack'] as EquipmentId[] }
const press = { id: 'pr', name: 'Développé militaire', body_region: 'upper' as const, primary_muscle: 'shoulders' as const, equipment: ['barbell', 'plates'] as EquipmentId[] }
const pullup = { id: 'pu', name: 'Traction', body_region: 'upper' as const, primary_muscle: 'back' as const, equipment: ['pullup_bar'] as EquipmentId[] }

const base: CycleBase = {
  id: 'w1', title: 'Force 5×5', method: 'strength', duration_minutes: 45, notes: null,
  lines: [
    { exercise: squat, position: 1, sets: 5, reps: '5', weight: '100kg', rest_seconds: 120, notes: null },
    { exercise: press, position: 2, sets: 5, reps: '5', weight: '40kg', rest_seconds: 90, notes: null },
    { exercise: pullup, position: 3, sets: 3, reps: 'max', weight: 'BW', rest_seconds: 60, notes: null }
  ]
}

describe('cycles', () => {
  it('monte la charge chaque semaine : +10 % bas du corps, +5 % haut, au poids du corps inchangé', () => {
    const weeks = planCycle(base, '2026-11-16', 4, true, 'kg')
    expect(weeks.map((w) => w.date)).toEqual(['2026-11-16', '2026-11-23', '2026-11-30', '2026-12-07'])
    expect(weeks.map((w) => w.lines[0].weight)).toEqual(['100kg', '110kg', '120kg', '132.5kg'])
    expect(weeks.map((w) => w.lines[1].weight)).toEqual(['40kg', '42.5kg', '45kg', '47.5kg'])
    expect(weeks.map((w) => w.lines[2].weight)).toEqual(['BW', 'BW', 'BW', 'BW'])
    expect(weeks[0].reusesBase).toBe(true)
    expect(weeks[1].title).toBe('Force 5×5 · S2/4')
    expect(hasProgression(weeks)).toBe(true)
  })

  it('sans progression, les semaines sont identiques', () => {
    const weeks = planCycle(base, '2026-11-16', 3, false, 'kg')
    expect(weeks.map((w) => w.lines[0].weight)).toEqual(['100kg', '100kg', '100kg'])
    expect(hasProgression(weeks)).toBe(false)
  })

  it('fait monter les deux charges RX hommes / femmes d’un benchmark', () => {
    const deadlift = { id: 'dl', name: 'Soulevé de terre', body_region: 'full' as const, primary_muscle: 'hamstrings' as const, equipment: ['barbell', 'plates'] as EquipmentId[] }
    const diane: CycleBase = { ...base, title: 'Diane', lines: [{ exercise: deadlift, position: 1, sets: null, reps: '21-15-9', weight: '102 kg / 70 kg', rest_seconds: null, notes: null }] }
    const weeks = planCycle(diane, '2026-11-16', 3, true, 'kg')
    expect(weeks.map((w) => w.lines[0].weight)).toEqual(['102 kg / 70 kg', '112.5 kg / 77.5 kg', '125 kg / 85 kg'])
  })

  it('borne le nombre de semaines entre 2 et 12', () => {
    expect(planCycle(base, '2026-11-16', 1, true, 'kg')).toHaveLength(2)
    expect(planCycle(base, '2026-11-16', 30, true, 'kg')).toHaveLength(12)
  })
})
