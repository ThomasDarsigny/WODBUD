import { useState, useEffect } from 'react'
import type { CSSProperties } from 'react'
import { useExerciseStore } from '../../stores/exerciseStore'
import { useWorkoutStore } from '../../stores/workoutStore'
import type { Exercise, WorkoutExercise, MuscleAlert, WorkoutMethod } from '../../types'
import { METHOD_LABELS, MUSCLE_GROUP_LABELS } from '../../types'
import ExerciseDetailModal from '../exercises/ExerciseDetailModal'

export default function WorkoutBuilderView() {
  const { exercises, fetchExercises } = useExerciseStore()
  const {
    name,
    method,
    durationMinutes,
    notes,
    exercises: workoutExercises,
    muscleAlerts,
    setName,
    setMethod,
    setDuration,
    setNotes,
    addExercise,
    removeExercise,
    updateExerciseConfig,
    saveWorkout,
    resetDraft,
    loadingSave,
    error
  } = useWorkoutStore()

  const [search, setSearch] = useState('')
  const [pickerExercise, setPickerExercise] = useState<Exercise | undefined>()
  const [savedSuccess, setSavedSuccess] = useState(false)

  useEffect(() => {
    if (exercises.length === 0) fetchExercises()
  }, [exercises.length, fetchExercises])

  const filteredExercises = exercises.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      MUSCLE_GROUP_LABELS[e.primary_muscle].toLowerCase().includes(search.toLowerCase())
  )

  async function handleSave() {
    try {
      await saveWorkout()
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 3000)
    } catch {
      // handled by store error state
    }
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 380px',
        height: '100vh',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            padding: '1.75rem 2rem',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-d)',
              fontSize: '0.7rem',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: 'var(--orange)',
              marginBottom: '0.35rem'
            }}
          >
            Bibliotheque
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-d)',
              fontSize: '1.6rem',
              fontWeight: 900,
              textTransform: 'uppercase',
              marginBottom: '1rem'
            }}
          >
            Choisir un exercice
          </h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Rechercher...'
            style={{
              width: '100%',
              background: 'var(--black)',
              border: '1px solid var(--border)',
              color: 'var(--white)',
              padding: '0.6rem 0.9rem',
              fontFamily: 'var(--font-b)',
              fontSize: '0.9rem',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
          {filteredExercises.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '3rem',
                color: 'var(--muted)',
                fontFamily: 'var(--font-d)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontSize: '0.85rem'
              }}
            >
              Aucun resultat
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {filteredExercises.map((exercise) => (
                <PickerExerciseRow
                  key={exercise.id}
                  exercise={exercise}
                  onClick={() => setPickerExercise(exercise)}
                  alreadyAdded={workoutExercises.some((we) => we.exercise.id === exercise.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--dark)'
        }}
      >
        <div
          style={{
            padding: '1.75rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-d)',
              fontSize: '0.7rem',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: 'var(--orange)',
              marginBottom: '0.35rem'
            }}
          >
            Entrainement
          </p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='Nom de la seance...'
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--border)',
              color: 'var(--white)',
              padding: '0.3rem 0',
              fontFamily: 'var(--font-d)',
              fontSize: '1.4rem',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              outline: 'none',
              marginBottom: '1rem'
            }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div>
              <label style={smallLabelStyle}>Methode</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as WorkoutMethod)}
                style={selectStyle}
              >
                {Object.entries(METHOD_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={smallLabelStyle}>Duree (min)</label>
              <input
                type='number'
                value={durationMinutes ?? ''}
                onChange={(e) =>
                  setDuration(e.target.value ? Number.parseInt(e.target.value, 10) : undefined)
                }
                placeholder='20'
                min={1}
                style={{ ...selectStyle, fontFamily: 'var(--font-b)' }}
              />
            </div>
          </div>
        </div>

        {muscleAlerts.length > 0 && (
          <div
            style={{
              padding: '0.75rem 1.5rem',
              borderBottom: '1px solid var(--border)',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem'
            }}
          >
            {muscleAlerts.map((alert) => (
              <MuscleAlertBadge key={alert.muscle} alert={alert} />
            ))}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem' }}>
          {workoutExercises.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.3 }}>⚡</div>
              <p
                style={{
                  fontFamily: 'var(--font-d)',
                  fontSize: '0.82rem',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase'
                }}
              >
                Clique sur un exercice pour l'ajouter
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {workoutExercises.map((we) => (
                <WorkoutExerciseSlot
                  key={we.id}
                  workoutExercise={we}
                  alert={muscleAlerts.find((a) => a.muscle === we.exercise.primary_muscle)}
                  onRemove={() => removeExercise(we.id)}
                  onUpdate={(config) => updateExerciseConfig(we.id, config)}
                />
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder='Notes, instructions pour le groupe...'
            rows={2}
            style={{
              width: '100%',
              background: 'var(--black)',
              border: '1px solid var(--border)',
              color: 'var(--muted)',
              padding: '0.6rem 0.75rem',
              fontFamily: 'var(--font-b)',
              fontSize: '0.82rem',
              outline: 'none',
              resize: 'none'
            }}
          />
        </div>

        <div
          style={{
            padding: '0.75rem 1rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: '0.5rem',
            flexShrink: 0
          }}
        >
          <button
            onClick={resetDraft}
            style={{
              fontFamily: 'var(--font-d)',
              fontWeight: 700,
              fontSize: '0.8rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '0.6rem 1rem',
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--muted)',
              cursor: 'pointer'
            }}
          >
            Reinitialiser
          </button>
          <button
            onClick={handleSave}
            disabled={loadingSave || workoutExercises.length === 0 || !name.trim()}
            style={{
              flex: 1,
              fontFamily: 'var(--font-d)',
              fontWeight: 700,
              fontSize: '0.88rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '0.65rem 1rem',
              background: savedSuccess
                ? '#22c55e'
                : loadingSave || workoutExercises.length === 0 || !name.trim()
                  ? 'var(--border)'
                  : 'var(--orange)',
              color: 'var(--black)',
              border: 'none',
              cursor: loadingSave ? 'wait' : 'pointer',
              transition: 'background 0.2s'
            }}
          >
            {savedSuccess
              ? '✓ Enregistre !'
              : loadingSave
                ? 'Enregistrement...'
                : 'Sauvegarder la seance'}
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '0.5rem 1rem',
              background: 'rgba(255,77,0,0.1)',
              borderTop: '1px solid rgba(255,77,0,0.2)',
              color: 'var(--orange)',
              fontSize: '0.8rem',
              fontFamily: 'var(--font-b)'
            }}
          >
            {error}
          </div>
        )}
      </div>

      {pickerExercise && (
        <ExerciseDetailModal
          exercise={pickerExercise}
          onClose={() => setPickerExercise(undefined)}
          onAddToWorkout={(ex) => {
            addExercise(ex)
            setPickerExercise(undefined)
          }}
          inWorkoutBuilder
        />
      )}
    </div>
  )
}

