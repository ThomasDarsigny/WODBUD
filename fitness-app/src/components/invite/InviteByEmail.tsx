import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'

/**
 * 6.2 : la personne a déjà WODBUD ? On lui envoie une notification avec le
 * lien, à partir de son courriel. Le message affiché est le même que le
 * compte existe ou non : on ne révèle pas qui est inscrit.
 */
export default function InviteByEmail({ kind, targetId }: { kind: 'class' | 'community'; targetId: string }) {
  const { t } = useTranslation('common')
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!email.includes('@')) return
    setBusy(true)
    setMessage(null)
    try {
      const { error } = await supabase.functions.invoke('push', { body: { type: 'invite', target_kind: kind, target_id: targetId, email: email.trim() } })
      if (error) {
        const status = (error as { context?: { status?: number } }).context?.status
        setMessage({ kind: 'err', text: status === 429 ? t('invite.too_many') : t('errors.generic') })
        return
      }
      setMessage({ kind: 'ok', text: t('invite.sent') })
      setEmail('')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button type="button" className="wb-invite-toggle" onClick={() => setOpen(true)}>
        {t('invite.has_app')}
      </button>
    )
  }

  return (
    <form className="wb-invite-email" onSubmit={(e) => { void submit(e) }}>
      <label htmlFor={`invite-${targetId}`}>{t('invite.email_label')}</label>
      <div className="wb-invite-row">
        <input
          id={`invite-${targetId}`}
          className="wb-input"
          type="email"
          inputMode="email"
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('invite.email_placeholder')}
          required
        />
        <button type="submit" className="wb-btn wb-btn--primary" disabled={busy || !email.includes('@')}>
          {busy ? t('status.loading') : t('invite.send')}
        </button>
      </div>
      {message && <p className={message.kind === 'ok' ? 'wb-review-ok' : 'wb-rec-error'} role="status">{message.text}</p>}
    </form>
  )
}
