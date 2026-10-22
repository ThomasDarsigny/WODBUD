import { useCallback, useEffect, useState } from 'react'
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
import { btnDanger, btnPrimary, btnSmall, card, field, textarea } from '../../styles/ui'

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

  async function submit() {
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
    <section style={{ ...card, padding: '1.25rem', marginBottom: '1.5rem' }}>
      <p className="wb-ph-tag">
        {t('feature_topics.tag')}
      </p>
      <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.03em', margin: 0 }}>
        {t('feature_topics.title')}
      </h2>
      <p style={{ color: 'var(--muted)', fontSize: '0.8125rem', margin: '0.35rem 0 1.1rem', lineHeight: 1.5 }}>
        {admin
          ? t('feature_topics.admin_subtitle', { count: total })
          : mine
            ? t('feature_topics.your_choice', { title: mine.title })
            : t('feature_topics.subtitle')}
      </p>

      {admin && (
        <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void submit() }}
            maxLength={120}
            placeholder={t('feature_topics.title_placeholder')}
            style={field}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder={t('feature_topics.description_placeholder')}
            style={{ ...textarea, resize: 'vertical' }}
          />
          <button
            onClick={() => { void submit() }}
            disabled={!title.trim() || busy === 'create'}
            style={{ ...btnPrimary, justifySelf: 'start', opacity: !title.trim() ? 0.55 : 1 }}
          >
            + {t('feature_topics.add')}
          </button>
        </div>
      )}

      {error && (
        <p role='alert' style={{ color: 'var(--orange)', fontSize: '0.8125rem', margin: '0 0 0.9rem' }}>{error}</p>
      )}

      {topics === null ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.8125rem', margin: 0 }}>…</p>
      ) : visible.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.8125rem', margin: 0 }}>
          {admin ? t('feature_topics.empty_admin') : t('feature_topics.empty')}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
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
  const accent = topic.is_mine ? 'var(--orange)' : topic.status === 'done' ? '#22c55e' : 'var(--border)'

  return (
    <div style={{ border: `1px solid ${accent}`, borderRadius: 12, background: topic.is_mine ? 'rgba(255,77,0,0.06)' : 'var(--black)', padding: '0.8rem 0.9rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: '1 1 200px' }}>
          <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.9375rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>
            {topic.title}
            {topic.status !== 'open' && (
              <span style={{ marginLeft: '0.5rem', fontSize: '0.6875rem', letterSpacing: '0.12em', color: topic.status === 'done' ? '#22c55e' : 'var(--muted)' }}>
                {topic.status === 'done' ? `✓ ${t('feature_topics.status_done')}` : t('feature_topics.status_closed')}
              </span>
            )}
          </p>
          {topic.description && (
            <p style={{ color: 'var(--muted)', fontSize: '0.8125rem', margin: '0.25rem 0 0', lineHeight: 1.45 }}>{topic.description}</p>
          )}
        </div>

        {!admin && open && (
          <button
            onClick={onVote}
            disabled={busy}
            aria-pressed={topic.is_mine}
            style={topic.is_mine ? { ...btnSmall, color: 'var(--orange)', borderColor: 'var(--orange)' } : btnSmall}
          >
            {topic.is_mine ? `✓ ${t('feature_topics.chosen')}` : t('feature_topics.choose')}
          </button>
        )}

        {admin && (
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {topic.status !== 'open' && (
              <button onClick={() => onStatus('open')} disabled={busy} style={btnSmall}>{t('feature_topics.reopen')}</button>
            )}
            {open && (
              <button onClick={() => onStatus('closed')} disabled={busy} style={btnSmall}>{t('feature_topics.close')}</button>
            )}
            {topic.status !== 'done' && (
              <button onClick={() => onStatus('done')} disabled={busy} style={btnSmall}>✓ {t('feature_topics.mark_done')}</button>
            )}
            <ConfirmButton
              onConfirm={onDelete}
              confirmLabel={t('feature_topics.delete_confirm')}
              style={{ ...btnDanger, minHeight: 36, fontSize: '0.6875rem', padding: '0 0.75rem' }}
            >
              {t('feature_topics.delete')}
            </ConfirmButton>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.6rem' }}>
        <div style={{ flex: 1, height: 6, background: 'var(--dark)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: topic.is_mine ? 'var(--orange)' : 'var(--muted)', transition: 'width 0.4s ease' }} />
        </div>
        <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.75rem', letterSpacing: '0.08em', color: 'var(--muted)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
          {pct}% · {t('feature_topics.votes', { count: topic.votes })}
        </span>
      </div>
    </div>
  )
}