function PickerExerciseRow({
  exercise,
  onClick,
  alreadyAdded
}: {
  exercise: Exercise
  onClick: () => void
  alreadyAdded: boolean
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        background: hovered ? 'var(--surface)' : 'transparent',
        border: 'none',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.12s',
        opacity: alreadyAdded ? 0.45 : 1
      }}
    >
      <div
        style={{
          width: 48,
          height: 36,
          background: 'var(--black)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}
      >
        {exercise.video_url ? (
          <video
            src={exercise.video_url}
            muted
            preload='metadata'
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontSize: '1rem', opacity: 0.2 }}>🎥</span>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontFamily: 'var(--font-d)',
            fontSize: '0.9rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'var(--white)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {exercise.name}
        </p>
        <p
          style={{
            fontFamily: 'var(--font-d)',
            fontSize: '0.65rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--orange)',
            marginTop: '0.1rem'
          }}
        >
          {MUSCLE_GROUP_LABELS[exercise.primary_muscle]}
        </p>
      </div>

      <span
        style={{
          fontFamily: 'var(--font-d)',
          fontSize: '0.7rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: alreadyAdded ? 'var(--muted)' : 'var(--orange)',
          flexShrink: 0
        }}
      >
        {alreadyAdded ? 'Ajoute' : '+ Voir'}
      </span>
    </button>
  )
}

