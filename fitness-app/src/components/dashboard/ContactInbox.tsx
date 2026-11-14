import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'

interface ContactItem {
  id: number
  created_at: string
  name: string
  email: string
  topic: string
  organization: string | null
  message: string
  locale: string | null
}

/**
 * Messages du formulaire de contact du site (/contact, migration 072), pour
 * l'équipe WODBUD : nouveaux d'abord, un lien pour répondre par courriel et
 * un bouton « Traité ».
 */
export default function ContactInbox() {
  const { t, i18n } = useTranslation('common')
  const [status, setStatus] = useState<'new' | 'done'>('new')
  const [items, setItems] = useState<ContactItem[] | null>(null)
  const [busy, setBusy] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    supabase
      .from('contact_messages')
      .select('id, created_at, name, email, topic, organization, message, locale')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => { if (alive) setItems((data ?? []) as ContactItem[]) })
    return () => { alive = false }
  }, [status])

  async function markDone(item: ContactItem) {
    setBusy(item.id)
    try {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase.from('contact_messages')
        .update({ status: 'done', handled_at: new Date().toISOString(), handled_by: auth.user?.id ?? null })
        .eq('id', item.id)
      if (!error) setItems((list) => (list ?? []).filter((x) => x.id !== item.id))
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="wb-home-sec" aria-labelledby="contact-inbox-title">
      <div className="wb-sec">
        <h2 id="contact-inbox-title">
          {t('contact.inbox_title')} {status === 'new' && items && items.length > 0 && <span className="wb-ph-count">{items.length}</span>}
        </h2>
        <div className="wb-links-chips">
          {(['new', 'done'] as const).map((s) => (
            <button key={s} type="button" className="wb-chip" aria-pressed={status === s} onClick={() => { setItems(null); setStatus(s) }}>
              {t(`support.status_${s}`)}
            </button>
          ))}
        </div>
      </div>
      {items === null ? null : items.length === 0 ? (
        <div className="wb-card wb-review-empty">{t('contact.inbox_empty')}</div>
      ) : (
        <ul className="wb-card wb-list wb-support-inbox">
          {items.map((m) => (
            <li key={m.id}>
              <div className="wb-support-meta">
                <span className={`wb-pill${m.topic === 'center' ? ' wb-pill--orange' : ''}`}>{t(`contact.topics.${m.topic}`)}</span>
                <span>{[m.name, m.organization, new Date(m.created_at).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })].filter(Boolean).join(' · ')}</span>
              </div>
              <p className="wb-support-msg">{m.message}</p>
              <p className="wb-set-hint">{[m.email, m.locale?.toUpperCase()].filter(Boolean).join(' · ')}</p>
              <div className="wb-review-actions">
                <a className="wb-btn wb-btn--secondary wb-btn--sm" href={`mailto:${m.email}?subject=${encodeURIComponent('WODBUD')}`}>
                  {t('support.reply')}
                </a>
                {status === 'new' && (
                  <button type="button" className="wb-btn wb-btn--ghost wb-btn--sm" onClick={() => { void markDone(m) }} disabled={busy === m.id}>
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
