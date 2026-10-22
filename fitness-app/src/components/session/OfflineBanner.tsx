import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { getLocalUser } from '../../lib/currentUser'
import { flushOutbox, readOutbox } from '../../lib/sessionUpload'

type Notice = { kind: 'synced' | 'rejected'; count: number } | null

/**
 * Bandeau réseau : hors ligne, séances en attente, puis confirmation de
 * l'envoi. C'est aussi lui qui vide la file — au montage, au retour du réseau
 * et quand l'app revient au premier plan.
 */
export default function OfflineBanner() {
  const { t } = useTranslation('common')
  const online = useOnlineStatus()
  const [pending, setPending] = useState(() => readOutbox().length)
  const [notice, setNotice] = useState<Notice>(null)

  useEffect(() => {
    let mounted = true
    const flush = async () => {
      if (!navigator.onLine || readOutbox().length === 0) return
      const { data } = await getLocalUser()
      if (!data.user || !mounted) return
      const report = await flushOutbox(data.user.id)
      if (!mounted) return
      setPending(report.pending)
      if (report.rejected) setNotice({ kind: 'rejected', count: report.rejected })
      else if (report.synced) setNotice({ kind: 'synced', count: report.synced })
    }
    const onVisible = () => { if (document.visibilityState === 'visible') void flush() }
    const onQueued = () => setPending(readOutbox().length)
    void flush()
    window.addEventListener('online', flush)
    window.addEventListener('wodbud:outbox', onQueued)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      mounted = false
      window.removeEventListener('online', flush)
      window.removeEventListener('wodbud:outbox', onQueued)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  // La confirmation s'efface d'elle-même ; un refus reste jusqu'à ce qu'on le ferme.
  useEffect(() => {
    if (notice?.kind !== 'synced') return
    const id = window.setTimeout(() => setNotice(null), 6000)
    return () => window.clearTimeout(id)
  }, [notice])

  if (!online) {
    return (
      <div className="wb-net" data-kind="offline" role="status">
        <span aria-hidden="true">◌</span>
        <span>{pending ? t('offline.offline_pending', { count: pending }) : t('offline.offline')}</span>
      </div>
    )
  }
  if (notice) {
    return (
      <div className="wb-net" data-kind={notice.kind} role="status">
        <span aria-hidden="true">{notice.kind === 'synced' ? '✓' : '!'}</span>
        <span>{t(`offline.${notice.kind}`, { count: notice.count })}</span>
        <button type="button" onClick={() => setNotice(null)} aria-label={t('actions.close')}>✕</button>
      </div>
    )
  }
  if (pending) {
    return (
      <div className="wb-net" data-kind="pending" role="status">
        <span aria-hidden="true">↻</span>
        <span>{t('offline.sending', { count: pending })}</span>
      </div>
    )
  }
  return null
}
