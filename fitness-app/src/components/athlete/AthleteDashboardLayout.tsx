import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import OfflineBanner from '../session/OfflineBanner'
import ActiveSessionBar from '../session/ActiveSessionBar'
import { markScrolled } from '../../lib/scrollEdge'
import { useIsMobile } from '../../hooks/useMediaQuery'
import NavIcon from '../navigation/NavIcon'
import type { NavIconName } from '../navigation/NavIcon'
import NavDot from '../navigation/NavDot'
import MobileTabBar from '../navigation/MobileTabBar'
import { useNotificationStore } from '../../stores/notificationStore'
import { PageTransition } from '../ui/motion'
import ErrorBoundary from '../ui/ErrorBoundary'
import { fetchMyRole } from '../../lib/profileRole'

interface Props {
  children: ReactNode
}

export default function AthleteDashboardLayout({ children }: Props) {
  const { t } = useTranslation('common')
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const isMobile = useIsMobile()
  const rail = collapsed

  // Compte perso : il a aussi les outils pour bâtir ses propres WODs
  // (créateur, ses WODs, exercices, IA). Décision provisoire du client.
  const [perso, setPerso] = useState(false)
  useEffect(() => {
    let alive = true
    fetchMyRole().then((r) => { if (alive) setPerso(r?.role === 'perso') }).catch(() => {})
    return () => { alive = false }
  }, [])

  const tools: Array<{ id: string; labelKey: string; icon: NavIconName; path: string }> = perso ? [
    { id: 'workout', labelKey: 'nav.tab_new', icon: 'workout', path: '/athlete/workout' },
    { id: 'library', labelKey: 'nav.library', icon: 'library', path: '/athlete/workouts' },
    { id: 'exercises', labelKey: 'nav.exercises', icon: 'exercises', path: '/athlete/exercises' },
    { id: 'ai', labelKey: 'nav.ai', icon: 'ai', path: '/athlete/ai' }
  ] : []

  const navItems: Array<{ id: string; labelKey: string; icon: NavIconName; path: string }> = [
    { id: 'home', labelKey: 'athlete.nav_home', icon: 'home', path: '/athlete' },
    ...tools,
    { id: 'session', labelKey: 'nav.session', icon: 'session', path: '/athlete/session' },
    { id: 'journal', labelKey: 'nav.journal', icon: 'calendar', path: '/athlete/journal' },
    { id: 'rank', labelKey: 'nav.rank', icon: 'rank', path: '/athlete/rank' },
    { id: 'records', labelKey: 'nav.records', icon: 'records', path: '/athlete/records' },
    { id: 'groups', labelKey: 'nav.groups', icon: 'community', path: '/athlete/groups' },
    { id: 'settings', labelKey: 'nav.settings', icon: 'settings', path: '/athlete/settings' },
  ]

  // L'athlète n'a pas d'entrée « Votes » : les votes vivent sur l'accueil,
  // c'est donc lui qui porte la pastille.
  const { openVotes, newBadges, rankUp, plannedToday, refresh } = useNotificationStore()
  useEffect(() => { void refresh() }, [refresh, location.pathname])

  function dotFor(id: string): number {
    if (id === 'home') return openVotes
    if (id === 'journal') return plannedToday
    if (id === 'rank') return newBadges + (rankUp ? 1 : 0)
    return 0
  }

  // Téléphone : accueil, séance, journal, rang en onglets ; le reste dans « Plus ».
  // Perso : « Créer » prend la place de « Journal » (qui passe dans « Plus »).
  const tabIds = perso ? ['home', 'workout', 'session', 'rank'] : ['home', 'session', 'journal', 'rank']
  const toMobile = (item: (typeof navItems)[number]) => ({
    id: item.id,
    label: item.id === 'rank' ? t('nav.tab_rank') : t(item.labelKey),
    icon: item.icon,
    path: item.path,
    // « Groupes » s'allume aussi sur les pages des communautés.
    match: item.id === 'groups' ? ['/athlete/groups', '/athlete/communities'] : undefined,
    dot: dotFor(item.id)
  })
  const tabItems = navItems.filter((i) => tabIds.includes(i.id)).map(toMobile)
  const moreItems = navItems.filter((i) => !tabIds.includes(i.id)).map(toMobile)

  return (
    <div className="wb-shell">
      {/* Même logique que le tableau de bord coach : sur téléphone, barre
          d'onglets en bas à la place de la barre latérale. */}
      {!isMobile && (
      <aside className={`wb-side wb-side--athlete${rail ? ' is-rail' : ''}`}>
        <div className="wb-side-head">
          {!rail && (
            <Link to="/" className="wb-brand">
              WOD<span>BUD</span>
            </Link>
          )}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="wb-side-toggle"
            aria-label={rail ? t('nav.expand_menu') : t('nav.collapse_menu')}
            aria-expanded={!rail}
          >
            {rail ? '›' : '‹'}
          </button>
        </div>

        {!rail && (
          <div className="wb-side-role">
            <span>{t('athlete.role_label')}</span>
          </div>
        )}

        <nav className="wb-side-nav" aria-label={t('nav.main')}>
          {navItems.map((item) => {
            const active = location.pathname === item.path || (item.id === 'groups' && location.pathname.startsWith('/athlete/communities'))
            return (
              <div key={item.id} className="wb-side-item">
                <Link
                  to={item.path}
                  aria-current={active ? 'page' : undefined}
                  title={rail ? t(item.labelKey) : undefined}
                  aria-label={rail ? t(item.labelKey) : undefined}
                  className={`wb-side-link${active ? ' is-on' : ''}`}
                >
                  <NavIcon name={item.icon} />
                  {!rail && <span className="wb-side-label">{t(item.labelKey)}</span>}
                </Link>
                <NavDot count={dotFor(item.id)} compact={rail} />
              </div>
            )
          })}
        </nav>

      </aside>
      )}

      <main className="wb-main">
        {/* Barre du haut en verre : le contenu défile dessous (même conteneur de
            défilement) et s'estompe contre elle une fois qu'on a défilé. */}
        <div className={isMobile ? 'wb-scroller wb-has-tabbar' : 'wb-scroller'} onScroll={markScrolled}>
          <div className="wb-topgroup">
            {isMobile && (
              <div className="wb-mobile-top">
                <Link to="/" className="wb-brand">
                  WOD<span>BUD</span>
                </Link>
              </div>
            )}
            <OfflineBanner />
            <ActiveSessionBar basePath="/athlete" />
          </div>
          <PageTransition><ErrorBoundary key={location.pathname}>{children}</ErrorBoundary></PageTransition>
        </div>
      </main>

      {isMobile && <MobileTabBar primary={tabItems} more={moreItems} />}

    </div>
  )
}
