import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  clearTopicVote,
  createFeatureTopic,
  deleteFeatureTopic,
  fetchFeatureTopics,
  setFeatureTopicStatus,
  voteForTopic,
  type FeatureTopic,
  type FeatureTopicStatus
} from '../../lib/featureTopics'
import ConfirmButton from '../ui/ConfirmButton'

/**
 * Carte « Quelles thématiques ajouter à WODBUD ? ».
 *
 * `admin` : propose, ferme/rouvre, marque « ajoutée », supprime.
 * Sinon : un seul choix par compte, les thématiques fermées ou ajoutées
 * restent visibles avec leurs résultats mais ne se votent plus.
 */
export default function FeatureTopicsCard({ admin = false }: { admin?: boolean }) {
  const { t } = useTranslation('common')
  const [topics, setTopics] = useState<FeatureTopic[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const load = useCallback(async () => {
    try {
      setTopics(await fetchFeatureTopics())
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'))
      setTopics([])
    }
  }, [t])

  useEffect(() => {
    let mounted = true
    fetchFeatureTopics()
      .then((rows) => { if (mounted) setTopics(rows) })
      .catch((err: unknown) => {
        if (!mounted) return
        setError(err instanceof Error ? err.message : t('errors.generic'))
        setTopics([])
      })
    return () => { mounted = false }
  }, [t])

  async function run(key: string, action: () => Promise<void>) {
    setError(null)
    setBusy(key)
    try {
      await action()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'))
    } finally {
      setBusy(null)
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    await run('create', () => createFeatureTopic(title, description))
    setTitle('')
    setDescription('')
  }

  // Ordre stable (ouvertes d'abord, puis la plus ancienne) : trier par votes
  // ferait sauter la carte sous le doigt juste après un clic.
  const visible = (topics ?? [])
    .filter((topic) => admin || topic.status !== 'closed')
    .sort((a, b) => Number(b.status === 'open') - Number(a.status === 'open') || a.created_at.localeCompare(b.created_at))
  const total = visible.reduce((sum, topic) => sum + topic.votes, 0)
  const mine = visible.find((topic) => topic.is_mine)

  return (
    <section className="wb-topics" aria-labelledby="topics-title">
      <p className="wb-ph-tag">{t('feature_topics.tag')}</p>
      <h2 id="topics-title" className="wb-topics-title">{t('feature_topics.title')}</h2>
      <p className="wb-topics-sub">
        {admin
          ? t('feature_topics.admin_subtitle', { count: total })
          : mine
            ? t('feature_topics.your_choice', { title: mine.title })
            : t('feature_topics.subtitle')}
      </p>

      {admin && (
        <form className="wb-topics-form" onSubmit={(e) => { void submit(e) }}>
          <input
            className="wb-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder={t('feature_topics.title_placeholder')}
            aria-label={t('feature_topics.title_placeholder')}
          />
          <textarea
            className="wb-input wb-topics-text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder={t('feature_topics.description_placeholder')}
            aria-label={t('feature_topics.description_placeholder')}
          />
          <button type="submit" disabled={!title.trim() || busy === 'create'} className="wb-btn wb-btn--primary wb-topics-add">
            + {t('feature_topics.add')}
          </button>
        </form>
      )}

      {error && <p role="alert" className="wb-topics-error">{error}</p>}

      {topics === null ? (
        <p className="wb-topics-note" role="status">…</p>
      ) : visible.length === 0 ? (
        <p className="wb-topics-note">{admin ? t('feature_topics.empty_admin') : t('feature_topics.empty')}</p>
      ) : (
        <div className="wb-topics-list">
          {visible.map((topic) => (
            <TopicRow
              key={topic.id}
              topic={topic}
              total={total}
              admin={admin}
              busy={busy === topic.id}
              onVote={() => run(topic.id, () => (topic.is_mine ? clearTopicVote() : voteForTopic(topic.id)))}
              onStatus={(status) => run(topic.id, () => setFeatureTopicStatus(topic.id, status))}
              onDelete={() => run(topic.id, () => deleteFeatureTopic(topic.id))}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function TopicRow({ topic, total, admin, busy, onVote, onStatus, onDelete }: {
  topic: FeatureTopic
  total: number
  admin: boolean
  busy: boolean
  onVote: () => void
  onStatus: (status: FeatureTopicStatus) => void
  onDelete: () => void
}) {
  const { t } = useTranslation('common')
  const pct = total > 0 ? Math.round((topic.votes / total) * 100) : 0
  const open = topic.status === 'open'
  const state = topic.is_mine ? ' is-mine' : topic.status === 'done' ? ' is-done' : ''

  return (
    <div className={`wb-topic${state}`} style={{ '--pct': `${pct}%` } as CSSProperties}>
      <div className="wb-topic-head">
        <div className="wb-topic-main">
          <p className="wb-topic-title">
            {topic.title}
            {topic.status !== 'open' && (
              <span className={`wb-topic-status${topic.status === 'done' ? ' is-done' : ''}`}>
                {topic.status === 'done' ? `✓ ${t('feature_topics.status_done')}` : t('feature_topics.status_closed')}
              </span>
            )}
          </p>
          {topic.description && <p className="wb-topic-desc">{topic.description}</p>}
        </div>

        {!admin && open && (
          <button
            type="button"
            onClick={onVote}
            disabled={busy}
            aria-pressed={topic.is_mine}
            aria-label={`${t('feature_topics.choose')} — ${topic.title}`}
            className={`wb-btn wb-btn--ghost wb-btn--sm wb-topic-pick${topic.is_mine ? ' is-mine' : ''}`}
          >
            {topic.is_mine ? `✓ ${t('feature_topics.chosen')}` : t('feature_topics.choose')}
          </button>
        )}

        {admin && (
          <div className="wb-topic-admin">
            {topic.status !== 'open' && (
              <button type="button" onClick={() => onStatus('open')} disabled={busy} className="wb-btn wb-btn--ghost wb-btn--sm">{t('feature_topics.reopen')}</button>
            )}
            {open && (
              <button type="button" onClick={() => onStatus('closed')} disabled={busy} className="wb-btn wb-btn--ghost wb-btn--sm">{t('feature_topics.close')}</button>
            )}
            {topic.status !== 'done' && (
              <button type="button" onClick={() => onStatus('done')} disabled={busy} className="wb-btn wb-btn--ghost wb-btn--sm">✓ {t('feature_topics.mark_done')}</button>
            )}
            <ConfirmButton
              onConfirm={onDelete}
              confirmLabel={t('feature_topics.delete_confirm')}
              ariaLabel={`${t('feature_topics.delete')} — ${topic.title}`}
              className="wb-btn wb-btn--danger wb-btn--sm"
            >
              {t('feature_topics.delete')}
            </ConfirmButton>
          </div>
        )}
      </div>

      <div className="wb-topic-bar">
        <div className="wb-topic-track" aria-hidden="true">
          <div className="wb-topic-fill" />
        </div>
        <span className="wb-topic-count">{pct}% · {t('feature_topics.votes', { count: topic.votes })}</span>
      </div>
    </div>
  )
}
