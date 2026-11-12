import { describe, expect, it } from 'vitest'
import { loadStep, nextLoad, progressionRate } from './progression'
import type { EquipmentId } from './equipment'

const squat = { body_region: 'lower' as const, primary_muscle: 'quads' as const, equipment: ['barbell', 'plates', 'rack'] as EquipmentId[] }
const press = { body_region: 'upper' as const, primary_muscle: 'shoulders' as const, equipment: ['barbell', 'plates'] as EquipmentId[] }

describe('progression', () => {
  it('applique +10 % au bas du corps et +5 % au haut', () => {
    expect(progressionRate(squat)).toBe(0.1)
    expect(progressionRate(press)).toBe(0.05)
  })

  it('un mouvement complet suit son muscle principal', () => {
    expect(progressionRate({ body_region: 'full', primary_muscle: 'hamstrings', equipment: [] })).toBe(0.1)
    expect(progressionRate({ body_region: 'full', primary_muscle: 'shoulders', equipment: [] })).toBe(0.05)
  })

  it('arrondit aux disques en kg', () => {
    expect(nextLoad(100, squat)).toEqual({ value: 110, kg: 110, rate: 0.1 })
    expect(nextLoad(60, press)?.value).toBe(62.5) // 63 → 62,5
    expect(nextLoad(102.5, squat)?.value).toBe(112.5) // 112,75 → 112,5
  })

  it('monte toujours d’au moins un saut', () => {
    expect(nextLoad(20, press)?.value).toBe(22.5) // 21 arrondirait à 20
  })

  it('arrondit aux disques en lb', () => {
    const r = nextLoad(100, squat, 'lb')! // 220,5 lb → 242,5 → 245
    expect(r.value).toBe(245)
    expect(r.kg).toBeCloseTo(111.13, 1)
  })

  it('suit le râtelier pour haltères et kettlebells', () => {
    const db = { ...press, equipment: ['dumbbells'] as EquipmentId[] }
    const kb = { ...squat, equipment: ['kettlebells'] as EquipmentId[] }
    expect(loadStep(db, 'kg')).toBe(2)
    expect(nextLoad(16, kb)?.value).toBe(20) // 17,6 → 16, donc un saut : 20
  })

  it('refuse une charge nulle', () => {
    expect(nextLoad(0, squat)).toBeNull()
  })
})
