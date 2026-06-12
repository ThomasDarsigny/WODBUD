import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardLayout from './components/dashboard/DashboardLayout'
import AdminDashboardView from './components/dashboard/AdminDashboardView'
import ExercisesView from './components/dashboard/ExercisesView'
import WorkoutBuilderView from './components/dashboard/WorkoutBuilderView'
import WorkoutsLibraryView from './components/dashboard/WorkoutsLibraryView'
import VoteView from './components/dashboard/VoteView'
import ClassesView from './components/dashboard/ClassesView'
import AiCoachView from './components/dashboard/AiCoachView'
import AthleteDashboardLayout from './components/athlete/AthleteDashboardLayout'
import AthleteHomeView from './components/athlete/AthleteHomeView'
import AthleteVoteView from './components/athlete/AthleteVoteView'
import JoinClassPage from './pages/JoinClassPage'
import { supabase } from './lib/supabase'
import { clearAuthSessionCookies, syncAuthSessionCookies } from './lib/authSessionCookies'
import { isCurrentUserAdmin } from './lib/access'

function ComingSoon({ labelKey, icon }: { labelKey: string; icon: string }) {
  const { t } = useTranslation('common')
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: '1rem',
        color: 'var(--muted)'
      }}
    >
      <span style={{ fontSize: '3rem', opacity: 0.3 }}>{icon}</span>
      <p
        style={{
          fontFamily: 'var(--font-d)',
          fontSize: '1rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase'
        }}
      >
        {t(labelKey)} - {t('status.soon')}
      </p>
    </div>
  )
}

function ProtectedRoute({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { t } = useTranslation('common')
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [admin, setAdmin] = useState(false)

  useEffect(() => {
    let mounted = true

    const bootstrap = async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!mounted) return
      setAuthenticated(Boolean(session))
      setAdmin(session ? await isCurrentUserAdmin() : false)
      setLoading(false)
    }

    bootstrap()

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      setAuthenticated(Boolean(session))
      setAdmin(session ? await isCurrentUserAdmin() : false)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#0a0a0a',
          color: '#9f9890'
        }}
      >
        {t('status.session_check')}
      </div>
    )
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />
  }

  if (adminOnly && !admin) {
    return <Navigate to="/dashboard/exercises" replace />
  }

  return <>{children}</>
}

function DashboardHomeRedirect() {
  const { t } = useTranslation('common')
  const [target, setTarget] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const resolveTarget = async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!mounted) return
      setTarget(session && (await isCurrentUserAdmin()) ? '/dashboard/admin' : '/dashboard/exercises')
    }

    resolveTarget()

    return () => {
      mounted = false
    }
  }, [])

  if (!target) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#0a0a0a',
          color: '#9f9890'
        }}
      >
        {t('status.redirect')}
      </div>
    )
  }

  return <Navigate to={target} replace />
}

function App() {
  useEffect(() => {
    let mounted = true

    const bootstrapCookies = async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!mounted) return

      if (session) {
        await syncAuthSessionCookies(session)
      } else {
        await clearAuthSessionCookies()
      }
    }

    bootstrapCookies()

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        await syncAuthSessionCookies(session)
      } else {
        await clearAuthSessionCookies()
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route
          path="/entraineur_dashboard"
          element={
            <ProtectedRoute>
              <DashboardHomeRedirect />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DashboardHomeRedirect />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute adminOnly>
              <DashboardLayout>
                <AdminDashboardView />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/exercises"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ExercisesView />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/workout"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <WorkoutBuilderView />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/workouts"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <WorkoutsLibraryView />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/ai"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <AiCoachView />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/vote"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <VoteView />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/classes"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ClassesView />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route path="/join/:token" element={<JoinClassPage />} />

        <Route
          path="/athlete"
          element={
            <ProtectedRoute>
              <AthleteDashboardLayout>
                <AthleteHomeView />
              </AthleteDashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/athlete/vote/:sessionId"
          element={
            <ProtectedRoute>
              <AthleteDashboardLayout>
                <AthleteVoteView />
              </AthleteDashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
