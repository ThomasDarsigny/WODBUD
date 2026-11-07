import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useExerciseStore } from '../../stores/exerciseStore'
import type { Exercise } from '../../types'

interface Priority {
  exercise_id: string | null
  name: string
  total: number
  sources: number
  has_video: boolean
  in_common: boolean
}

/**
 * Vidéos à tourner en priorité (050) : les exercices les plus mentionnés dans
 * les imports de tous les centres, ceux sans vidéo officielle d'abord.
 * Toucher un exercice ouvre sa fiche pour y joindre la vidéo.
 */
export default function VideoPriorities({ onEdit }: { onEdit: (exercise: Exercise) => void }) {
  const { t } = useTranslation(['exercises', 'common'])
  const { exercises } = useExerciseStore()
  const [items, setItems] = useState<Priority[] | null>(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    let alive = true
    supabase.rpc('get_video_priorities', { p_limit: 100 })
      .then(({ data, error }) => {
        if (!alive) return
        setItems(error ? [] : (data ?? []).map((r) => ({ ...r, total: Number(r.total), sources: Number(r.sources) })))
      })
    return () => { alive = false }
  }, [])

  if (items === null) return null
  const todo = items.filter((i) => !i.has_video)
  const shown = showAll ? items : todo.slice(0, 10)

  return (
    <section className="wb-home-sec">
      <div className="wb-sec">
        <h2>{t('priorities.title')} {todo.length > 0 && <span className="wb-ph-count">{todo.length}</span>}</h2>
        {items.length > 10 && (
          <button type="button" className="wb-btn wb-btn--ghost wb-btn--sm" onClick={() => setShowAll((v) => !v)}>
            {showAll ? t('priorities.only_todo') : t('priorities.show_all')}
          </button>
        )}
      </div>
      <p className="wb-set-hint" style={{ margin: '0 0 0.75rem' }}>{t('priorities.hint')}</p>

      {shown.length === 0 ? (
        <div className="wb-card wb-review-empty">{items.length ? t('priorities.all_done') : t('priorities.empty')}</div>
      ) : (
        <ol className="wb-card wb-list wb-prio">
          {shown.map((p, i) => {
            const exercise = p.exercise_id ? exercises.find((e) => e.id === p.exercise_id) : undefined
            const body = (
              <>
                <span className="wb-prio-rank">{i + 1}</span>
                <span className="wb-row-main">
                  <strong>{p.name}</strong>
                  <span>
                    {t('priorities.mentions', { count: p.total })} · {t('priorities.sources', { count: p.sources })}
                    {!p.exercise_id && ` · ${t('priorities.not_in_library')}`}
                  </span>
                </span>
                <span className={`wb-ex-badge${p.has_video ? '' : ' is-pending'}`}>
                  {p.has_video ? t('priorities.has_video') : t('priorities.to_shoot')}
                </span>
              </>
            )
            return (
              <li key={p.exercise_id ?? `n-${p.name}`}>
                {exercise ? (
                  <button type="button" className="wb-row" onClick={() => onEdit(exercise)}>{body}</button>
                ) : (
                  <div className="wb-row">{body}</div>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
