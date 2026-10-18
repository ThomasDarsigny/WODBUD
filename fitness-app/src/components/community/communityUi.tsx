import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/** Petits éléments partagés par les écrans de communauté. */

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', margin: '0 0 0.6rem' }}>
      {children}
    </p>
  )
}

export function Avatar({ name, url, size = 36 }: { name: string; url: string | null; size?: number }) {
  if (url) {
    return <img src={url} alt='' style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }} />
  }
  return (
    <span aria-hidden='true' style={{ width: size, height: size, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--surface)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-d)', fontWeight: 700, fontSize: size * 0.42, color: 'var(--muted)', flexShrink: 0 }}>
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

export function Notice({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'error' }) {
  return (
    <p role={tone === 'error' ? 'alert' : undefined} style={{ color: tone === 'error' ? 'var(--orange)' : 'var(--muted)', fontSize: '0.8125rem', lineHeight: 1.5, margin: '0 0 1rem' }}>
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

export const cardBox = { border: '1px solid var(--border)', background: 'var(--dark)', padding: '0.85rem 1rem' } as const
