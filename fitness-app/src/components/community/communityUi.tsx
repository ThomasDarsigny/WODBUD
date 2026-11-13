import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/** Petits éléments partagés par les écrans de communauté. */

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="wb-commu-label">{children}</p>
  )
}

export function Avatar({ name, url, size = 36 }: { name: string; url: string | null; size?: number }) {
  // La taille vient de l'appel : une seule variable CSS.
  const sized = { '--av': `${size}px` } as CSSProperties
  if (url) return <img src={url} alt='' className='wb-avatar' style={sized} />
  return (
    <span aria-hidden='true' className='wb-avatar wb-avatar--empty' style={sized}>
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

export function Notice({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'error' }) {
  return (
    <p role={tone === 'error' ? 'alert' : undefined} className={`wb-commu-notice${tone === 'error' ? ' is-error' : ''}`}>
      {children}
    </p>
  )
}

/** « il y a 3 h » dans la langue de l'interface. */
export function useTimeAgo() {
  const { i18n } = useTranslation()
  return (iso: string) => {
    const rtf = new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' })
    const diff = (new Date(iso).getTime() - Date.now()) / 1000
    const abs = Math.abs(diff)
    if (abs < 60) return rtf.format(Math.round(diff), 'second')
    if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
    if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
    return rtf.format(Math.round(diff / 86400), 'day')
  }
}

