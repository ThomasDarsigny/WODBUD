import { lazy, Suspense, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardLayout from './components/dashboard/DashboardLayout'
import AthleteDashboardLayout from './components/athlete/AthleteDashboardLayout'
import { supabase } from './lib/supabase'
import { clearAuthSessionCookies, syncAuthSessionCookies } from './lib/authSessionCookies'
import { isCurrentUserAdmin } from './lib/access'

// Écrans chargés à la demande. La page d'accueil et l'authentification
// restent dans le bundle initial : ce sont elles qui décident du premier
// rendu et du référencement. Tout le reste vit derrière un login, donc son
// chargement peut attendre le clic.
const AdminDashboardView = lazy(() => import('./components/dashboard/AdminDashboardView'))
const ExercisesView = lazy(() => import('./components/dashboard/ExercisesView'))
const WorkoutBuilderView = lazy(() => import('./components/dashboard/WorkoutBuilderView'))
const WorkoutsLibraryView = lazy(() => import('./components/dashboard/WorkoutsLibraryView'))
const VoteView = lazy(() => import('./components/dashboard/VoteView'))
const ClassesView = lazy(() => import('./components/dashboard/ClassesView'))
const AiCoachView = lazy(() => import('./components/dashboard/AiCoachView'))
const SettingsView = lazy(() => import('./components/dashboard/SettingsView'))
const SessionRunnerView = lazy(() => import('./components/session/SessionRunnerView'))
const RankView = lazy(() => import('./components/rank/RankView'))
const SessionJournalView = lazy(() => import('./components/session/SessionJournalView'))
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'))
const SharedRankPage = lazy(() => import('./pages/SharedRankPage'))
const AthleteHomeView = lazy(() => import('./components/athlete/AthleteHomeView'))
const AthleteVoteView = lazy(() => import('./components/athlete/AthleteVoteView'))
const JoinClassPage = lazy(() => import('./pages/JoinClassPage'))
import { useSessionStore } from './stores/sessionStore'

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
          background: 'var(--black)',
          color: 'var(--muted)'
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
          background: 'var(--black)',
          color: 'var(--muted)'
        }}
      >
        {t('status.redirect')}
      </div>
    )
  }

  return <Navigate to={target} replace />
}

function RouteFallback() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--black)', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-d)', fontSize: '0.8125rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
      WODBUD
    </div>
  )
}

function App() {
  // Une séance interrompue par un rechargement ou une relance de la PWA
  // reprend là où elle était : le chrono vit dans localStorage.
  useEffect(() => {
    useSessionStore.getState().restore()
  }, [])

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
      <Suspense fallback={<RouteFallback />}>
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

        <Route
          path="/dashboard/settings"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <SettingsView />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/rank"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <RankView />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/session"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <SessionRunnerView basePath="/dashboard" />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/journal"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <SessionJournalView />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route path="/confidentialite" element={<PrivacyPolicyPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />

        <Route path="/join/:token" element={<JoinClassPage />} />
        <Route path="/rang/:token" element={<SharedRankPage />} />
        <Route path="/rank/:token" element={<SharedRankPage />} />

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
          path="/athlete/rank"
          element={
            <ProtectedRoute>
              <AthleteDashboardLayout>
                <RankView />
              </AthleteDashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/athlete/session"
          element={
            <ProtectedRoute>
              <AthleteDashboardLayout>
                <SessionRunnerView basePath="/athlete" />
              </AthleteDashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/athlete/journal"
          element={
            <ProtectedRoute>
              <AthleteDashboardLayout>
                <SessionJournalView />
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
      </Suspense>
    </BrowserRouter>
  )
}

export default App
