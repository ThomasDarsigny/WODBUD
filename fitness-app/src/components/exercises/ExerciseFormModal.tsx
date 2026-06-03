import { useState, useRef, useEffect } from 'react'
import type { CSSProperties, FormEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Exercise, ExerciseCategory, ExerciseInsert, MuscleGroup } from '../../types'
import { CATEGORY_I18N_KEYS, MUSCLE_GROUP_I18N_KEYS } from '../../types'
import { useExerciseStore } from '../../stores/exerciseStore'

interface Props {
  exercise?: Exercise
  onClose: () => void
}

const MUSCLE_OPTIONS = Object.entries(MUSCLE_GROUP_I18N_KEYS) as [MuscleGroup, string][]
const CATEGORY_OPTIONS = Object.entries(CATEGORY_I18N_KEYS) as [ExerciseCategory, string][]

function extractErrorMessage(err: unknown, fallbackMessage: string): string {
  if (err instanceof Error && err.message) return err.message

  if (typeof err === 'object' && err !== null) {
    const maybeError = err as Record<string, unknown>
    const candidates = [
      maybeError.message,
      maybeError.error,
      maybeError.error_description,
      maybeError.details,
      maybeError.hint
    ]

    for (const value of candidates) {
      if (typeof value === 'string' && value.trim().length > 0) {
        return value
      }
    }
  }

  return fallbackMessage
}

