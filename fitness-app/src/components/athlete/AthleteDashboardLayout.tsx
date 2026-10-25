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

interface Props {
  children: ReactNode
}

export default function AthleteDashboardLayout({ children }: Props) {
  const { t } = useTranslation('common')
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const isMobile = useIsMobile()
  const rail = collapsed

  const navItems: Array<{ id: string; labelKey: string; icon: NavIconName; path: string }> = [
    { id: 'home', labelKey: 'athlete.nav_home', icon: 'home', path: '/athlete' },
    { id: 'session', labelKey: 'nav.session', icon: 'session', path: '/athlete/session' },
    { id: 'journal', labelKey: 'nav.journal', icon: 'calendar', path: '/athlete/journal' },
    { id: 'rank', labelKey: 'nav.rank', icon: 'rank', path: '/athlete/rank' },
    { id: 'records', labelKey: 'nav.records', icon: 'records', path: '/athlete/records' },
    { id: 'communities', labelKey: 'nav.communities', icon: 'community', path: '/athlete/communities' },
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
  const tabIds = ['home', 'session', 'journal', 'rank']
  const toMobile = (item: (typeof navItems)[number]) => ({
    id: item.id,
    label: item.id === 'rank' ? t('nav.tab_rank') : t(item.labelKey),
    icon: item.icon,
    path: item.path,
    dot: dotFor(item.id)
  })
  const tabItems = navItems.filter((i) => tabIds.includes(i.id)).map(toMobile)
  const moreItems = navItems.filter((i) => !tabIds.includes(i.id)).map(toMobile)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--black)', color: 'var(--white)', fontFamily: 'var(--font-b)' }}>
      {/* Même logique que le tableau de bord coach : sur téléphone, barre
          d'onglets en bas à la place de la barre latérale. */}
      {!isMobile && (
      <aside style={{
        width: rail ? '64px' : '220px',
        flexShrink: 0, background: 'var(--dark)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.25s ease', overflow: 'hidden'
      }}>
        <div style={{ padding: rail ? '1.25rem 0' : '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: rail ? 'center' : 'space-between', gap: '0.5rem' }}>
          {!rail && (
            <Link to="/" style={{ fontFamily: 'var(--font-d)', fontWeight: 900, fontSize: '1.25rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--white)', textDecoration: 'none' }}>
              WOD<span style={{ color: 'var(--orange)' }}>BUD</span>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: isMobile ? '1.4rem' : '1rem', padding: '0.25rem 0.5rem', lineHeight: 1 }}
            aria-label="Toggle sidebar"
          >
            {rail ? '›' : '‹'}
          </button>
        </div>

        {!rail && (
          <div style={{ padding: '0.6rem 1.5rem 0.4rem', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--orange)', border: '1px solid rgba(255,77,0,0.3)', borderRadius: 12, padding: '0.1rem 0.4rem' }}>
              {t('athlete.role_label')}
            </span>
          </div>
        )}

        <nav style={{ flex: 1, padding: '1rem 0' }}>
          {navItems.map((item) => {
            const active = location.pathname === item.path
            return (
              <div key={item.id} style={{ position: 'relative' }}>
              <Link
                to={item.path}
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: rail ? '0.75rem 0' : '0.75rem 1.5rem', justifyContent: rail ? 'center' : 'flex-start', textDecoration: 'none', color: active ? 'var(--white)' : 'var(--muted)', background: active ? 'rgba(255,77,0,0.08)' : 'transparent', borderLeft: active ? '2px solid var(--orange)' : '2px solid transparent', transition: 'all 0.15s' }}
              >
                <NavIcon name={item.icon} />
                {!rail && (
                  <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.9375rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {t(item.labelKey)}
                  </span>
                )}
              </Link>
              <NavDot count={dotFor(item.id)} compact={rail} />
              </div>
            )
          })}
        </nav>

      </aside>
      )}

      <main style={{ flex: 1, overflow: 'auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Barre du haut en verre : le contenu défile dessous (même conteneur de
            défilement) et s'estompe contre elle une fois qu'on a défilé. */}
        <div className={isMobile ? 'wb-scroller wb-has-tabbar' : 'wb-scroller'} onScroll={markScrolled}>
          <div className="wb-topgroup">
            {isMobile && (
              <div className="wb-mobile-top">
                <Link to="/" style={{ fontFamily: 'var(--font-d)', fontWeight: 900, fontSize: '1.25rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--white)', textDecoration: 'none' }}>
                  WOD<span style={{ color: 'var(--orange)' }}>BUD</span>
                </Link>
              </div>
            )}
            <OfflineBanner />
            <ActiveSessionBar basePath="/athlete" />
          </div>
          <PageTransition>{children}</PageTransition>
        </div>
      </main>

      {isMobile && <MobileTabBar primary={tabItems} more={moreItems} />}

    </div>
  )
}
