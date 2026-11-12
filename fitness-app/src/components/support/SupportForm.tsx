import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'

const KINDS = ['bug', 'question', 'idea', 'other'] as const
type Kind = (typeof KINDS)[number]

/**
 * 6.3 : écrire au support WODBUD depuis les réglages. Le message part avec la
 * page d'où on écrit, la langue et la plateforme, pour aider à reproduire ;
 * rien d'autre. L'équipe WODBUD répond par courriel.
 */
export default function SupportForm() {
  const { t, i18n } = useTranslation('common')
  const [kind, setKind] = useState<Kind>('question')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const text = message.trim()
    if (!text) return
    setBusy(true)
    setNotice(null)
    try {
      const { error } = await supabase.from('support_messages').insert({
        kind,
        message: text,
        context: {
          path: window.location.pathname,
          language: i18n.language,
          platform: navigator.userAgent.slice(0, 200),
          screen: `${window.innerWidth}x${window.innerHeight}`
        }
      })
      if (error) throw error
      setMessage('')
      setNotice({ kind: 'ok', text: t('support.sent') })
    } catch (err) {
      const limited = err instanceof Object && 'message' in err && String((err as { message: string }).message).includes('support_rate_limited')
      setNotice({ kind: 'err', text: limited ? t('support.too_many') : t('errors.generic') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="wb-support" onSubmit={(e) => { void submit(e) }}>
      <div className="wb-links-chips" role="group" aria-label={t('support.kind')}>
        {KINDS.map((k) => (
          <button key={k} type="button" className="wb-chip" aria-pressed={kind === k} onClick={() => setKind(k)}>
            {t(`support.kinds.${k}`)}
          </button>
        ))}
      </div>
      <label className="wb-sr-only" htmlFor="support-message">{t('support.message')}</label>
      <textarea
        id="support-message"
        className="wb-input wb-support-text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={t(`support.placeholder_${kind}`)}
        maxLength={4000}
        rows={5}
        required
      />
      <div className="wb-support-foot">
        <span className="wb-set-hint">{t('support.reply_by_email')}</span>
        <button type="submit" className="wb-btn wb-btn--primary" disabled={busy || !message.trim()}>
          {busy ? t('status.loading') : t('support.send')}
        </button>
      </div>
      {notice && <p className={notice.kind === 'ok' ? 'wb-review-ok' : 'wb-rec-error'} role="status">{notice.text}</p>}
    </form>
  )
}
