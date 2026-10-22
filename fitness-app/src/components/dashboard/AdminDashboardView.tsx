import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useExerciseStore } from '../../stores/exerciseStore'
import type { Exercise } from '../../types'
import { CATEGORY_I18N_KEYS, MUSCLE_GROUP_I18N_KEYS } from '../../types'
import ExerciseFormModal from '../exercises/ExerciseFormModal'
import ExerciseDetailModal from '../exercises/ExerciseDetailModal'
import OcrImportSection from './OcrImportSection'
import FeatureTopicsCard from '../vote/FeatureTopicsCard'
import Skeleton from '../ui/Skeleton'

export default function AdminDashboardView() {
  const { t } = useTranslation(['exercises', 'common'])
  const { exercises, loading, error, fetchExercises, deleteExercise } = useExerciseStore()

  const [search, setSearch] = useState('')
  const [completion, setCompletion] = useState<'all' | 'todo' | 'done'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | undefined>()
  const [detailExercise, setDetailExercise] = useState<Exercise | undefined>()

  useEffect(() => {
    fetchExercises()
  }, [fetchExercises])

  // Noms bruts : OcrImportSection normalise lui-même (accents, casse,
  // pluriels proches) pour la détection de doublons.
  const existingNames = useMemo(() => exercises.map((e) => e.name), [exercises])

  const total = exercises.length
  const withVideo = useMemo(() => exercises.filter((e) => !!e.video_url).length, [exercises])
  const withDescription = useMemo(
    () => exercises.filter((e) => e.description.trim().length > 0).length,
    [exercises]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = exercises.filter((e) => {
      const complete = Boolean(e.video_url) && e.description.trim().length > 0
      if (completion === 'todo' && complete) return false
      if (completion === 'done' && !complete) return false
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
  }, [exercises, search, completion, t])

  async function handleDelete(exercise: Exercise) {
    await deleteExercise(exercise.id)
  }

  function openEdit(exercise: Exercise) {
    setEditingExercise(exercise)
    setShowForm(true)
  }

  return (
    <div className="wb-page wb-page--wide">
      <header className="wb-ph">
        <div>
          <p className="wb-ph-tag">{t('admin.backoffice', { ns: 'exercises' })}</p>
          <h1>{t('admin.title', { ns: 'exercises' })}</h1>
          <p className="wb-ph-sub">{t('admin.subtitle', { ns: 'exercises' })}</p>
        </div>
        <button type="button" className="wb-btn wb-btn--primary" onClick={() => { setEditingExercise(undefined); setShowForm(true) }}>
          + {t('add', { ns: 'exercises' })}
        </button>
      </header>

      <div className="wb-admin-stats">
        <StatCard label={t('admin.total', { ns: 'exercises' })} value={String(total)} />
        <StatCard label={t('admin.with_video', { ns: 'exercises' })} value={`${withVideo}/${total || 0}`} />
        <StatCard label={t('admin.with_description', { ns: 'exercises' })} value={`${withDescription}/${total || 0}`} />
        <StatCard
          label={t('admin.to_complete', { ns: 'exercises' })}
          value={String(total - Math.min(withVideo, withDescription))}
          emphasize
        />
      </div>

      <FeatureTopicsCard admin />

      <OcrImportSection existingNames={existingNames} />

      <section className="wb-home-sec">
        <div className="wb-sec"><h2>{t('title', { ns: 'exercises' })}</h2></div>
        <div className="wb-search">
          <input
            type="search"
            className="wb-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin.search_placeholder', { ns: 'exercises' })}
            aria-label={t('admin.search_placeholder', { ns: 'exercises' })}
          />
        </div>

        <div className="wb-segmented" role="tablist" aria-label={t('admin.to_complete', { ns: 'exercises' })} style={{ margin: 0 }}>
          {(['all', 'todo', 'done'] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={completion === k} className={completion === k ? 'is-on' : undefined} onClick={() => setCompletion(k)}>
              {t(`admin.filter_${k}`, { ns: 'exercises' })}
            </button>
          ))}
        </div>

        {loading ? (
          <Skeleton height={56} lines={5} />
        ) : filtered.length === 0 ? (
          <div className="wb-empty"><p>{t('admin.empty', { ns: 'exercises' })}</p></div>
        ) : (
          <ul className="wb-list">
            {filtered.map((exercise) => {
              const missingVideo = !exercise.video_url
              const missingDescription = exercise.description.trim().length === 0
              return (
                <li key={exercise.id} className="wb-admin-row">
                  <div className="wb-admin-main">
                    <span className="wb-ex-cat">{t(CATEGORY_I18N_KEYS[exercise.category], { ns: 'common' })}</span>
                    <strong>{exercise.name}</strong>
                    <div className="wb-admin-tags">
                      <Chip ok={!missingDescription} label={missingDescription ? t('admin.missing_description', { ns: 'exercises' }) : t('admin.description_ok', { ns: 'exercises' })} />
                      <Chip ok={!missingVideo} label={missingVideo ? t('admin.missing_video', { ns: 'exercises' }) : t('admin.video_ok', { ns: 'exercises' })} />
                      <Chip ok label={t(MUSCLE_GROUP_I18N_KEYS[exercise.primary_muscle], { ns: 'common' })} subtle />
                    </div>
                  </div>
                  <div className="wb-admin-actions">
                    <button type="button" className="wb-btn wb-btn--secondary wb-btn--sm" onClick={() => setDetailExercise(exercise)}>
                      {t('admin.view', { ns: 'exercises' })}
                    </button>
                    <button type="button" className="wb-btn wb-btn--primary wb-btn--sm" onClick={() => openEdit(exercise)}>
                      {t('admin.complete', { ns: 'exercises' })}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {error && <div className="wb-rec-error" role="alert">{error}</div>}

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
    <div className={`wb-stat${emphasize ? ' wb-stat--accent' : ''}`}>
      <strong>{value}</strong>
      <span>{label}</span>
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
  // Vert : fait. Ambre : à compléter. Neutre : simple information.
  const tone = subtle ? '' : ok ? ' wb-pill--green' : ' wb-pill--amber'
  return <span className={`wb-pill${tone}`}>{label}</span>
}
