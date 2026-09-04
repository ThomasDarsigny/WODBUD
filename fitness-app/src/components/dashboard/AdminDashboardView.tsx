import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useExerciseStore } from '../../stores/exerciseStore'
import type { Exercise } from '../../types'
import { CATEGORY_I18N_KEYS, MUSCLE_GROUP_I18N_KEYS } from '../../types'
import ExerciseFormModal from '../exercises/ExerciseFormModal'
import ExerciseDetailModal from '../exercises/ExerciseDetailModal'
import OcrImportSection from './OcrImportSection'

export default function AdminDashboardView() {
  const { t } = useTranslation(['exercises', 'common'])
  const { exercises, loading, error, fetchExercises, deleteExercise } = useExerciseStore()

  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | undefined>()
  const [detailExercise, setDetailExercise] = useState<Exercise | undefined>()

  useEffect(() => {
    fetchExercises()
  }, [fetchExercises])

  const existingNames = useMemo(
    () => new Set(exercises.map((e) => e.name.toLowerCase())),
    [exercises]
  )

  const total = exercises.length
  const withVideo = useMemo(() => exercises.filter((e) => !!e.video_url).length, [exercises])
  const withDescription = useMemo(
    () => exercises.filter((e) => e.description.trim().length > 0).length,
    [exercises]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = exercises.filter((e) => {
      if (!q) return true
      return (
        e.name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        t(MUSCLE_GROUP_I18N_KEYS[e.primary_muscle], { ns: 'common' }).toLowerCase().includes(q)
      )
    })

    // Prioritize entries that are missing admin content so they're fixed first.
    return list.sort((a, b) => {
      const scoreA = Number(!a.video_url) + Number(a.description.trim().length === 0)
      const scoreB = Number(!b.video_url) + Number(b.description.trim().length === 0)
      if (scoreA !== scoreB) return scoreB - scoreA
      return a.name.localeCompare(b.name)
    })
  }, [exercises, search, t])

  async function handleDelete(exercise: Exercise) {
    await deleteExercise(exercise.id)
  }

  function openEdit(exercise: Exercise) {
    setEditingExercise(exercise)
    setShowForm(true)
  }

  return (
    <div style={{ padding: 'var(--page-pad)', minHeight: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap'
        }}
      >
        <div>
          <p
            style={{
              fontFamily: 'var(--font-d)',
              fontSize: '0.72rem',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: 'var(--orange)',
              marginBottom: '0.35rem'
            }}
          >
            {t('admin.backoffice', { ns: 'exercises' })}
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-d)',
              fontSize: '2.05rem',
              fontWeight: 900,
              textTransform: 'uppercase',
              lineHeight: 1.05,
              letterSpacing: '0.03em'
            }}
          >
            {t('admin.title', { ns: 'exercises' })}
          </h1>
          <p style={{ color: 'var(--muted)', marginTop: '0.45rem' }}>
            {t('admin.subtitle', { ns: 'exercises' })}
          </p>
        </div>

        <button
          onClick={() => {
            setEditingExercise(undefined)
            setShowForm(true)
          }}
          style={{
            fontFamily: 'var(--font-d)',
            fontWeight: 700,
            fontSize: '0.85rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--black)',
            background: 'var(--orange)',
            padding: '0.7rem 1.4rem',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          + {t('add', { ns: 'exercises' })}
        </button>
      </div>

      <OcrImportSection existingNames={existingNames} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.25rem'
        }}
      >
        <StatCard label={t('admin.total', { ns: 'exercises' })} value={String(total)} />
        <StatCard label={t('admin.with_video', { ns: 'exercises' })} value={`${withVideo}/${total || 0}`} />
        <StatCard label={t('admin.with_description', { ns: 'exercises' })} value={`${withDescription}/${total || 0}`} />
        <StatCard
          label={t('admin.to_complete', { ns: 'exercises' })}
          value={String(total - Math.min(withVideo, withDescription))}
          emphasize
        />
      </div>

      <div
        style={{
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.7rem',
          flexWrap: 'wrap'
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('admin.search_placeholder', { ns: 'exercises' })}
          style={{
            flex: 1,
            minWidth: 260,
            background: 'var(--dark)',
            border: '1px solid var(--border)',
            color: 'var(--white)',
            padding: '0.65rem 0.9rem',
            fontFamily: 'var(--font-b)',
            fontSize: '0.9rem',
            outline: 'none'
          }}
        />
      </div>

      {loading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 220,
            color: 'var(--muted)',
            fontFamily: 'var(--font-d)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase'
          }}
        >
          {t('loading', { ns: 'exercises' })}
        </div>
      ) : (
        <div style={{ border: '1px solid var(--border)', background: 'var(--dark)' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '2.3rem 1rem', textAlign: 'center', color: 'var(--muted)' }}>
              {t('admin.empty', { ns: 'exercises' })}
            </div>
          ) : (
            filtered.map((exercise) => {
              const missingVideo = !exercise.video_url
              const missingDescription = exercise.description.trim().length === 0

              return (
                <div
                  key={exercise.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    gap: '0.8rem',
                    padding: '0.9rem 1rem',
                    borderBottom: '1px solid var(--border)',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <p
                        style={{
                          fontFamily: 'var(--font-d)',
                          fontSize: '0.86rem',
                          fontWeight: 800,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color: 'var(--white)',
                          margin: 0
                        }}
                      >
                        {exercise.name}
                      </p>
                      <span
                        style={{
                          fontFamily: 'var(--font-d)',
                          fontSize: '0.62rem',
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          color: 'var(--orange)'
                        }}
                      >
                        {t(CATEGORY_I18N_KEYS[exercise.category], { ns: 'common' })}
                      </span>
                    </div>

                    <div style={{ marginTop: '0.28rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      <Chip ok={!missingDescription} label={missingDescription ? t('admin.missing_description', { ns: 'exercises' }) : t('admin.description_ok', { ns: 'exercises' })} />
                      <Chip ok={!missingVideo} label={missingVideo ? t('admin.missing_video', { ns: 'exercises' }) : t('admin.video_ok', { ns: 'exercises' })} />
                      <Chip ok label={t(MUSCLE_GROUP_I18N_KEYS[exercise.primary_muscle], { ns: 'common' })} subtle />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button onClick={() => setDetailExercise(exercise)} style={ghostBtnStyle}>
                      {t('admin.view', { ns: 'exercises' })}
                    </button>
                    <button onClick={() => openEdit(exercise)} style={actionBtnStyle}>
                      {t('admin.complete', { ns: 'exercises' })}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: '0.9rem',
            padding: '0.65rem 0.9rem',
            background: 'rgba(255,77,0,0.1)',
            border: '1px solid rgba(255,77,0,0.3)',
            color: 'var(--orange)',
            fontSize: '0.85rem'
          }}
        >
          {error}
        </div>
      )}

      {showForm && (
        <ExerciseFormModal
          exercise={editingExercise}
          onClose={() => {
            setShowForm(false)
            setEditingExercise(undefined)
          }}
        />
      )}

      {detailExercise && (
        <ExerciseDetailModal
          exercise={detailExercise}
          onClose={() => setDetailExercise(undefined)}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}

function StatCard({ label, value, emphasize = false }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div
      style={{
        border: `1px solid ${emphasize ? 'rgba(255,77,0,0.35)' : 'var(--border)'}`,
        background: emphasize ? 'rgba(255,77,0,0.07)' : 'var(--dark)',
        padding: '0.8rem 0.9rem'
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-d)',
          fontSize: '0.66rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          marginBottom: '0.2rem'
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: 'var(--font-d)',
          fontSize: '1.4rem',
          fontWeight: 900,
          letterSpacing: '0.02em',
          color: emphasize ? 'var(--orange)' : 'var(--white)',
          margin: 0
        }}
      >
        {value}
      </p>
    </div>
  )
}

function Chip({
  ok,
  label,
  subtle = false
}: {
  ok: boolean
  label: string
  subtle?: boolean
}) {
  const color = subtle ? 'var(--muted)' : ok ? '#22c55e' : '#f59e0b'
  const border = subtle ? 'var(--border)' : ok ? 'rgba(34,197,94,0.35)' : 'rgba(245,158,11,0.35)'
  const bg = subtle ? 'transparent' : ok ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)'

  return (
    <span
      style={{
        fontFamily: 'var(--font-d)',
        fontSize: '0.62rem',
        letterSpacing: '0.09em',
        textTransform: 'uppercase',
        color,
        border: `1px solid ${border}`,
        background: bg,
        padding: '0.16rem 0.43rem'
      }}
    >
      {label}
    </span>
  )
}

const actionBtnStyle = {
  fontFamily: 'var(--font-d)',
  fontSize: '0.7rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--black)',
  background: 'var(--orange)',
  border: 'none',
  padding: '0.4rem 0.55rem',
  cursor: 'pointer'
} as const

const ghostBtnStyle = {
  fontFamily: 'var(--font-d)',
  fontSize: '0.7rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  background: 'transparent',
  border: '1px solid var(--border)',
  padding: '0.4rem 0.55rem',
  cursor: 'pointer'
} as const
