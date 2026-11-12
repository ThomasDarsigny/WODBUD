import { describe, expect, it } from 'vitest'
import { missingEquipment } from './equipment'

describe('équipement manquant', () => {
  it('liste ce qui manque, dans l’ordre de l’exercice', () => {
    expect(missingEquipment(['barbell', 'plates', 'rack'], ['plates'])).toEqual(['barbell', 'rack'])
  })

  it('ne manque rien au poids du corps ni quand rien n’est renseigné', () => {
    expect(missingEquipment(['bodyweight'], [])).toEqual([])
    expect(missingEquipment([], [])).toEqual([])
    expect(missingEquipment(null, [])).toEqual([])
  })

  it('ignore les identifiants inconnus', () => {
    expect(missingEquipment(['barbell', 'machin'], ['barbell'])).toEqual([])
  })
})
