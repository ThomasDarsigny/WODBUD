import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { isCurrentUserAdmin } from '../../lib/access'
import OfflineBanner from '../session/OfflineBanner'
import ActiveSessionBar from '../session/ActiveSessionBar'
import { markScrolled } from '../../lib/scrollEdge'
import { useIsMobile } from '../../hooks/useMediaQuery'
import NavIcon from '../navigation/NavIcon'
import NavDot from '../navigation/NavDot'
import MobileTabBar, { type MobileNavItem } from '../navigation/MobileTabBar'
import { useNotificationStore } from '../../stores/notificationStore'
import { PageTransition } from '../ui/motion'
import ErrorBoundary from '../ui/ErrorBoundary'
import { activeGroup, activeLeaf, buildNav, groupPaths, LEAVES, type NavGroup, type NavLeaf } from '../../lib/coachNav'


interface Props {
  children: ReactNode
}

export default function DashboardLayout({ children }: Props) {
  const { t } = useTranslation(['common', 'workouts'])
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const isMobile = useIsMobile()
  const rail = collapsed

  useEffect(() => {
    let mounted = true

    const loadUserRole = async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession()
      if (!mounted) return
      setIsAdmin(session ? await isCurrentUserAdmin() : false)
    }

    loadUserRole()

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      // Hors du callback : voir App.tsx, un appel Supabase attendu ici fige l'app.
      setTimeout(() => {
        void (session ? isCurrentUserAdmin() : Promise.resolve(false)).then((isAdmin) => {
          if (mounted) setIsAdmin(isAdmin)
        })
      }, 0)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Cinq entrées (3.4) : les pages sont regroupées, les adresses ne changent pas.
  const groups = useMemo(() => {
    const visible = new Set(LEAVES.map((l) => l.id).filter((id) => {
      if (id === 'admin') return isAdmin
      if (id === 'ai' || id === 'classes' || id === 'today' || id === 'groups') return !isAdmin
      return true
    }))
    return buildNav(visible)
  }, [isAdmin])
  const current = activeGroup(groups, location.pathname)
  const currentLeaf = activeLeaf(current, location.pathname)
  const showTabs = Boolean(current && current.leaves.length > 1)

  // Une seule lecture au montage : les pastilles n'ont pas besoin d'être
  // temps réel, elles se rafraîchissent au changement d'écran.
  const { openVotes, newBadges, rankUp, plannedToday, refresh } = useNotificationStore()
  useEffect(() => { void refresh() }, [refresh, location.pathname])

  function dotFor(id: string): number {
    if (id === 'vote') return openVotes
    if (id === 'journal') return plannedToday
    if (id === 'rank') return newBadges + (rankUp ? 1 : 0)
    return 0
  }

  const groupDot = (g: NavGroup) => g.leaves.reduce((n, l) => n + dotFor(l.id), 0)
  const leafLabel = (leaf: NavLeaf, short = false) => {
    if (short && leaf.tabKey) return t(leaf.tabKey)
    return leaf.ns === 'workouts' ? t(leaf.labelKey, { ns: 'workouts' }) : t(leaf.labelKey)
  }

  // Téléphone : les quatre premiers groupes en onglets, « Plus » ouvre le reste.
  const tabItems: MobileNavItem[] = groups
    .filter((g) => g.id !== 'more')
    .slice(0, 4)
    .map((g) => ({ id: g.id, label: t(g.tabKey), icon: g.icon, path: g.path, match: groupPaths(g), dot: groupDot(g) }))
  const moreItems: MobileNavItem[] = (groups.find((g) => g.id === 'more')?.leaves ?? [])
    .map((l) => ({ id: l.id, label: leafLabel(l), icon: l.icon, path: l.path, dot: dotFor(l.id) }))

  return (
    <div className="wb-shell">
      {/* Sur téléphone, pas de barre latérale : barre d'onglets en bas
          (MobileTabBar), comme une app iOS. */}
      {!isMobile && (
      <aside className={`wb-side${rail ? ' is-rail' : ''}`}>
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

        <nav className="wb-side-nav" aria-label={t('nav.main')}>
          {groups.map((g) => {
            const active = current?.id === g.id
            return (
              <div key={g.id} className="wb-side-item">
                <Link
                  to={g.path}
                  aria-current={active ? 'page' : undefined}
                  title={rail ? t(g.labelKey) : undefined}
                  aria-label={rail ? t(g.labelKey) : undefined}
                  className={`wb-side-link${active ? ' is-on' : ''}`}
                >
                  <NavIcon name={g.icon} />
                  {!rail && <span className="wb-side-label">{t(g.labelKey)}</span>}
                </Link>
                <NavDot count={groupDot(g)} compact={rail} />
              </div>
            )
          })}
        </nav>

      </aside>
      )}

      <main className="wb-main">
        {/* Barre du haut en verre : le contenu défile dessous (même conteneur de
            défilement) et s'estompe contre elle une fois qu'on a défilé. */}
        <div
          className={isMobile ? 'wb-scroller wb-has-tabbar' : 'wb-scroller'}
          onScroll={markScrolled}
          style={{ '--section-tabs-h': showTabs ? 'var(--section-tabs-size)' : '0px', '--page-top-h': isMobile ? 'var(--mobile-top-h)' : '0px' } as CSSProperties}
        >
          <div className="wb-topgroup">
            {isMobile && (
              <div className="wb-mobile-top">
                <Link to="/" className="wb-brand">
                  WOD<span>BUD</span>
                </Link>
              </div>
            )}
            <OfflineBanner />
            <ActiveSessionBar basePath="/dashboard" />
          </div>
          {showTabs && current && (
            <nav className="wb-section-tabs" aria-label={t(current.labelKey)}>
              {current.leaves.map((l) => {
                const on = currentLeaf?.id === l.id
                return (
                  <Link key={l.id} to={l.path} className={`wb-section-tab${on ? ' is-on' : ''}`} aria-current={on ? 'page' : undefined}>
                    {leafLabel(l, true)}
                    {dotFor(l.id) > 0 && <span className="wb-section-dot" aria-hidden="true" />}
                  </Link>
                )
              })}
            </nav>
          )}
          <PageTransition><ErrorBoundary key={location.pathname}>{children}</ErrorBoundary></PageTransition>
        </div>
      </main>

      {isMobile && <MobileTabBar primary={tabItems} more={moreItems} />}

    </div>
  )
}
