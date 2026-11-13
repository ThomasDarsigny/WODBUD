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
      if (id === 'ai' || id === 'classes' || id === 'today') return !isAdmin
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
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--black)',
        color: 'var(--white)',
        fontFamily: 'var(--font-b)'
      }}
    >
      {/* Sur téléphone, pas de barre latérale : barre d'onglets en bas
          (MobileTabBar), comme une app iOS. */}
      {!isMobile && (
      <aside
        style={{
          width: rail ? '64px' : '240px',
          flexShrink: 0,
          background: 'var(--dark)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.25s ease',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            padding: rail ? '1.25rem 0' : '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: rail ? 'center' : 'space-between',
            gap: '0.5rem'
          }}
        >
          {!rail && (
            <Link
              to="/"
              style={{
                fontFamily: 'var(--font-d)',
                fontWeight: 900,
                fontSize: '1.25rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--white)',
                textDecoration: 'none'
              }}
            >
              WOD<span style={{ color: 'var(--orange)' }}>BUD</span>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: isMobile ? '1.4rem' : '1rem',
              padding: '0.25rem 0.5rem',
              lineHeight: 1
            }}
            aria-label="Toggle sidebar"
          >
            {rail ? '›' : '‹'}
          </button>
        </div>

        <nav style={{ flex: 1, padding: '1rem 0' }} aria-label={t('nav.main')}>
          {groups.map((g) => {
            const active = current?.id === g.id
            return (
              <div key={g.id} style={{ position: 'relative' }}>
                <Link
                  to={g.path}
                  aria-current={active ? 'page' : undefined}
                  title={rail ? t(g.labelKey) : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: rail ? '0.85rem 0' : '0.85rem 1.5rem',
                    justifyContent: rail ? 'center' : 'flex-start',
                    textDecoration: 'none',
                    color: active ? 'var(--white)' : 'var(--muted)',
                    background: active ? 'rgba(255,77,0,0.08)' : 'transparent',
                    borderLeft: active ? '2px solid var(--orange)' : '2px solid transparent',
                    transition: 'all 0.15s'
                  }}
                >
                  <NavIcon name={g.icon} />
                  {!rail && (
                    <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.9375rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {t(g.labelKey)}
                    </span>
                  )}
                </Link>
                <NavDot count={groupDot(g)} compact={rail} />
              </div>
            )
          })}
        </nav>

      </aside>
      )}

      <main style={{ flex: 1, overflow: 'auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
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
                <Link
                  to="/"
                  style={{
                    fontFamily: 'var(--font-d)',
                    fontWeight: 900,
                    fontSize: '1.25rem',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--white)',
                    textDecoration: 'none'
                  }}
                >
                  WOD<span style={{ color: 'var(--orange)' }}>BUD</span>
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
          <PageTransition>{children}</PageTransition>
        </div>
      </main>

      {isMobile && <MobileTabBar primary={tabItems} more={moreItems} />}

    </div>
  )
}
