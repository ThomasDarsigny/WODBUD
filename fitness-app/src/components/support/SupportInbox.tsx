import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'

interface InboxItem {
  id: string
  kind: string
  message: string
  context: { path?: string; language?: string; platform?: string; screen?: string } | null
  status: string
  created_at: string
  author_name: string | null
  author_email: string | null
}

/**
 * Boîte de réception du support (6.3), pour l'équipe WODBUD : messages
 * nouveaux d'abord, avec un lien pour répondre par courriel et un bouton
 * « Traité ».
 */
export default function SupportInbox() {
  const { t, i18n } = useTranslation('common')
  const [status, setStatus] = useState<'new' | 'done'>('new')
  const [items, setItems] = useState<InboxItem[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async (s: 'new' | 'done') => {
    const { data, error } = await supabase.rpc('get_support_inbox', { p_status: s })
    if (error) throw error
    return (data ?? []) as InboxItem[]
  }, [])

  useEffect(() => {
    let alive = true
    load(status).then((d) => { if (alive) setItems(d) }).catch(() => { if (alive) setItems([]) })
    return () => { alive = false }
  }, [load, status])

  async function markDone(item: InboxItem) {
    setBusy(item.id)
    try {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase.from('support_messages')
        .update({ status: 'done', handled_at: new Date().toISOString(), handled_by: auth.user?.id ?? null })
        .eq('id', item.id)
      if (error) throw error
      setItems((list) => (list ?? []).filter((x) => x.id !== item.id))
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="wb-home-sec">
      <div className="wb-sec">
        <h2>{t('support.inbox_title')} {status === 'new' && items && items.length > 0 && <span className="wb-ph-count">{items.length}</span>}</h2>
        <div className="wb-links-chips">
          {(['new', 'done'] as const).map((s) => (
            <button key={s} type="button" className="wb-chip" aria-pressed={status === s} onClick={() => { setItems(null); setStatus(s) }}>
              {t(`support.status_${s}`)}
            </button>
          ))}
        </div>
      </div>
      {items === null ? null : items.length === 0 ? (
        <div className="wb-card wb-review-empty">{t('support.inbox_empty')}</div>
      ) : (
        <ul className="wb-card wb-list wb-support-inbox">
          {items.map((m) => (
            <li key={m.id}>
              <div className="wb-support-meta">
                <span className="wb-pill wb-pill--orange">{t(`support.kinds.${m.kind}`)}</span>
                <span>{[m.author_name, new Date(m.created_at).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })].filter(Boolean).join(' · ')}</span>
              </div>
              <p className="wb-support-msg">{m.message}</p>
              {m.context?.path && <p className="wb-set-hint">{[m.context.path, m.context.language, m.context.screen].filter(Boolean).join(' · ')}</p>}
              <div className="wb-review-actions">
                {m.author_email && (
                  <a className="wb-btn wb-btn--secondary wb-btn--sm" href={`mailto:${m.author_email}?subject=${encodeURIComponent('WODBUD — support')}`}>
                    {t('support.reply')}
                  </a>
                )}
                {m.status === 'new' && (
                  <button type="button" className="wb-btn wb-btn--primary wb-btn--sm" disabled={busy !== null} onClick={() => { void markDone(m) }}>
                    {t('support.mark_done')}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
