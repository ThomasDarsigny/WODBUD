import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useExerciseStore } from '../../stores/exerciseStore'
import { fetchVariants } from '../../lib/exerciseLinks'
import { bumpLoadText, progressionRate } from '../../lib/progression'
import { readUnit } from '../../lib/records'
import type { Exercise, WorkoutExercise } from '../../types'

/**
 * « Trop facile » (point 5.5) : propose la charge suivante (+5 % haut du
 * corps, +10 % bas du corps, arrondie aux disques) et les variantes plus
 * dures reliées. Remplacer garde séries, répétitions, repos et notes.
 */
export default function TooEasyPanel({ workoutExercise: we, onLoad, onReplace, onClose }: {
  workoutExercise: WorkoutExercise
  onLoad: (weight: string) => void
  onReplace: (exercise: Exercise) => void
  onClose: () => void
}) {
  const { t } = useTranslation('workouts')
  const { exercises } = useExerciseStore()
  const [harder, setHarder] = useState<Exercise[] | null>(null)
  const nextWeight = bumpLoadText(we.weight, we.exercise, readUnit())

  useEffect(() => {
    let alive = true
    fetchVariants(we.exercise.id)
      .then((v) => {
        if (!alive) return
        const ids = v.filter((x) => x.kind === 'harder').map((x) => x.exerciseId)
        setHarder(exercises.filter((e) => ids.includes(e.id)))
      })
      .catch(() => { if (alive) setHarder([]) })
    return () => { alive = false }
  }, [we.exercise.id, exercises])

  return (
    <div className="wb-tooeasy" role="group" aria-label={t('progression.too_easy')}>
      <div className="wb-tooeasy-head">
        <strong>{t('progression.too_easy')}</strong>
        <button type="button" className="wb-tooeasy-close" onClick={onClose} aria-label={t('actions.close', { ns: 'common' })}>✕</button>
      </div>

      {nextWeight ? (
        <button type="button" className="wb-tooeasy-opt" onClick={() => onLoad(nextWeight)}>
          <span>{t('progression.load', { from: we.weight?.trim(), to: nextWeight })}</span>
          <span className="wb-tooeasy-tag">+{Math.round(progressionRate(we.exercise) * 100)}&nbsp;%</span>
        </button>
      ) : (
        <p className="wb-set-hint">{t('progression.no_load')}</p>
      )}

      {harder === null ? null : harder.length > 0 ? (
        harder.map((e) => (
          <button key={e.id} type="button" className="wb-tooeasy-opt" onClick={() => onReplace(e)}>
            <span>{t('progression.replace', { name: e.name })}</span>
            <span className="wb-tooeasy-tag">{t('progression.harder')}</span>
          </button>
        ))
      ) : (
        <p className="wb-set-hint">{t('progression.no_variant')}</p>
      )}
    </div>
  )
}
