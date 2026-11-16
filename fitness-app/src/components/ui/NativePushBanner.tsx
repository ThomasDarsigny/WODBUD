import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { isNativeApp } from '../../lib/platform'

/** Ce que nativePush.ts envoie (FOREGROUND_PUSH_EVENT) : repris ici pour ne pas charger le plugin sur le site. */
interface ForegroundPush { title: string; body: string; url: string | null }

/**
 * App des boutiques : une notification reçue pendant que l'app est ouverte
 * n'est pas affichée par Android. Elle apparaît ici, en haut, 6 s ;
 * la toucher mène à sa page (A4). Rien sur le site.
 */
export default function NativePushBanner() {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const [push, setPush] = useState<ForegroundPush | null>(null)

  useEffect(() => {
    if (!isNativeApp()) return
    const onPush = (e: Event) => setPush((e as CustomEvent<ForegroundPush>).detail)
    window.addEventListener('wodbud:push', onPush)
    return () => window.removeEventListener('wodbud:push', onPush)
  }, [])

  useEffect(() => {
    if (!push) return
    const timer = setTimeout(() => setPush(null), 6000)
    return () => clearTimeout(timer)
  }, [push])

  if (!push) return null

  const open = () => {
    if (push.url) navigate(push.url)
    setPush(null)
  }

  return (
    <div className="wb-push-banner" role="status" aria-live="polite">
      <button type="button" className="wb-push-banner-main" onClick={open}>
        <strong>{push.title}</strong>
        {push.body && <span>{push.body}</span>}
      </button>
      <button type="button" className="wb-push-banner-close" onClick={() => setPush(null)} aria-label={t('actions.close')}>✕</button>
    </div>
  )
}
