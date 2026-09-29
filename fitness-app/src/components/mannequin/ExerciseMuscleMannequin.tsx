import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { MuscleGroup } from '../../types'
import { MUSCLE_GROUP_I18N_KEYS } from '../../types'
import type { MannequinBody, MannequinView } from './bodyPaths'
import { BODY_SHAPES, VIEW_BOXES } from './bodyPaths'
import { readBodyPref } from './Mannequin2D'

/**
 * Mannequin miniature pour une carte d'exercice : « quels muscles cet
 * exercice-ci travaille-t-il ? », pas « où en est ma séance ? ».
 *
 * Volontairement un composant distinct de Mannequin2D plutôt qu'un
 * réemploi avec des `MuscleLoad` bricolés : la palette rouge/jaune/vert de
 * Mannequin2D veut dire « surcharge », ce qui n'a aucun sens pour un seul
 * exercice hors contexte. Ici, une seule teinte (celle déjà utilisée pour
 * le tag du muscle principal) à trois intensités — primaire, secondaire,
 * tertiaire — suffit et ne laisse pas croire à un avertissement.
 */

const OPACITY: Record<'primary' | 'secondary' | 'tertiary', number> = {
  primary: 1,
  secondary: 0.55,
  tertiary: 0.28
}

interface Props {
  primaryMuscle: MuscleGroup
  secondaryMuscles: MuscleGroup[]
  tertiaryMuscles: MuscleGroup[]
  /** Hauteur d'une vue en px. Les deux vues (face + dos) sont côte à côte. */
  height?: number
}

export default function ExerciseMuscleMannequin({
  primaryMuscle,
  secondaryMuscles,
  tertiaryMuscles,
  height = 92
}: Props) {
  const { t } = useTranslation('common')
  const [body, setBody] = useState<MannequinBody>(readBodyPref)

  // Même préférence de silhouette que le reste de l'app (réglée dans
  // Paramètres) : sans cette écoute, une carte déjà montée resterait sur
  // l'ancien choix jusqu'au prochain montage.
  useEffect(() => {
    const sync = () => setBody(readBodyPref())
    window.addEventListener('wodbud:mannequin-body', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('wodbud:mannequin-body', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  function opacityFor(muscle: MuscleGroup): number | null {
    if (muscle === primaryMuscle) return OPACITY.primary
    if (secondaryMuscles.includes(muscle)) return OPACITY.secondary
    if (tertiaryMuscles.includes(muscle)) return OPACITY.tertiary
    return null
  }

  return (
    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }} aria-hidden="true">
      {(['front', 'back'] as MannequinView[]).map((view) => {
        const viewBox = VIEW_BOXES[body][view]
        const [, , vw, vh] = viewBox.split(' ').map(Number)
        return (
          <svg key={view} viewBox={viewBox} height={height} width={(height * vw) / vh} style={{ display: 'block' }}>
            {BODY_SHAPES[body][view].map((shape, i) => {
              if (shape.muscle === null) {
                return <path key={i} d={shape.d} fill="var(--mannequin-body, #2b2724)" />
              }
              const opacity = opacityFor(shape.muscle)
              return (
                <path
                  key={i}
                  d={shape.d}
                  fill={opacity === null ? 'var(--mannequin-idle, #423c36)' : 'var(--orange)'}
                  fillOpacity={opacity ?? 0.9}
                  stroke="var(--mannequin-seam, rgba(242,237,230,0.35))"
                  strokeWidth={1.5}
                >
                  <title>{t(MUSCLE_GROUP_I18N_KEYS[shape.muscle])}</title>
                </path>
              )
            })}
          </svg>
        )
      })}
    </div>
  )
}
