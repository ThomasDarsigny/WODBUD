import { useState, useRef, useEffect, useMemo, useId } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import NavIcon from '../navigation/NavIcon'
import type {
  BodyRegion,
  Exercise,
  ExerciseCategory,
  ExerciseInsert,
  ExerciseLevel,
  MovementType,
  MuscleGroup,
  TrainingMethod
} from '../../types'
import {
  BODY_REGIONS,
  BODY_REGION_I18N_KEYS,
  CATEGORY_I18N_KEYS,
  CORE_MUSCLES,
  EXERCISE_LEVELS,
  LOWER_MUSCLES,
  MOVEMENT_TYPES,
  MOVEMENT_TYPE_COLORS,
  MOVEMENT_TYPE_DESC_I18N_KEYS,
  MOVEMENT_TYPE_I18N_KEYS,
  MUSCLE_GROUP_I18N_KEYS,
  TRAINING_METHODS,
  TRAINING_METHOD_I18N_KEYS,
  UPPER_MUSCLES
} from '../../types'
import { useExerciseStore } from '../../stores/exerciseStore'
import { useDialog } from '../../hooks/useDialog'
import Field, { FieldGroup } from '../ui/Field'
import EquipmentPicker from '../center/EquipmentPicker'
import { cleanEquipment, type EquipmentId } from '../../lib/equipment'
import { matchAgainstExisting, normalizeExerciseName } from '../../lib/textSimilarity'
import { checkReference, MAX_REFERENCES, ReferenceMediaError, referenceKind, uploadReferences } from '../../lib/exerciseReferences'

interface Props {
  exercise?: Exercise
  onClose: () => void
  /** WODBUD : base commune et vidéo officielle. Sinon, exercice d'un centre. */
  isAdmin?: boolean
  /** Centre où créer l'exercice (proprio ou entraîneur chef). */
  centerId?: string
  /** « Utiliser celui-là » sur un doublon : ouvre l'exercice existant. */
  onUseExisting?: (exercise: Exercise) => void
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

export default function ExerciseFormModal({ exercise, onClose, isAdmin = false, centerId, onUseExisting }: Props) {
  // Fenêtre partagée (4.2) : Échap, retour Android, focus rendu à la fermeture.
  const titleId = useId()
  const boxRef = useRef<HTMLDivElement>(null)
  useDialog(boxRef, onClose)
  const { t } = useTranslation(['exercises', 'common'])
  const { createExercise, updateExercise, exercises } = useExerciseStore()
  const isEdit = !!exercise
  // Exercice de centre : champs exigés pour la relecture WODBUD, média de
  // référence privé, pas de vidéo officielle (WODBUD seulement).
  const asCenter = !isAdmin
  const canAttach = asCenter && (!exercise || exercise.review_status === 'pending')

  const [name, setName] = useState(exercise?.name ?? '')
  const [description, setDescription] = useState(exercise?.description ?? '')
  const [category, setCategory] = useState<ExerciseCategory>(exercise?.category ?? 'strength')
  const [primaryMuscle, setPrimaryMuscle] = useState<MuscleGroup>(exercise?.primary_muscle ?? 'chest')
  const [secondaryMuscles, setSecondaryMuscles] = useState<MuscleGroup[]>(exercise?.secondary_muscles ?? [])
  const [tertiaryMuscles, setTertiaryMuscles] = useState<MuscleGroup[]>(exercise?.tertiary_muscles ?? [])
  const [movementType, setMovementType] = useState<MovementType | null>(exercise?.movement_type ?? null)
  const [secondaryMovements, setSecondaryMovements] = useState<MovementType[]>(
    exercise?.secondary_movements ?? []
  )
  const [methods, setMethods] = useState<TrainingMethod[]>(exercise?.methods ?? [])
  const [bodyRegion, setBodyRegion] = useState<BodyRegion>(exercise?.body_region ?? 'upper')
  const [regionTouched, setRegionTouched] = useState(Boolean(exercise))
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(exercise?.video_url ?? null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [level, setLevel] = useState<ExerciseLevel | null>(exercise?.level ?? null)
  const [equipment, setEquipment] = useState<EquipmentId[]>(cleanEquipment(exercise?.equipment))
  const [refFiles, setRefFiles] = useState<File[]>([])
  const [progress, setProgress] = useState<string | null>(null)
  // Exercice déjà créé mais média pas encore envoyé : le bouton ne fait plus
  // que réessayer l'envoi.
  const [createdId, setCreatedId] = useState<string | null>(null)
  const refInput = useRef<HTMLInputElement>(null)

  // Doublons : à la création, les noms semblables déjà visibles (base
  // commune et exercices du centre) — on propose d'utiliser l'existant.
  const duplicates = useMemo(() => {
    if (isEdit || name.trim().length < 3) return []
    return exercises
      .filter((e) => matchAgainstExisting(name, [normalizeExerciseName(e.name)]) !== 'none')
      .slice(0, 3)
  }, [exercises, name, isEdit])

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
    setTertiaryMuscles((prev) => prev.filter((m) => m !== muscle))
    setSecondaryMuscles((prev) =>
      prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle]
    )
  }

