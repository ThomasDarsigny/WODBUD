import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { deleteReferences, listReferences, type ExerciseReference } from '../../lib/exerciseReferences'
import { useExerciseStore } from '../../stores/exerciseStore'
import type { Exercise } from '../../types'
import { missingForPublish } from '../../lib/exerciseCompleteness'

interface QueueItem {
  exercise_id: string
  name: string
  center_name: string | null
  author_name: string | null
  created_at: string
  references_count: number
}

/**
 * Relecture WODBUD (049) : les exercices créés par les centres. On regarde
 * les médias de référence, on corrige au besoin, puis on publie dans la base
 * commune (l'auteur est averti) ou on laisse l'exercice à son centre. Les
 * médias de référence sont supprimés une fois la décision prise.
 */
export default function ExerciseReviewQueue({ onEdit }: { onEdit: (exercise: Exercise) => void }) {
  const { t, i18n } = useTranslation(['exercises', 'common'])
  const { exercises, fetchExercises } = useExerciseStore()
  const [items, setItems] = useState<QueueItem[] | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [media, setMedia] = useState<Record<string, ExerciseReference[]>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const fetchQueue = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_exercise_review_queue')
    if (error) throw error
    return (data ?? []).map((r) => ({ ...r, references_count: Number(r.references_count) })) as QueueItem[]
  }, [])

  useEffect(() => {
    let alive = true
    fetchQueue().then((q) => { if (alive) setItems(q) }).catch(() => { if (alive) setItems([]) })
    return () => { alive = false }
  }, [fetchQueue])

  async function toggleMedia(id: string) {
    if (open === id) { setOpen(null); return }
    setOpen(id)
    if (!media[id]) {
      const refs = await listReferences(id).catch(() => [])
      setMedia((m) => ({ ...m, [id]: refs }))
    }
  }

  async function decide(item: QueueItem, decision: 'published' | 'private') {
    setBusy(item.exercise_id)
    setMessage(null)
    try {
      const { error } = await supabase.rpc('review_center_exercise', { p_exercise: item.exercise_id, p_decision: decision })
      if (error) throw error
      // Décision prise : les médias de référence n'ont plus d'usage.
      await deleteReferences(item.exercise_id).catch(() => {})
      if (decision === 'published') {
        await supabase.functions.invoke('push', { body: { type: 'exercise_published', exercise_id: item.exercise_id } }).catch(() => {})
      }
      setItems(await fetchQueue())
      void fetchExercises()
      setMessage({ kind: 'ok', text: t(decision === 'published' ? 'review.published' : 'review.kept', { name: item.name }) })
    } catch (err) {
      setMessage({ kind: 'err', text: err instanceof Error ? err.message : t('errors.generic', { ns: 'common' }) })
    } finally {
      setBusy(null)
    }
  }

  async function announce() {
    setBusy('announce')
    setMessage(null)
    try {
      const { data, error } = await supabase.functions.invoke('push', { body: { type: 'library_update' } })
      if (error) throw error
      const count = (data as { exercises?: number } | null)?.exercises ?? 0
      setMessage({ kind: 'ok', text: count ? t('review.announced', { count }) : t('review.nothing_new') })
    } catch (err) {
      setMessage({ kind: 'err', text: err instanceof Error ? err.message : t('errors.generic', { ns: 'common' }) })
    } finally {
      setBusy(null)
    }
  }

  if (items === null) return null

  return (
    <section className="wb-home-sec">
      <div className="wb-sec">
        <h2>{t('review.title')} {items.length > 0 && <span className="wb-ph-count">{items.length}</span>}</h2>
        <button type="button" className="wb-btn wb-btn--secondary wb-btn--sm" onClick={() => { void announce() }} disabled={busy !== null}>
          {t('review.announce')}
        </button>
      </div>
      <p className="wb-set-hint is-lead">{t('review.hint')}</p>

      {message && <p className={message.kind === 'ok' ? 'wb-review-ok' : 'wb-rec-error'} role="status">{message.text}</p>}

      {items.length === 0 ? (
        <div className="wb-card wb-review-empty">{t('review.empty')}</div>
      ) : (
        <ul className="wb-card wb-list wb-review">
          {items.map((item) => {
            const exercise = exercises.find((e) => e.id === item.exercise_id)
            const refs = media[item.exercise_id]
            const missing = missingForPublish(exercise)
            return (
              <li key={item.exercise_id} className="wb-review-item">
                <div className="wb-review-head">
                  <div className="wb-row-main">
                    <strong>{item.name}</strong>
                    <span>
                      {[item.center_name, item.author_name, new Date(item.created_at).toLocaleDateString(i18n.language)].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                  <button type="button" className="wb-chip" onClick={() => { void toggleMedia(item.exercise_id) }} aria-expanded={open === item.exercise_id}>
                    {t('review.media', { count: item.references_count })}
                  </button>
                </div>

                {missing.length > 0 && (
                  <p className="wb-review-missing">
                    {t('review.incomplete', { list: missing.map((m) => t(`review.missing_${m}`)).join(', ') })}
                  </p>
                )}

                {open === item.exercise_id && (
                  <div className="wb-review-media">
                    {!refs ? (
                      <p className="wb-set-hint">{t('status.loading', { ns: 'common' })}</p>
                    ) : refs.length === 0 ? (
                      <p className="wb-set-hint">{t('review.no_media')}</p>
                    ) : (
                      refs.map((r) => r.url && (r.kind === 'video'
                        ? <video key={r.id} src={r.url} controls playsInline preload="metadata" />
                        : <a key={r.id} href={r.url} target="_blank" rel="noreferrer"><img src={r.url} alt="" /></a>))
                    )}
                    {exercise && (
                      <p className="wb-review-desc">{exercise.description || t('review.no_description')}</p>
                    )}
                  </div>
                )}

                <div className="wb-review-actions">
                  <button type="button" className="wb-btn wb-btn--secondary wb-btn--sm" disabled={!exercise || busy !== null} onClick={() => exercise && onEdit(exercise)}>
                    {t('review.edit')}
                  </button>
                  <button type="button" className="wb-btn wb-btn--ghost wb-btn--sm" disabled={busy !== null} onClick={() => { void decide(item, 'private') }}>
                    {t('review.keep_private')}
                  </button>
                  <button
                    type="button"
                    className="wb-btn wb-btn--primary wb-btn--sm"
                    disabled={busy !== null || !exercise || missing.length > 0}
                    title={missing.length > 0 ? t('review.complete_first') : undefined}
                    onClick={() => { void decide(item, 'published') }}
                  >
                    {busy === item.exercise_id ? t('status.loading', { ns: 'common' }) : t('review.publish')}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
