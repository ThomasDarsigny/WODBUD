import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, useDragControls, type PanInfo } from 'motion/react'
import NavIcon, { type NavIconName } from './NavIcon'
import { useBackToClose } from '../../hooks/useBackToClose'

export interface MobileNavItem {
  id: string
  label: string
  icon: NavIconName
  path: string
  /** Pastille de notification (0 = rien). */
  dot?: number
}

/** Petit retour tactile là où le navigateur le permet (Android) ; iOS l'ignore. */
function tap() {
  try { navigator.vibrate?.(6) } catch { /* indisponible */ }
}

/**
 * Navigation du téléphone, façon iOS : une barre d'onglets fixée en bas
 * (4 sections + « Plus »), et « Plus » ouvre une feuille qui monte du bas
 * avec le reste. Remplace le tiroir latéral, hors de portée du pouce.
 * La barre respecte la zone de la barre d'accueil de l'iPhone.
 */
export default function MobileTabBar({ primary, more }: { primary: MobileNavItem[]; more: MobileNavItem[] }) {
  const { t } = useTranslation('common')
  const { pathname } = useLocation()
  // La feuille est liée à l'écran où on l'a ouverte : changer d'écran la ferme.
  // Ses liens la ferment aussi pour de bon (sinon « retour » vers cet écran
  // la rouvrirait) et remplacent l'entrée d'historique de la feuille ouverte.
  const [sheetPath, setSheetPath] = useState<string | null>(null)
  const sheetOpen = sheetPath === pathname
  const setSheetOpen = (open: boolean) => setSheetPath(open ? pathname : null)
  useBackToClose(sheetOpen, () => setSheetPath(null))

  const isActive = (path: string) => pathname === path || (path !== '/athlete' && pathname.startsWith(`${path}/`))
  const moreActive = more.some((i) => isActive(i.path))
  const moreDots = more.reduce((n, i) => n + (i.dot ?? 0), 0)
  // La poignée se tire vers le bas pour fermer, comme une feuille iOS. Le
  // glisser part de la poignée et de l'en-tête seulement : la liste défile.
  const drag = useDragControls()
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 90 || info.velocity.y > 600) setSheetOpen(false)
  }

  useEffect(() => {
    if (!sheetOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSheetPath(null) }
    window.addEventListener('keydown', onKey)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [sheetOpen])

  return (
    <>
      <nav className="wb-tabbar" aria-label={t('nav.main')}>
        {primary.map((item) => {
          const active = isActive(item.path)
          return (
            <Link
              key={item.id}
              to={item.path}
              onClick={tap}
              className={`wb-tab${active ? ' is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span className="wb-tab-icon">
                <NavIcon name={item.icon} size={24} />
                {(item.dot ?? 0) > 0 && <span className="wb-tab-dot" aria-hidden="true" />}
              </span>
              <span className="wb-tab-label">{item.label}</span>
              {(item.dot ?? 0) > 0 && <span className="wb-sr">{t('nav.new_items', { count: item.dot })}</span>}
            </Link>
          )
        })}
        <button
          type="button"
          onClick={() => { tap(); setSheetOpen(true) }}
          className={`wb-tab${moreActive || sheetOpen ? ' is-active' : ''}`}
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
        >
          <span className="wb-tab-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="5" cy="12" r="2" fill="currentColor" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
              <circle cx="19" cy="12" r="2" fill="currentColor" />
            </svg>
            {moreDots > 0 && <span className="wb-tab-dot" aria-hidden="true" />}
          </span>
          <span className="wb-tab-label">{t('nav.more')}</span>
          {moreDots > 0 && <span className="wb-sr">{t('nav.new_items', { count: moreDots })}</span>}
        </button>
      </nav>

      {sheetOpen && (
        <div className="wb-sheet-backdrop" onClick={() => setSheetOpen(false)}>
          <motion.div
            className="wb-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={t('nav.more')}
            onClick={(e) => e.stopPropagation()}
            drag="y"
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 1 }}
            onDragEnd={onDragEnd}
          >
            <div className="wb-sheet-handle" onPointerDown={(e) => drag.start(e)}>
              <div className="wb-sheet-grabber" aria-hidden="true" />
            </div>
            <div className="wb-sheet-head" onPointerDown={(e) => drag.start(e)}>
              <h2>{t('nav.more')}</h2>
              <button type="button" className="wb-sheet-close" onClick={() => setSheetOpen(false)} aria-label={t('nav.close_menu')}>
                ✕
              </button>
            </div>
            <ul className="wb-sheet-list">
              {more.map((item) => {
                const active = isActive(item.path)
                return (
                  <li key={item.id}>
                    <Link to={item.path} replace onClick={() => { tap(); setSheetPath(null) }} className={`wb-sheet-row${active ? ' is-active' : ''}`} aria-current={active ? 'page' : undefined}>
                      <span className="wb-sheet-icon"><NavIcon name={item.icon} size={20} /></span>
                      <span className="wb-sheet-label">{item.label}</span>
                      {(item.dot ?? 0) > 0 && <span className="wb-sheet-badge">{item.dot}</span>}
                      <span className="wb-sheet-chevron" aria-hidden="true">›</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </motion.div>
        </div>
      )}
    </>
  )
}
