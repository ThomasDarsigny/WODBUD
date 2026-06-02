import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { Exercise } from '../../types'
import { CATEGORY_I18N_KEYS, MUSCLE_GROUP_I18N_KEYS } from '../../types'

interface Props {
  exercise: Exercise
  onClose: () => void
  onAddToWorkout?: (exercise: Exercise) => Promise<boolean> | boolean
  onEdit?: (exercise: Exercise) => void
  onDelete?: (exercise: Exercise) => void
  inWorkoutBuilder?: boolean
}

export default function ExerciseDetailModal({
  exercise,
  onClose,
  onAddToWorkout,
  onEdit,
  onDelete,
  inWorkoutBuilder = false
}: Props) {
  const { t } = useTranslation(['exercises', 'common'])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(4px)'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          background: 'var(--dark)',
          border: '1px solid var(--border)',
          width: '100%',
          maxWidth: 620,
          maxHeight: '90vh',
          overflow: 'auto'
        }}
      >
        <div
          style={{
            padding: '1.5rem 2rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '1rem'
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--font-d)',
                fontSize: '0.7rem',
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color: 'var(--orange)',
                marginBottom: '0.35rem'
              }}
            >
              {t(CATEGORY_I18N_KEYS[exercise.category], { ns: 'common' })}
            </div>
            <h2
              style={{
                fontFamily: 'var(--font-d)',
                fontSize: '1.75rem',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                lineHeight: 1
              }}
            >
              {exercise.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: '1.2rem',
              flexShrink: 0,
              lineHeight: 1
            }}
          >
            ✕
          </button>
        </div>

        {exercise.video_url ? (
          <video
            src={exercise.video_url}
            controls
            style={{ width: '100%', maxHeight: 320, background: '#000', display: 'block' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: 180,
              background: 'var(--black)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: '0.5rem'
            }}
          >
            <span style={{ fontSize: '2.5rem', opacity: 0.2 }}>🎥</span>
            <p
              style={{
                fontFamily: 'var(--font-d)',
                fontSize: '0.75rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--muted)'
              }}
            >
              {t('detail.no_video', { ns: 'exercises' })}
            </p>
          </div>
        )}

        <div
          style={{
            padding: '1.5rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}
        >
          <div>
            <p style={labelStyle}>{t('detail.muscles_targeted', { ns: 'exercises' })}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
              <span
                style={{
                  ...tagStyle,
                  background: 'rgba(255,77,0,0.15)',
                  color: 'var(--orange)',
                  border: '1px solid rgba(255,77,0,0.35)'
                }}
              >
                ● {t(MUSCLE_GROUP_I18N_KEYS[exercise.primary_muscle], { ns: 'common' })}
              </span>
              {exercise.secondary_muscles.map((m) => (
                <span
                  key={m}
                  style={{ ...tagStyle, color: 'var(--muted)', border: '1px solid var(--border)' }}
                >
                  {t(MUSCLE_GROUP_I18N_KEYS[m], { ns: 'common' })}
                </span>
              ))}
            </div>
          </div>

          {exercise.description && (
            <div>
              <p style={labelStyle}>{t('detail.tech_instructions', { ns: 'exercises' })}</p>
              <p
                style={{
                  fontSize: '0.92rem',
                  color: 'var(--muted)',
                  lineHeight: 1.75,
                  marginTop: '0.4rem'
                }}
              >
                {exercise.description}
              </p>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap',
              paddingTop: '0.5rem',
              borderTop: '1px solid var(--border)'
            }}
          >
            {inWorkoutBuilder && onAddToWorkout && (
              <button
                onClick={async () => {
                  const added = await onAddToWorkout(exercise)
                  if (added !== false) onClose()
                }}
                style={{ ...btnStyle, background: 'var(--orange)', color: 'var(--black)', flex: 1 }}
              >
                + {t('detail.add_to_workout', { ns: 'exercises' })}
              </button>
            )}
            {!inWorkoutBuilder && (
              <>
                {onEdit && (
                  <button
                    onClick={() => {
                      onEdit(exercise)
                      onClose()
                    }}
                    style={{
                      ...btnStyle,
                      border: '1px solid var(--border)',
                      color: 'var(--white)',
                      background: 'transparent'
                    }}
                  >
                    {t('actions.edit', { ns: 'common' })}
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          t('detail.delete_confirm', { ns: 'exercises', name: exercise.name })
                        )
                      ) {
                        onDelete(exercise)
                        onClose()
                      }
                    }}
                    style={{
                      ...btnStyle,
                      border: '1px solid rgba(255,60,60,0.3)',
                      color: '#ff5555',
                      background: 'transparent'
                    }}
                  >
                    {t('actions.delete', { ns: 'common' })}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-d)',
  fontSize: '0.7rem',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--muted)'
}

const tagStyle: CSSProperties = {
  fontFamily: 'var(--font-d)',
  fontSize: '0.72rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  padding: '0.25rem 0.6rem'
}

const btnStyle: CSSProperties = {
  fontFamily: 'var(--font-d)',
  fontWeight: 700,
  fontSize: '0.85rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  padding: '0.65rem 1.25rem',
  border: 'none',
  cursor: 'pointer',
  transition: 'opacity 0.15s'
}
