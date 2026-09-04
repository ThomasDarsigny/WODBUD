import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { clearAuthSessionCookies } from '../../lib/authSessionCookies'
import { isCurrentUserAdmin } from '../../lib/access'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import ActiveSessionBar from '../session/ActiveSessionBar'
import PortalOverlay from '../portal/PortalOverlay'
import { useIsMobile } from '../../hooks/useMediaQuery'
import NavIcon from '../navigation/NavIcon'
import type { NavIconName } from '../navigation/NavIcon'

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
  { id: 'rank', labelKey: 'nav.rank', icon: 'rank', path: '/dashboard/rank' },
  { id: 'classes', labelKey: 'nav.classes', icon: 'classes', path: '/dashboard/classes' },
  { id: 'ai', labelKey: 'nav.ai', icon: 'ai', path: '/dashboard/ai' },
  { id: 'vote', labelKey: 'nav.vote', icon: 'vote', path: '/dashboard/vote' },
  { id: 'settings', labelKey: 'nav.settings', icon: 'settings', path: '/dashboard/settings' }
]

interface Props {
  children: ReactNode
}

export default function DashboardLayout({ children }: Props) {
  const { t } = useTranslation(['common', 'workouts'])
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const isMobile = useIsMobile()
  // Dans le tiroir, on veut toujours les libellés : le mode réduit n'a de sens
  // que sur une barre latérale permanente.
  const rail = isMobile ? false : collapsed
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
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      setIsAdmin(session ? await isCurrentUserAdmin() : false)
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

  async function handleLogout() {
    await supabase.auth.signOut()
    await clearAuthSessionCookies()
    navigate('/login')
  }

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
      {/* Sur téléphone la barre latérale sort du flux et devient un tiroir :
          240 px fixes, c'est les deux tiers d'un écran de 360 px. */}
      <aside
        style={{
          width: isMobile ? '260px' : rail ? '64px' : '240px',
          flexShrink: 0,
          background: 'var(--dark)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          transition: isMobile ? 'transform 0.25s ease' : 'width 0.25s ease',
          overflow: 'hidden',
          ...(isMobile
            ? {
                position: 'fixed' as const,
                top: 0,
                bottom: 0,
                left: 0,
                zIndex: 300,
                transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)'
              }
            : null)
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
                fontSize: '1.2rem',
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
            onClick={() => (isMobile ? setDrawerOpen(false) : setCollapsed(!collapsed))}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: isMobile ? '1.4rem' : '1rem',
              padding: '0.25rem 0.5rem',
              lineHeight: 1
            }}
            aria-label={isMobile ? t('nav.close_menu') : 'Toggle sidebar'}
          >
            {isMobile ? '✕' : rail ? '›' : '‹'}
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
                            fontSize: '0.88rem',
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
                              fontSize: '0.6rem',
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
                    onClick={() => setDrawerOpen(false)}
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
                          fontSize: '0.88rem',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase'
                        }}
                      >
                        {item.ns === 'workouts' ? t(item.labelKey, { ns: 'workouts' }) : t(item.labelKey)}
                      </span>
                    )}
                  </Link>
                )}
              </div>
            )
          })}
        </nav>

        <div
          style={{
            borderTop: '1px solid var(--border)',
            padding: rail ? '1rem 0' : '1rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            justifyContent: rail ? 'center' : 'flex-start'
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--orange)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-d)',
              fontWeight: 700,
              fontSize: '0.9rem',
              color: 'var(--black)',
              flexShrink: 0
            }}
          >
            C
          </div>
          {!rail && (
            <div style={{ overflow: 'hidden' }}>
              <div
                style={{
                  fontFamily: 'var(--font-d)',
                  fontSize: '0.82rem',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                Coach
              </div>
              <button
                onClick={handleLogout}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  padding: 0,
                  fontFamily: 'var(--font-b)'
                }}
              >
                {t('actions.logout')}
              </button>
            </div>
          )}
        </div>
      </aside>

      {isMobile && drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 250 }}
        />
      )}

      <main style={{ flex: 1, overflow: 'auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {isMobile && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
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
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label={t('nav.open_menu')}
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                color: 'var(--white)',
                cursor: 'pointer',
                fontSize: '1.1rem',
                lineHeight: 1,
                padding: '0.5rem 0.7rem',
                minHeight: 40
              }}
            >
              ☰
            </button>
            <Link
              to="/"
              style={{
                fontFamily: 'var(--font-d)',
                fontWeight: 900,
                fontSize: '1.05rem',
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
              fontSize: '0.78rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--orange)',
              flexShrink: 0
            }}
          >
            <span style={{ fontSize: '0.9rem' }}>◌</span>
            Mode hors-ligne — donnees en cache
          </div>
        )}
        <ActiveSessionBar basePath="/dashboard" />
        <div style={{ flex: 1, overflow: 'auto' }}>{children}</div>
      </main>

      <PortalOverlay />
    </div>
  )
}