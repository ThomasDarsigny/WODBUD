import { describe, expect, it } from 'vitest'
import { matchAgainstExisting, normalizeExerciseName } from './textSimilarity'

describe('noms d’exercices (doublons de l’import)', () => {
  it('normalise casse, accents, ponctuation et espaces', () => {
    expect(normalizeExerciseName('  Back-Squat  ')).toBe('back squat')
    expect(normalizeExerciseName('Développé   Couché')).toBe('developpe couche')
  })

  it('reconnaît un doublon exact après normalisation', () => {
    expect(matchAgainstExisting('BACK SQUAT', ['back squat'])).toBe('exact')
  })

  it('signale un pluriel ou une coquille comme similaire', () => {
    expect(matchAgainstExisting('Thrusters', ['thruster'])).toBe('similar')
    expect(matchAgainstExisting('Squat', ['squats'])).toBe('similar')
  })

  it('n’associe pas deux noms courts vraiment différents', () => {
    expect(matchAgainstExisting('Row', ['run'])).toBe('none')
  })

  it('ignore un nom vide ou fait seulement de ponctuation', () => {
    expect(matchAgainstExisting('', ['squat'])).toBe('none')
    expect(matchAgainstExisting('!!!', ['squat'])).toBe('none')
  })
})
