import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { clearAuthSessionCookies } from '../../lib/authSessionCookies'
import { isCurrentUserAdmin } from '../../lib/access'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'

type NavItem = {
  id: string
  labelKey: string
  ns?: 'common' | 'workouts'
  icon: string
  path: string
  disabled?: boolean
  soon?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { id: 'admin', labelKey: 'nav.admin', icon: 'ADM', path: '/dashboard/admin' },
  { id: 'exercises', labelKey: 'nav.exercises', icon: 'EX', path: '/dashboard/exercises' },
  {
    id: 'workout',
    labelKey: 'new',
    ns: 'workouts',
    icon: 'WOD',
    path: '/dashboard/workout'
  },
  { id: 'library', labelKey: 'nav.library', icon: 'LIB', path: '/dashboard/workouts' },
  { id: 'classes', labelKey: 'nav.classes', icon: 'CLS', path: '/dashboard/classes' },
  {
    id: 'ai',
    labelKey: 'nav.ai',
    icon: 'AI',
    path: '/dashboard/ai'
  },
  {
    id: 'vote',
    labelKey: 'nav.vote',
    icon: 'VOTE',
    path: '/dashboard/vote'
  }
]

interface Props {
  children: ReactNode
}

export default function DashboardLayout({ children }: Props) {
  const { t } = useTranslation(['common', 'workouts'])
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
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
      <aside
        style={{
          width: collapsed ? '64px' : '240px',
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
            padding: collapsed ? '1.25rem 0' : '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            gap: '0.5rem'
          }}
        >
          {!collapsed && (
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
              FORGE<span style={{ color: 'var(--orange)' }}>X</span>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: '1rem',
              padding: '0.25rem',
              lineHeight: 1
            }}
            aria-label="Toggle sidebar"
          >
            {collapsed ? '›' : '‹'}
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
                      padding: collapsed ? '0.75rem 0' : '0.75rem 1.5rem',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      opacity: 0.4,
                      cursor: 'not-allowed'
                    }}
                  >
                    <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.icon}</span>
                    {!collapsed && (
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
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: collapsed ? '0.75rem 0' : '0.75rem 1.5rem',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      textDecoration: 'none',
                      color: active ? 'var(--white)' : 'var(--muted)',
                      background: active ? 'rgba(255,77,0,0.08)' : 'transparent',
                      borderLeft: active
                        ? '2px solid var(--orange)'
                        : '2px solid transparent',
                      transition: 'all 0.15s'
                    }}
                  >
                    <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.icon}</span>
                    {!collapsed && (
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
            padding: collapsed ? '1rem 0' : '1rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            justifyContent: collapsed ? 'center' : 'flex-start'
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
          {!collapsed && (
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

      <main style={{ flex: 1, overflow: 'auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
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
        <div style={{ flex: 1, overflow: 'auto' }}>{children}</div>
      </main>
    </div>
  )
}