function WorkoutExerciseSlot({
  workoutExercise: we,
  alert,
  onRemove,
  onUpdate
}: {
  workoutExercise: WorkoutExercise
  alert?: MuscleAlert
  onRemove: () => void
  onUpdate: (config: Partial<Pick<WorkoutExercise, 'sets' | 'reps' | 'weight' | 'rest_seconds' | 'notes'>>) => void
}) {
  const [expanded, setExpanded] = useState(false)

  const borderColor =
    alert?.level === 'danger'
      ? '#ff4444'
      : alert?.level === 'warning'
        ? '#f59e0b'
        : 'var(--border)'

  return (
    <div style={{ background: 'var(--black)', border: `1px solid ${borderColor}`, transition: 'border-color 0.2s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.75rem' }}>
        <span
          style={{
            fontFamily: 'var(--font-d)',
            fontSize: '0.9rem',
            fontWeight: 700,
            color: 'var(--orange)',
            minWidth: '1.5rem',
            textAlign: 'center'
          }}
        >
          {we.position}
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontFamily: 'var(--font-d)',
              fontSize: '0.88rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--white)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {we.exercise.name}
          </p>
          <p
            style={{
              fontFamily: 'var(--font-d)',
              fontSize: '0.62rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: alert ? (alert.level === 'danger' ? '#ff4444' : '#f59e0b') : 'var(--muted)'
            }}
          >
            {MUSCLE_GROUP_LABELS[we.exercise.primary_muscle]}
            {alert &&
              ` · ⚠ ${alert.level === 'danger' ? 'Muscle surcharge' : 'Attention surcharge'}`}
          </p>
        </div>

        <input
          type='text'
          value={we.reps ?? ''}
          onChange={(e) => onUpdate({ reps: e.target.value })}
          placeholder='Reps'
          style={{
            width: 52,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--white)',
            padding: '0.25rem 0.4rem',
            fontFamily: 'var(--font-b)',
            fontSize: '0.8rem',
            textAlign: 'center',
            outline: 'none'
          }}
        />
        <span style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>×</span>
        <input
          type='number'
          value={we.sets ?? ''}
          onChange={(e) =>
            onUpdate({ sets: Number.parseInt(e.target.value, 10) || undefined })
          }
          placeholder='Series'
          min={1}
          style={{
            width: 44,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--white)',
            padding: '0.25rem 0.4rem',
            fontFamily: 'var(--font-b)',
            fontSize: '0.8rem',
            textAlign: 'center',
            outline: 'none'
          }}
        />

        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--muted)',
            cursor: 'pointer',
            fontSize: '0.75rem',
            padding: '0.2rem 0.4rem'
          }}
        >
          {expanded ? '▲' : '▼'}
        </button>
        <button
          onClick={onRemove}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--muted)',
            cursor: 'pointer',
            fontSize: '0.85rem',
            padding: '0.2rem 0.4rem'
          }}
        >
          ✕
        </button>
      </div>

      {expanded && (
        <div
          style={{
            padding: '0.5rem 0.75rem 0.75rem',
            borderTop: '1px solid var(--border)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.5rem'
          }}
        >
          <div>
            <label style={smallLabelStyle}>Charge / Intensite</label>
            <input
              type='text'
              value={we.weight ?? ''}
              onChange={(e) => onUpdate({ weight: e.target.value })}
              placeholder='60kg / BW / 70%1RM'
              style={miniInputStyle}
            />
          </div>
          <div>
            <label style={smallLabelStyle}>Repos (secondes)</label>
            <input
              type='number'
              value={we.rest_seconds ?? ''}
              onChange={(e) =>
                onUpdate({ rest_seconds: Number.parseInt(e.target.value, 10) || undefined })
              }
              placeholder='60'
              min={0}
              style={miniInputStyle}
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={smallLabelStyle}>Notes</label>
            <input
              type='text'
              value={we.notes ?? ''}
              onChange={(e) => onUpdate({ notes: e.target.value })}
              placeholder='Instructions specifiques...'
              style={miniInputStyle}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function MuscleAlertBadge({ alert }: { alert: MuscleAlert }) {
  const isDanger = alert.level === 'danger'
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.35rem 0.75rem',
        background: isDanger ? 'rgba(255,68,68,0.1)' : 'rgba(245,158,11,0.1)',
        border: `1px solid ${isDanger ? 'rgba(255,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
        fontSize: '0.75rem'
      }}
    >
      <span style={{ color: isDanger ? '#ff4444' : '#f59e0b' }}>{isDanger ? '🔴' : '🟡'}</span>
      <span
        style={{
          fontFamily: 'var(--font-d)',
          fontSize: '0.7rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: isDanger ? '#ff4444' : '#f59e0b',
          fontWeight: 700
        }}
      >
        {MUSCLE_GROUP_LABELS[alert.muscle]}
      </span>
      <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-b)' }}>
        {isDanger
          ? `Muscle principal repete ${alert.count}x`
          : `Muscle secondaire repete ${alert.count}x`}
      </span>
    </div>
  )
}

const smallLabelStyle: CSSProperties = {
  fontFamily: 'var(--font-d)',
  fontSize: '0.62rem',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  display: 'block',
  marginBottom: '0.25rem'
}

const selectStyle: CSSProperties = {
  width: '100%',
  background: 'var(--black)',
  border: '1px solid var(--border)',
  color: 'var(--white)',
  padding: '0.45rem 0.6rem',
  fontFamily: 'var(--font-d)',
  fontSize: '0.85rem',
  outline: 'none'
}

const miniInputStyle: CSSProperties = {
  width: '100%',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  color: 'var(--white)',
  padding: '0.3rem 0.5rem',
  fontFamily: 'var(--font-b)',
  fontSize: '0.8rem',
  outline: 'none'
}
