import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import NavIcon from '../navigation/NavIcon'
import type { Exercise } from '../../types'
import { CATEGORY_I18N_KEYS, MUSCLE_GROUP_I18N_KEYS } from '../../types'
import { useDialog } from '../../hooks/useDialog'
import ExerciseLinksEditor from './ExerciseLinksEditor'

interface Props {
  exercise: Exercise
  onClose: () => void
  onAddToWorkout?: (exercise: Exercise) => Promise<boolean> | boolean
  onEdit?: (exercise: Exercise) => void
  onDelete?: (exercise: Exercise) => Promise<void> | void
  inWorkoutBuilder?: boolean
  /** Portée des liens modifiables : null = WODBUD, un id = ce centre ; absent = pas de modification. */
  linkScope?: string | null
  /** Ouvre la fiche d'une variante liée. */
  onOpenExercise?: (exercise: Exercise) => void
}

export default function ExerciseDetailModal({
  exercise,
  onClose,
  onAddToWorkout,
  onEdit,
  onDelete,
  inWorkoutBuilder = false,
  linkScope,
  onOpenExercise
}: Props) {
  const { t } = useTranslation(['exercises', 'common'])
  // Fenêtre partagée (4.2) : Échap, retour Android, focus rendu à la fermeture.
  const titleId = useId()
  const boxRef = useRef<HTMLDivElement>(null)
  useDialog(boxRef, onClose)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDeleteConfirm() {
    if (!onDelete || deleting) return

    setDeleting(true)
    try {
      await onDelete(exercise)
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="wb-modal-overlay wb-exd-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={boxRef} className="wb-exd" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className="wb-exd-head">
          <div>
            <p className="wb-exd-cat">{t(CATEGORY_I18N_KEYS[exercise.category], { ns: 'common' })}</p>
            <h2 id={titleId} className="wb-exd-title">{exercise.name}</h2>
          </div>
          <button type="button" onClick={onClose} className="wb-exd-close" aria-label={t('actions.close', { ns: 'common' })}>✕</button>
        </div>

        {exercise.video_url ? (
          <video src={exercise.video_url} controls className="wb-exd-video" />
        ) : (
          <div className="wb-exd-novideo">
            <span aria-hidden="true"><NavIcon name="video" size={38} /></span>
            <p>{t('detail.no_video', { ns: 'exercises' })}</p>
          </div>
        )}

        <div className="wb-exd-body">
          <div>
            <p className="wb-exd-label">{t('detail.muscles_targeted', { ns: 'exercises' })}</p>
            <div className="wb-exd-tags">
              <span className="wb-exd-tag wb-exd-tag--primary">● {t(MUSCLE_GROUP_I18N_KEYS[exercise.primary_muscle], { ns: 'common' })}</span>
              {exercise.secondary_muscles.map((m) => (
                <span key={m} className="wb-exd-tag">{t(MUSCLE_GROUP_I18N_KEYS[m], { ns: 'common' })}</span>
              ))}
            </div>
          </div>

          {(exercise.level || (exercise.equipment?.length ?? 0) > 0) && (
            <div className="wb-ex-facts">
              {exercise.level && (
                <div>
                  <p className="wb-exd-label">{t('fields.level', { ns: 'exercises' })}</p>
                  <span className="wb-pill wb-pill--orange">{t(`levels.${exercise.level}`, { ns: 'exercises' })}</span>
                </div>
              )}
              {(exercise.equipment?.length ?? 0) > 0 && (
                <div>
                  <p className="wb-exd-label">{t('fields.equipment', { ns: 'exercises' })}</p>
                  <div className="wb-ex-equip">
                    {exercise.equipment!.map((e) => (
                      <span key={e} className="wb-pill">{t(`equipment.items.${e}`, { ns: 'common' })}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {exercise.description && (
            <div>
              <p className="wb-exd-label">{t('detail.tech_instructions', { ns: 'exercises' })}</p>
              <p className="wb-exd-desc">{exercise.description}</p>
            </div>
          )}

          <ExerciseLinksEditor key={exercise.id} exercise={exercise} scope={inWorkoutBuilder ? undefined : linkScope} onOpen={onOpenExercise} />

          <div className="wb-exd-actions">
            {inWorkoutBuilder && onAddToWorkout && (
              <button
                type="button"
                onClick={async () => {
                  const added = await onAddToWorkout(exercise)
                  if (added !== false) onClose()
                }}
                className="wb-btn wb-btn--primary wb-exd-add"
              >
                + {t('detail.add_to_workout', { ns: 'exercises' })}
              </button>
            )}
            {!inWorkoutBuilder && (
              <>
                {onEdit && (
                  <button type="button" onClick={() => { onEdit(exercise); onClose() }} className="wb-btn wb-btn--ghost">
                    {t('actions.edit', { ns: 'common' })}
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm((prev) => !prev)}
                    aria-expanded={showDeleteConfirm}
                    className={`wb-btn wb-btn--danger${showDeleteConfirm ? ' is-on' : ''}`}
                  >
                    {t('actions.delete', { ns: 'common' })}
                  </button>
                )}
              </>
            )}
          </div>

          {onDelete && showDeleteConfirm && (
            <div className="wb-exd-confirm" role="alert">
              <p className="wb-exd-confirm-title">{t('detail.delete_confirm_title', { ns: 'exercises' })}</p>
              <p className="wb-exd-confirm-text">{t('detail.delete_confirm_text', { ns: 'exercises', name: exercise.name })}</p>
              <div className="wb-exd-confirm-actions">
                <button type="button" onClick={() => setShowDeleteConfirm(false)} disabled={deleting} className="wb-btn wb-btn--ghost wb-btn--sm">
                  {t('actions.cancel', { ns: 'common' })}
                </button>
                <button type="button" onClick={handleDeleteConfirm} disabled={deleting} className="wb-btn wb-btn--destructive wb-btn--sm">
                  {deleting ? t('detail.deleting', { ns: 'exercises' }) : t('detail.delete_confirm_action', { ns: 'exercises' })}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