export default function ExerciseFormModal({ exercise, onClose }: Props) {
  const { t } = useTranslation(['exercises', 'common'])
  const { createExercise, updateExercise } = useExerciseStore()
  const isEdit = !!exercise

  const [name, setName] = useState(exercise?.name ?? '')
  const [description, setDescription] = useState(exercise?.description ?? '')
  const [category, setCategory] = useState<ExerciseCategory>(exercise?.category ?? 'strength')
  const [primaryMuscle, setPrimaryMuscle] = useState<MuscleGroup>(exercise?.primary_muscle ?? 'chest')
  const [secondaryMuscles, setSecondaryMuscles] = useState<MuscleGroup[]>(exercise?.secondary_muscles ?? [])
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(exercise?.video_url ?? null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const videoRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef(false)

  useEffect(() => {
    return () => {
      if (videoFile && videoPreview?.startsWith('blob:')) URL.revokeObjectURL(videoPreview)
    }
  }, [videoFile, videoPreview])

  function handleVideoSelect(file: File) {
    if (!file.type.startsWith('video/')) {
      setError(t('form.video_required_error', { ns: 'exercises' }))
      return
    }
    if (file.size > 200 * 1024 * 1024) {
      setError(t('form.video_size_error', { ns: 'exercises' }))
      return
    }
    const url = URL.createObjectURL(file)
    setVideoFile(file)
    setVideoPreview(url)
    setError(null)
  }

  function toggleSecondary(muscle: MuscleGroup) {
    if (muscle === primaryMuscle) return
    setSecondaryMuscles((prev) =>
      prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle]
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError(t('form.name_required', { ns: 'exercises' }))
      return
    }

    setUploading(true)
    try {
      const data: ExerciseInsert = {
        name: name.trim(),
        description: description.trim(),
        category,
        primary_muscle: primaryMuscle,
        secondary_muscles: secondaryMuscles.filter((m) => m !== primaryMuscle),
        video_url: videoPreview && !videoPreview.startsWith('blob:') ? videoPreview : null
      }

      if (isEdit && exercise) {
        await updateExercise(exercise.id, data, videoFile ?? undefined)
      } else {
        await createExercise(data, videoFile ?? undefined)
      }
      onClose()
    } catch (err: unknown) {
      setError(extractErrorMessage(err, t('errors.generic', { ns: 'common' })))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.8)',
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
          maxWidth: 680,
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative'
        }}
      >
        <div
          style={{
            padding: '1.5rem 2rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-d)',
              fontSize: '1.4rem',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.08em'
            }}
          >
            {isEdit ? t('form.edit_title', { ns: 'exercises' }) : t('form.create_title', { ns: 'exercises' })}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: '1.25rem',
              lineHeight: 1
            }}
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            padding: '1.5rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}
        >
          <Field label={`${t('fields.name', { ns: 'exercises' })} *`}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('form.name_placeholder', { ns: 'exercises' })}
              required
              style={inputStyle}
            />
          </Field>

          <Field label={t('fields.instructions', { ns: 'exercises' })}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('form.description_placeholder', { ns: 'exercises' })}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-b)' }}
            />
          </Field>

          <Field label={t('fields.category', { ns: 'exercises' })}>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExerciseCategory)}
              style={inputStyle}
            >
              {CATEGORY_OPTIONS.map(([val, key]) => (
                <option key={val} value={val}>
                  {t(key, { ns: 'common' })}
                </option>
              ))}
            </select>
          </Field>

          <Field label={`${t('fields.primary_muscle', { ns: 'exercises' })} *`}>
            <select
              value={primaryMuscle}
              onChange={(e) => {
                const value = e.target.value as MuscleGroup
                setPrimaryMuscle(value)
                setSecondaryMuscles((s) => s.filter((m) => m !== value))
              }}
              style={inputStyle}
            >
              {MUSCLE_OPTIONS.map(([val, key]) => (
                <option key={val} value={val}>
                  {t(key, { ns: 'common' })}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t('fields.secondary_muscles', { ns: 'exercises' })}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {MUSCLE_OPTIONS.filter(([val]) => val !== primaryMuscle).map(([val, key]) => {
                const selected = secondaryMuscles.includes(val)
                return (
                  <button
                    key={val}
                    type='button'
                    onClick={() => toggleSecondary(val)}
                    style={{
                      fontFamily: 'var(--font-d)',
                      fontSize: '0.72rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      padding: '0.3rem 0.7rem',
                      border: `1px solid ${selected ? 'var(--orange)' : 'var(--border)'}`,
                      background: selected ? 'rgba(255,77,0,0.12)' : 'transparent',
                      color: selected ? 'var(--orange)' : 'var(--muted)',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {t(key, { ns: 'common' })}
                  </button>
                )
              })}
            </div>
          </Field>

          <Field label={t('fields.video', { ns: 'exercises' })}>
            <div
              onDragOver={(e) => {
                e.preventDefault()
                dragRef.current = true
              }}
              onDragLeave={() => {
                dragRef.current = false
              }}
              onDrop={(e) => {
                e.preventDefault()
                const f = e.dataTransfer.files[0]
                if (f) handleVideoSelect(f)
              }}
              onClick={() => videoRef.current?.click()}
              style={{
                border: '1px dashed var(--border)',
                padding: '1.5rem',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'border-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--orange)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
              }}
            >
              {videoPreview ? (
                <div>
                  <video
                    src={videoPreview}
                    controls
                    style={{ maxWidth: '100%', maxHeight: 200, marginBottom: '0.75rem' }}
                  />
                  <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                    {t('form.video_replace', { ns: 'exercises' })}
                  </p>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>VID</div>
                  <p
                    style={{
                      fontFamily: 'var(--font-d)',
                      fontSize: '0.85rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--muted)'
                    }}
                  >
                    {t('form.video_dropzone', { ns: 'exercises' })}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.4rem' }}>
                    {t('form.video_requirements', { ns: 'exercises' })}
                  </p>
                </div>
              )}
              <input
                ref={videoRef}
                type='file'
                accept='video/*'
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleVideoSelect(f)
                }}
              />
            </div>
          </Field>

          {error && (
            <div
              style={{
                background: 'rgba(255,77,0,0.1)',
                border: '1px solid rgba(255,77,0,0.3)',
                padding: '0.75rem 1rem',
                color: 'var(--orange)',
                fontSize: '0.85rem'
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end',
              paddingTop: '0.5rem'
            }}
          >
            <button
              type='button'
              onClick={onClose}
              style={{
                ...btnStyle,
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--muted)'
              }}
            >
              {t('actions.cancel', { ns: 'common' })}
            </button>
            <button
              type='submit'
              disabled={uploading}
              style={{
                ...btnStyle,
                background: uploading ? 'var(--border)' : 'var(--orange)',
                color: 'var(--black)',
                cursor: uploading ? 'wait' : 'pointer'
              }}
            >
              {uploading
                ? t('form.saving', { ns: 'exercises' })
                : isEdit
                  ? t('form.save_edit', { ns: 'exercises' })
                  : t('form.save_new', { ns: 'exercises' })}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <label
        style={{
          fontFamily: 'var(--font-d)',
          fontSize: '0.75rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--muted)'
        }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: CSSProperties = {
  background: 'var(--black)',
  border: '1px solid var(--border)',
  color: 'var(--white)',
  padding: '0.6rem 0.9rem',
  fontFamily: 'var(--font-b)',
  fontSize: '0.9rem',
  width: '100%',
  outline: 'none'
}

const btnStyle: CSSProperties = {
  fontFamily: 'var(--font-d)',
  fontWeight: 700,
  fontSize: '0.88rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  padding: '0.65rem 1.5rem',
  border: 'none',
  cursor: 'pointer',
  transition: 'opacity 0.15s'
}
