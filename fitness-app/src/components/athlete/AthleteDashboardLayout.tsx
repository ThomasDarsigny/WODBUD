import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { clearAuthSessionCookies } from '../../lib/authSessionCookies'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import ActiveSessionBar from '../session/ActiveSessionBar'
import PortalOverlay from '../portal/PortalOverlay'

interface Props {
  children: ReactNode
}

export default function AthleteDashboardLayout({ children }: Props) {
  const { t } = useTranslation('common')
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const online = useOnlineStatus()

  async function handleLogout() {
    try {
      await supabase.auth.signOut()
    } catch { /* ignore */ }
    try {
      await clearAuthSessionCookies()
    } catch { /* ignore */ }
    navigate('/login')
  }

  const navItems = [
    { id: 'home', labelKey: 'athlete.nav_home', icon: 'HOME', path: '/athlete' },
    { id: 'session', labelKey: 'nav.session', icon: 'RUN', path: '/athlete/session' },
    { id: 'rank', labelKey: 'nav.rank', icon: 'RNK', path: '/athlete/rank' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--black)', color: 'var(--white)', fontFamily: 'var(--font-b)' }}>
      <aside style={{ width: collapsed ? '64px' : '220px', flexShrink: 0, background: 'var(--dark)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', transition: 'width 0.25s ease', overflow: 'hidden' }}>
        <div style={{ padding: collapsed ? '1.25rem 0' : '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', gap: '0.5rem' }}>
          {!collapsed && (
            <Link to="/" style={{ fontFamily: 'var(--font-d)', fontWeight: 900, fontSize: '1.2rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--white)', textDecoration: 'none' }}>
              WOD<span style={{ color: 'var(--orange)' }}>BUD</span>
            </Link>
          )}
          <button onClick={() => setCollapsed(!collapsed)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1rem', padding: '0.25rem', lineHeight: 1 }} aria-label="Toggle sidebar">
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        {!collapsed && (
          <div style={{ padding: '0.6rem 1.5rem 0.4rem', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--orange)', border: '1px solid rgba(255,77,0,0.3)', padding: '0.1rem 0.4rem' }}>
              {t('athlete.role_label')}
            </span>
          </div>
        )}

        <nav style={{ flex: 1, padding: '1rem 0' }}>
          {navItems.map((item) => {
            const active = location.pathname === item.path
            return (
              <Link
                key={item.id}
                to={item.path}
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: collapsed ? '0.75rem 0' : '0.75rem 1.5rem', justifyContent: collapsed ? 'center' : 'flex-start', textDecoration: 'none', color: active ? 'var(--white)' : 'var(--muted)', background: active ? 'rgba(255,77,0,0.08)' : 'transparent', borderLeft: active ? '2px solid var(--orange)' : '2px solid transparent', transition: 'all 0.15s' }}
              >
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.icon}</span>
                {!collapsed && (
                  <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.88rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {t(item.labelKey)}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div style={{ borderTop: '1px solid var(--border)', padding: collapsed ? '1rem 0' : '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-d)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--white)', flexShrink: 0 }}>
            A
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontFamily: 'var(--font-d)', fontSize: '0.82rem', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t('athlete.role_label')}
              </div>
              <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.75rem', padding: 0, fontFamily: 'var(--font-b)' }}>
                {t('actions.logout')}
              </button>
            </div>
          )}
        </div>
      </aside>

      <main style={{ flex: 1, overflow: 'auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {!online && (
          <div style={{ background: 'rgba(255,77,0,0.12)', borderBottom: '1px solid rgba(255,77,0,0.3)', padding: '0.5rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-d)', fontSize: '0.78rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--orange)', flexShrink: 0 }}>
            <span style={{ fontSize: '0.9rem' }}>◌</span>
            Mode hors-ligne — données en cache
          </div>
        )}
        <ActiveSessionBar basePath="/athlete" />
        <div style={{ flex: 1, overflow: 'auto' }}>{children}</div>
      </main>

      <PortalOverlay />
    </div>
  )
}
