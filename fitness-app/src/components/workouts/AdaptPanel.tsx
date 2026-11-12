import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useExerciseStore } from '../../stores/exerciseStore'
import { fetchVariants, ZONES, type Variant, type Zone } from '../../lib/exerciseLinks'
import type { Exercise, WorkoutExercise } from '../../types'

/**
 * « À adapter » (point 5.6) : on choisit la zone qui fait mal et on reçoit
 * les adaptations reliées par WODBUD ou le centre pour cette zone. Sans
 * adaptation reliée, on le dit, sans rien deviner : un exercice « du même
 * muscle » solliciterait souvent la même zone (genou → squat, fente…).
 */
export default function AdaptPanel({ workoutExercise: we, onReplace, onClose }: {
  workoutExercise: WorkoutExercise
  onReplace: (exercise: Exercise) => void
  onClose: () => void
}) {
  const { t } = useTranslation(['workouts', 'exercises', 'common'])
  const { exercises } = useExerciseStore()
  const [zone, setZone] = useState<Zone | null>(null)
  const [variants, setVariants] = useState<Variant[] | null>(null)

  useEffect(() => {
    let alive = true
    fetchVariants(we.exercise.id)
      .then((v) => { if (alive) setVariants(v.filter((x) => x.kind === 'adaptation')) })
      .catch(() => { if (alive) setVariants([]) })
    return () => { alive = false }
  }, [we.exercise.id])

  const linked = useMemo(() => {
    if (!zone || !variants) return []
    const ids = variants.filter((v) => v.zone === zone).map((v) => v.exerciseId)
    return exercises.filter((e) => ids.includes(e.id))
  }, [zone, variants, exercises])

  // Zones pour lesquelles une adaptation existe : on les signale d'un point.
  const zonesWithLinks = new Set((variants ?? []).map((v) => v.zone))

  return (
    <div className="wb-tooeasy wb-adapt" role="group" aria-label={t('progression.adapt')}>
      <div className="wb-tooeasy-head">
        <strong>{t('progression.adapt')}</strong>
        <button type="button" className="wb-tooeasy-close" onClick={onClose} aria-label={t('actions.close', { ns: 'common' })}>✕</button>
      </div>
      <p className="wb-set-hint">{t('progression.which_zone')}</p>
      <div className="wb-links-chips" role="group" aria-label={t('links.zone', { ns: 'exercises' })}>
        {ZONES.map((z) => (
          <button key={z} type="button" className="wb-chip" aria-pressed={zone === z} onClick={() => setZone(z)}>
            {t(`links.zones.${z}`, { ns: 'exercises' })}{zonesWithLinks.has(z) ? ' •' : ''}
          </button>
        ))}
      </div>

      {zone && variants !== null && (
        linked.length > 0 ? (
          linked.map((e) => (
            <button key={e.id} type="button" className="wb-tooeasy-opt" onClick={() => onReplace(e)}>
              <span>{t('progression.replace', { name: e.name })}</span>
              <span className="wb-tooeasy-tag wb-adapt-tag">{t(`links.zones.${zone}`, { ns: 'exercises' })}</span>
            </button>
          ))
        ) : (
          <p className="wb-set-hint">{t('progression.no_adaptation', { zone: t(`links.zones.${zone}`, { ns: 'exercises' }).toLowerCase() })}</p>
        )
      )}
    </div>
  )
}