  function toggleTertiary(muscle: MuscleGroup) {
    if (muscle === primaryMuscle) return
    setSecondaryMuscles((prev) => prev.filter((m) => m !== muscle))
    setTertiaryMuscles((prev) =>
      prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle]
    )
  }

  function toggleMethod(method: TrainingMethod) {
    setMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    )
  }

  function toggleSecondaryMovement(mv: MovementType) {
    if (mv === movementType) return
    setSecondaryMovements((prev) =>
      prev.includes(mv) ? prev.filter((m) => m !== mv) : [...prev, mv]
    )
  }

  // Tant que le coach n'a pas touché au sélecteur, la région suit le muscle
  // principal. Dès qu'il choisit, on ne l'écrase plus.
  function regionFromMuscle(m: MuscleGroup): BodyRegion {
    if (CORE_MUSCLES.includes(m)) return 'core'
    if (UPPER_MUSCLES.includes(m)) return 'upper'
    if (LOWER_MUSCLES.includes(m)) return 'lower'
    return 'full'
  }

  async function addReferences(list: FileList | null) {
    if (!list) return
    setError(null)
    const next = [...refFiles]
    for (const file of Array.from(list)) {
      if (next.length >= MAX_REFERENCES) break
      try {
        await checkReference(file)
        next.push(file)
      } catch (err) {
        const code = err instanceof ReferenceMediaError ? err.code : 'unreadable'
        setError(t(`form.ref_error_${code}`, { ns: 'exercises' }))
      }
    }
    setRefFiles(next)
  }

  async function sendReferences(exerciseId: string) {
    if (!refFiles.length) return
    await uploadReferences(exerciseId, refFiles, (i, phase, p) => {
      setProgress(
        phase === 'compress'
          ? t('form.ref_compressing', { ns: 'exercises', n: i + 1, total: refFiles.length, pct: Math.round(p * 100) })
          : t('form.ref_uploading', { ns: 'exercises', n: i + 1, total: refFiles.length })
      )
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (createdId) {
      setUploading(true)
      try {
        await sendReferences(createdId)
        onClose()
      } catch (err: unknown) {
        setError(t('form.ref_upload_failed', { ns: 'exercises', reason: extractErrorMessage(err, '') }))
      } finally {
        setUploading(false)
        setProgress(null)
      }
      return
    }
    if (!name.trim()) {
      setError(t('form.name_required', { ns: 'exercises' }))
      return
    }
    if (asCenter && !description.trim()) {
      setError(t('form.technique_required', { ns: 'exercises' }))
      return
    }
    if (asCenter && !level) {
      setError(t('form.level_required', { ns: 'exercises' }))
      return
    }
    if (asCenter && equipment.length === 0) {
      setError(t('form.equipment_required', { ns: 'exercises' }))
      return
    }

    setUploading(true)
    let savedId: string | null = null
    try {
      const data: ExerciseInsert = {
        name: name.trim(),
        description: description.trim(),
        category,
        body_region: bodyRegion,
        movement_type: movementType,
        secondary_movements: secondaryMovements.filter((m) => m !== movementType),
        methods,
        primary_muscle: primaryMuscle,
        secondary_muscles: secondaryMuscles.filter((m) => m !== primaryMuscle),
        tertiary_muscles: tertiaryMuscles.filter(
          (m) => m !== primaryMuscle && !secondaryMuscles.includes(m)
        ),
        video_url: videoPreview && !videoPreview.startsWith('blob:') ? videoPreview : null,
        level,
        equipment,
        ...(!isEdit && asCenter && centerId ? { center_id: centerId } : {})
      }

      if (isEdit && exercise) {
        await updateExercise(exercise.id, data, isAdmin ? videoFile ?? undefined : undefined)
        savedId = exercise.id
      } else {
        savedId = (await createExercise(data, isAdmin ? videoFile ?? undefined : undefined)).id
      }
      if (canAttach && refFiles.length) await sendReferences(savedId)
      onClose()
    } catch (err: unknown) {
      if (savedId && refFiles.length) {
        // L'exercice est enregistré ; seul le média a échoué.
        setCreatedId(savedId)
        setError(t('form.ref_upload_failed', { ns: 'exercises', reason: extractErrorMessage(err, '') }))
      } else {
        setError(extractErrorMessage(err, t('errors.generic', { ns: 'common' })))
      }
    } finally {
      setUploading(false)
      setProgress(null)
    }
  }

  const pickClass = (on: boolean, extra = '') => `wb-exf-pick${extra}${on ? ' is-on' : ''}`

  return (
    <div className="wb-modal-overlay wb-exd-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={boxRef} className="wb-exd wb-exd--form" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className="wb-exd-head wb-exd-head--center">
          <h2 id={titleId} className="wb-exd-title wb-exf-title">
            {isEdit ? t('form.edit_title', { ns: 'exercises' }) : t('form.create_title', { ns: 'exercises' })}
          </h2>
          <button type="button" onClick={onClose} className="wb-exd-close" aria-label={t('actions.close', { ns: 'common' })}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="wb-exf-form">
          <Field label={t('fields.name', { ns: 'exercises' })} required>
            <input
              className="wb-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('form.name_placeholder', { ns: 'exercises' })}
              required
            />
          </Field>
          {duplicates.length > 0 && (
            <div className="wb-exf-dupes" role="status">
              <p>{t('form.duplicates', { ns: 'exercises' })}</p>
              {duplicates.map((d) => (
                <button key={d.id} type="button" className="wb-chip" onClick={() => (onUseExisting ? onUseExisting(d) : onClose())}>
                  {t('form.use_existing', { ns: 'exercises', name: d.name })}
                </button>
              ))}
            </div>
          )}

          {asCenter && !isEdit && <p className="wb-exf-note">{t('form.center_note', { ns: 'exercises' })}</p>}

          <Field label={t('detail.tech_instructions', { ns: 'exercises' })} required={asCenter}>
            <textarea
              className="wb-input wb-support-text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('form.description_placeholder', { ns: 'exercises' })}
              rows={3}
            />
          </Field>

          <FieldGroup label={t('fields.level', { ns: 'exercises' })} required={asCenter}>
            <div className="wb-welcome-chips">
              {EXERCISE_LEVELS.map((lv) => (
                <button key={lv} type="button" className="wb-chip" aria-pressed={level === lv} onClick={() => setLevel(level === lv ? null : lv)}>
                  {t(`levels.${lv}`, { ns: 'exercises' })}
                </button>
              ))}
            </div>
          </FieldGroup>

          <FieldGroup label={t('fields.equipment', { ns: 'exercises' })} required={asCenter}>
            <EquipmentPicker value={equipment} onChange={setEquipment} forExercise />
          </FieldGroup>

          <Field label={t('fields.category', { ns: 'exercises' })}>
            <select className="wb-input" value={category} onChange={(e) => setCategory(e.target.value as ExerciseCategory)}>
              {CATEGORY_OPTIONS.map(([val, key]) => (
                <option key={val} value={val}>{t(key, { ns: 'common' })}</option>
              ))}
            </select>
          </Field>

          <FieldGroup label={t('fields.movement_type', { ns: 'exercises' })}>
            <div className="wb-exf-chips">
              {MOVEMENT_TYPES.map((mv) => {
                const selected = movementType === mv
                return (
                  <button
                    key={mv}
                    type="button"
                    title={t(MOVEMENT_TYPE_DESC_I18N_KEYS[mv], { ns: 'common' })}
                    aria-pressed={selected}
                    onClick={() => {
                      setMovementType(selected ? null : mv)
                      setSecondaryMovements((prev) => prev.filter((m) => m !== mv))
                    }}
                    className={`wb-exf-mv${selected ? ' is-on' : ''}`}
                    style={{ '--mv': MOVEMENT_TYPE_COLORS[mv] } as CSSProperties}
                  >
                    {t(MOVEMENT_TYPE_I18N_KEYS[mv], { ns: 'common' })}
                  </button>
                )
              })}
            </div>
            {movementType && (
              <div className="wb-exf-secondary">
                <p className="wb-exf-hint">{t(MOVEMENT_TYPE_DESC_I18N_KEYS[movementType], { ns: 'common' })}</p>
                <div className="wb-exf-chips wb-exf-chips--tight">
                  {MOVEMENT_TYPES.filter((mv) => mv !== movementType).map((mv) => {
                    const selected = secondaryMovements.includes(mv)
                    return (
                      <button
                        key={mv}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleSecondaryMovement(mv)}
                        className={`wb-exf-mv2${selected ? ' is-on' : ''}`}
                        style={{ '--mv': MOVEMENT_TYPE_COLORS[mv] } as CSSProperties}
                      >
                        + {t(MOVEMENT_TYPE_I18N_KEYS[mv], { ns: 'common' })}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </FieldGroup>

          <FieldGroup label={t('fields.methods', { ns: 'exercises' })}>
            <div className="wb-exf-chips">
              {TRAINING_METHODS.map((mk) => {
                const selected = methods.includes(mk)
                return (
                  <button key={mk} type="button" aria-pressed={selected} onClick={() => toggleMethod(mk)} className={pickClass(selected, ' wb-exf-pick--method')}>
                    {t(TRAINING_METHOD_I18N_KEYS[mk], { ns: 'common' })}
                  </button>
                )
              })}
            </div>
          </FieldGroup>

          <Field label={t('fields.body_region', { ns: 'exercises' })}>
            <select
              className="wb-input"
              value={bodyRegion}
              onChange={(e) => {
                setRegionTouched(true)
                setBodyRegion(e.target.value as BodyRegion)
              }}
            >
              {BODY_REGIONS.map((r) => (
                <option key={r} value={r}>{t(BODY_REGION_I18N_KEYS[r], { ns: 'common' })}</option>
              ))}
            </select>
          </Field>

          <Field label={t('fields.primary_muscle', { ns: 'exercises' })} required>
            <select
              className="wb-input"
              value={primaryMuscle}
              onChange={(e) => {
                const value = e.target.value as MuscleGroup
                setPrimaryMuscle(value)
                setSecondaryMuscles((s) => s.filter((m) => m !== value))
                setTertiaryMuscles((s) => s.filter((m) => m !== value))
                if (!regionTouched) setBodyRegion(regionFromMuscle(value))
              }}
            >
              {MUSCLE_OPTIONS.map(([val, key]) => (
                <option key={val} value={val}>{t(key, { ns: 'common' })}</option>
              ))}
            </select>
          </Field>

          <FieldGroup label={t('fields.secondary_muscles', { ns: 'exercises' })}>
            <div className="wb-exf-chips">
              {MUSCLE_OPTIONS.filter(([val]) => val !== primaryMuscle).map(([val, key]) => {
                const selected = secondaryMuscles.includes(val)
                return (
                  <button key={val} type="button" aria-pressed={selected} onClick={() => toggleSecondary(val)} className={pickClass(selected)}>
                    {t(key, { ns: 'common' })}
                  </button>
                )
              })}
            </div>
          </FieldGroup>

          <FieldGroup label={t('fields.tertiary_muscles', { ns: 'exercises' })}>
            <div className="wb-exf-chips">
              {MUSCLE_OPTIONS.filter(([val]) => val !== primaryMuscle && !secondaryMuscles.includes(val)).map(([val, key]) => {
                const selected = tertiaryMuscles.includes(val)
                return (
                  <button key={val} type="button" aria-pressed={selected} onClick={() => toggleTertiary(val)} className={pickClass(selected, ' wb-exf-pick--tertiary')}>
                    {t(key, { ns: 'common' })}
                  </button>
                )
              })}
            </div>
          </FieldGroup>

          {canAttach && (
            <FieldGroup label={t('form.ref_title', { ns: 'exercises' })}>
              <p className="wb-exf-hint">{t('form.ref_hint', { ns: 'exercises' })}</p>
              {refFiles.length > 0 && (
                <ul className="wb-exf-refs">
                  {refFiles.map((f, i) => (
                    <li key={`${f.name}-${i}`}>
                      <NavIcon name={referenceKind(f) === 'video' ? 'video' : 'exercises'} size={18} />
                      <span>{f.name}</span>
                      <small>{(f.size / 1024 / 1024).toFixed(1)} Mo</small>
                      <button type="button" aria-label={`${t('actions.delete', { ns: 'common' })} — ${f.name}`} onClick={() => setRefFiles((l) => l.filter((_, j) => j !== i))}>✕</button>
                    </li>
                  ))}
                </ul>
              )}
              {refFiles.length < MAX_REFERENCES && !createdId && (
                <button type="button" className="wb-btn wb-btn--secondary wb-exf-start" onClick={() => refInput.current?.click()}>
                  + {t('form.ref_add', { ns: 'exercises' })}
                </button>
              )}
              <input
                ref={refInput}
                type="file"
                accept="image/*,video/*"
                multiple
                hidden
                onChange={(e) => { void addReferences(e.target.files); e.target.value = '' }}
              />
            </FieldGroup>
          )}

          {isAdmin && (
            <FieldGroup label={t('fields.video', { ns: 'exercises' })}>
              <div
                role="button"
                tabIndex={0}
                className="wb-exf-drop"
                aria-label={videoPreview ? t('form.video_replace', { ns: 'exercises' }) : t('form.video_dropzone', { ns: 'exercises' })}
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    videoRef.current?.click()
                  }
                }}
              >
                {videoPreview ? (
                  <div>
                    <video src={videoPreview} controls className="wb-exf-preview" />
                    <p className="wb-exf-hint">{t('form.video_replace', { ns: 'exercises' })}</p>
                  </div>
                ) : (
                  <div>
                    <div className="wb-exf-drop-icon"><NavIcon name="video" size={30} /></div>
                    <p className="wb-exf-drop-title">{t('form.video_dropzone', { ns: 'exercises' })}</p>
                    <p className="wb-exf-hint">{t('form.video_requirements', { ns: 'exercises' })}</p>
                  </div>
                )}
                <input
                  ref={videoRef}
                  type="file"
                  accept="video/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleVideoSelect(f)
                  }}
                />
              </div>
            </FieldGroup>
          )}

          {progress && <p className="wb-exf-progress" role="status">{progress}</p>}

          {error && <div className="wb-exf-error" role="alert">{error}</div>}

          <div className="wb-form-actions">
            <button type="button" onClick={onClose} className="wb-btn wb-btn--ghost">
              {t('actions.cancel', { ns: 'common' })}
            </button>
            <button type="submit" disabled={uploading} className="wb-btn wb-btn--primary wb-exf-submit">
              {uploading
                ? t('form.saving', { ns: 'exercises' })
                : createdId
                  ? t('form.ref_retry', { ns: 'exercises' })
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
