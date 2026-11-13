import { useTranslation } from 'react-i18next'
import NavIcon from '../navigation/NavIcon'
import type { Exercise } from '../../types'
import { MUSCLE_GROUP_I18N_KEYS } from '../../types'
import type { EquipmentId } from '../../lib/equipment'

/**
 * Une ligne de la bibliothèque du créateur. Deux gestes distincts :
 * toucher le nom ouvre la fiche (vidéo, muscles, variantes) ; le « + »
 * ajoute directement l'exercice au WOD, sans détour par la fiche.
 * Un exercice déjà dans le WOD reste ajoutable (Murph court deux fois).
 */
export default function PickerExerciseRow({ exercise, count, missing, onOpen, onAdd, adding }: {
  exercise: Exercise
  /** Nombre de fois où l'exercice est déjà dans le WOD. */
  count: number
  /** Équipement requis absent du centre (ou de la maison). */
  missing: EquipmentId[]
  onOpen: () => void
  onAdd: () => void
  adding: boolean
}) {
  const { t } = useTranslation(['workouts', 'common'])
  return (
    <div className={`wb-pick${count > 0 ? ' is-in' : ''}`}>
      <button type="button" className="wb-pick-open" onClick={onOpen}>
        <span className="wb-pick-thumb" aria-hidden="true">
          {exercise.video_url
            ? <video src={exercise.video_url} muted preload="metadata" />
            : <NavIcon name="video" size={16} />}
        </span>
        <span className="wb-pick-main">
          <strong>{exercise.name}</strong>
          <span className="wb-pick-muscle">{t(MUSCLE_GROUP_I18N_KEYS[exercise.primary_muscle], { ns: 'common' })}</span>
          {missing.length > 0 && (
            <span className="wb-missing-equip">
              {t('builder.missing_equipment', { list: missing.map((m) => t(`equipment.items.${m}`, { ns: 'common' })).join(', ') })}
            </span>
          )}
        </span>
        {count > 0 && <span className="wb-pick-count">✓{count > 1 ? ` ×${count}` : ''}</span>}
      </button>
      <button
        type="button"
        className="wb-pick-add"
        // aria-disabled plutôt que disabled : un bouton désactivé perd le focus,
        // et le clavier perdrait sa place dans la liste (l'ajout ignore un 2e clic).
        onClick={() => { if (!adding) onAdd() }}
        aria-disabled={adding || undefined}
        aria-label={t('builder.add_named', { name: exercise.name })}
      >
        +
      </button>
    </div>
  )
}
