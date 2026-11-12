import { describe, expect, it } from 'vitest'
import { missingForPublish } from './exerciseCompleteness'

describe('exercice prêt à publier', () => {
  it('signale ce qui manque à un exercice importé', () => {
    expect(missingForPublish({ equipment: [], level: null, description: '  ' })).toEqual(['equipment', 'level', 'technique'])
  })

  it('accepte le poids du corps comme équipement renseigné', () => {
    expect(missingForPublish({ equipment: ['bodyweight'], level: 'beginner', description: 'Dos droit.' })).toEqual([])
  })

  it('ne bloque rien tant que l’exercice n’est pas chargé', () => {
    expect(missingForPublish(undefined)).toEqual([])
  })
})
