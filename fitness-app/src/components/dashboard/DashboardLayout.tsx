import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { isCurrentUserAdmin } from '../../lib/access'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import ActiveSessionBar from '../session/ActiveSessionBar'
import { useIsMobile } from '../../hooks/useMediaQuery'
import NavIcon from '../navigation/NavIcon'
import type { NavIconName } from '../navigation/NavIcon'
import NavDot from '../navigation/NavDot'
import MobileTabBar, { type MobileNavItem } from '../navigation/MobileTabBar'
import { useNotificationStore } from '../../stores/notificationStore'

type NavItem = {
  id: string
  labelKey: string
  ns?: 'common' | 'workouts'
  icon: NavIconName
  path: string
  disabled?: boolean
  soon?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { id: 'admin', labelKey: 'nav.admin', icon: 'admin', path: '/dashboard/admin' },
  { id: 'exercises', labelKey: 'nav.exercises', icon: 'exercises', path: '/dashboard/exercises' },
  { id: 'workout', labelKey: 'new', ns: 'workouts', icon: 'workout', path: '/dashboard/workout' },
  { id: 'library', labelKey: 'nav.library', icon: 'library', path: '/dashboard/workouts' },
  { id: 'session', labelKey: 'nav.session', icon: 'session', path: '/dashboard/session' },
  { id: 'journal', labelKey: 'nav.journal', icon: 'calendar', path: '/dashboard/journal' },
  { id: 'rank', labelKey: 'nav.rank', icon: 'rank', path: '/dashboard/rank' },
  { id: 'classes', labelKey: 'nav.classes', icon: 'classes', path: '/dashboard/classes' },
  { id: 'ai', labelKey: 'nav.ai', icon: 'ai', path: '/dashboard/ai' },
  { id: 'vote', labelKey: 'nav.vote', icon: 'vote', path: '/dashboard/vote' },
  { id: 'communities', labelKey: 'nav.communities', icon: 'community', path: '/dashboard/communities' },
  { id: 'settings', labelKey: 'nav.settings', icon: 'settings', path: '/dashboard/settings' }
]

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
  const online = useOnlineStatus()

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

  const navItems = useMemo(() => {
    return NAV_ITEMS.filter((item) => {
      if (item.id === 'admin') return isAdmin
      if (item.id === 'ai' || item.id === 'classes') return !isAdmin
      return true
    })
  }, [isAdmin])

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

  // Téléphone : 4 onglets à portée du pouce, le reste dans « Plus ».
  const label = (item: NavItem) => (item.ns === 'workouts' ? t(item.labelKey, { ns: 'workouts' }) : t(item.labelKey))
  const TAB_LABELS: Record<string, string> = { workout: 'nav.tab_new', admin: 'nav.tab_admin', classes: 'nav.tab_classes', rank: 'nav.tab_rank' }
  const tabIds = isAdmin ? ['admin', 'workout', 'session', 'rank'] : ['workout', 'session', 'classes', 'rank']
  const toMobile = (item: NavItem, short: boolean): MobileNavItem => ({
    id: item.id,
    label: short && TAB_LABELS[item.id] ? t(TAB_LABELS[item.id]) : label(item),
    icon: item.icon,
    path: item.path,
    dot: dotFor(item.id)
  })
  const tabItems = tabIds
    .map((id) => navItems.find((i) => i.id === id))
    .filter((i): i is NavItem => Boolean(i))
    .map((i) => toMobile(i, true))
  const moreItems = navItems.filter((i) => !tabIds.includes(i.id)).map((i) => toMobile(i, false))

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

        <nav style={{ flex: 1, padding: '1rem 0' }}>
          {navItems.map((item) => {
            const active = location.pathname === item.path
            return (
              <div key={item.id} style={{ position: 'relative' }}>
                {item.disabled ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: rail ? '0.75rem 0' : '0.75rem 1.5rem',
                      justifyContent: rail ? 'center' : 'flex-start',
                      opacity: 0.4,
                      cursor: 'not-allowed'
                    }}
                  >
                    <NavIcon name={item.icon} />
                    {!rail && (
                      <>
                        <span
                          style={{
                            fontFamily: 'var(--font-d)',
                            fontSize: '0.9375rem',
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase'
                          }}
                        >
                          {item.ns === 'workouts' ? t(item.labelKey, { ns: 'workouts' }) : t(item.labelKey)}
                        </span>
                        {item.soon && (
                          <span
                            style={{
                              marginLeft: 'auto',
                              fontFamily: 'var(--font-d)',
                              fontSize: '0.6875rem',
                              letterSpacing: '0.15em',
                              textTransform: 'uppercase',
                              color: 'var(--orange)',
                              border: '1px solid rgba(255,77,0,0.3)',
                              padding: '0.1rem 0.35rem'
                            }}
                          >
                            {t('status.soon')}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <Link
                    to={item.path}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: rail ? '0.75rem 0' : '0.75rem 1.5rem',
                      justifyContent: rail ? 'center' : 'flex-start',
                      textDecoration: 'none',
                      color: active ? 'var(--white)' : 'var(--muted)',
                      background: active ? 'rgba(255,77,0,0.08)' : 'transparent',
                      borderLeft: active
                        ? '2px solid var(--orange)'
                        : '2px solid transparent',
                      transition: 'all 0.15s'
                    }}
                  >
                    <NavIcon name={item.icon} />
                    {!rail && (
                      <span
                        style={{
                          fontFamily: 'var(--font-d)',
                          fontSize: '0.9375rem',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase'
                        }}
                      >
                        {item.ns === 'workouts' ? t(item.labelKey, { ns: 'workouts' }) : t(item.labelKey)}
                      </span>
                    )}
                  </Link>
                )}
                <NavDot count={dotFor(item.id)} compact={rail} />
              </div>
            )
          })}
        </nav>

      </aside>
      )}

      <main style={{ flex: 1, overflow: 'auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {isMobile && (
          <div
            className="wb-mobile-top"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              padding: '0.6rem 1rem',
              borderBottom: '1px solid var(--border)',
              background: 'var(--dark)',
              flexShrink: 0,
              position: 'sticky',
              top: 0,
              zIndex: 100
            }}
          >
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
        {!online && (
          <div
            style={{
              background: 'rgba(255,77,0,0.12)',
              borderBottom: '1px solid rgba(255,77,0,0.3)',
              padding: '0.5rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontFamily: 'var(--font-d)',
              fontSize: '0.6875rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--orange)',
              flexShrink: 0
            }}
          >
            <span style={{ fontSize: '0.9375rem' }}>◌</span>
            Mode hors-ligne — donnees en cache
          </div>
        )}
        <ActiveSessionBar basePath="/dashboard" />
        <div className={isMobile ? 'wb-has-tabbar' : undefined} style={{ flex: 1, overflow: 'auto' }}>{children}</div>
      </main>

      {isMobile && <MobileTabBar primary={tabItems} more={moreItems} />}

    </div>
  )
}