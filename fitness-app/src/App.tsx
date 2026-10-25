import { lazy, Suspense, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
const CommunitiesView = lazy(() => import('./components/community/CommunitiesView'))
const LandingPage = lazy(() => import('./pages/LandingPage'))
const CommunityPage = lazy(() => import('./components/community/CommunityPage'))
const CommunityInviteRedirect = lazy(() => import('./pages/CommunityInviteRedirect'))
const SessionRunnerView = lazy(() => import('./components/session/SessionRunnerView'))
const RankView = lazy(() => import('./components/rank/RankView'))
const SessionJournalView = lazy(() => import('./components/session/SessionJournalView'))
const RecordsView = lazy(() => import('./components/records/RecordsView'))
const CoachTodayView = lazy(() => import('./components/home/CoachTodayView'))
const WelcomePage = lazy(() => import('./pages/WelcomePage'))
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'))
const SharedRankPage = lazy(() => import('./pages/SharedRankPage'))
const AthleteHomeView = lazy(() => import('./components/athlete/AthleteHomeView'))
const AthleteVoteView = lazy(() => import('./components/athlete/AthleteVoteView'))
const JoinClassPage = lazy(() => import('./pages/JoinClassPage'))
import { useSessionStore } from './stores/sessionStore'
import { isInstalledApp } from './lib/platform'
import { fetchMyRole, homeFor } from './lib/profileRole'

/**
 * Garde des écrans connectés. `requireRole` : un compte qui n'a pas encore dit
 * s'il est coach ou athlète passe d'abord par « Bienvenue » (047).
 */
function ProtectedRoute({ children, adminOnly = false, requireRole = true }: { children: ReactNode; adminOnly?: boolean; requireRole?: boolean }) {
  const { t } = useTranslation('common')
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [admin, setAdmin] = useState(false)
  const [needsRole, setNeedsRole] = useState(false)

  useEffect(() => {
    let mounted = true

    const bootstrap = async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!mounted) return
      setAuthenticated(Boolean(session))
      const isAdmin = session ? await isCurrentUserAdmin() : false
      setAdmin(isAdmin)
      if (session && requireRole && !isAdmin) {
        // Le rôle ne bloque jamais l'app sur une erreur réseau : on laisse passer.
        const mine = await fetchMyRole().catch(() => null)
        if (mounted) setNeedsRole(Boolean(mine && mine.role === null))
      }
      if (mounted) setLoading(false)
    }

    bootstrap()

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setAuthenticated(Boolean(session))
      // supabase-js garde son verrou de session pendant ce callback : un appel
      // Supabase attendu ici ne l'obtient jamais et fige l'app. On sort du callback.
      setTimeout(() => {
        void (session ? isCurrentUserAdmin() : Promise.resolve(false)).then((isAdmin) => {
          if (!mounted) return
          setAdmin(isAdmin)
          setLoading(false)
        })
      }, 0)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [requireRole])

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

  if (needsRole && requireRole) {
    return <Navigate to="/bienvenue" replace />
  }

  return <>{children}</>
}

/** La landing est réservée au site web : l'app installée ouvre le compte. */
function WebOnlyLanding() {
  if (isInstalledApp()) return <Navigate to="/entraineur_dashboard" replace />
  return <LandingPage />
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
      if (!session) { setTarget('/login'); return }
      if (await isCurrentUserAdmin()) { setTarget('/dashboard/admin'); return }
      // Coach → son accueil, athlète → le sien, pas encore répondu → Bienvenue.
      const mine = await fetchMyRole().catch(() => null)
      if (mounted) setTarget(mine ? homeFor(mine.role) : '/dashboard/today')
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
        <Route path="/" element={<WebOnlyLanding />} />
        <Route path="/landing" element={<WebOnlyLanding />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route
          path="/bienvenue"
          element={
            // Clé propre : sans elle, React réutilise la garde de la route
            // précédente (même place dans l'arbre) avec son ancien état, et
            // /bienvenue ↔ espace se renvoient l'un à l'autre.
            <ProtectedRoute key="welcome" requireRole={false}>
              <WelcomePage />
            </ProtectedRoute>
          }
        />

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
          path="/dashboard/communities"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <CommunitiesView />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/communities/:id"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <CommunityPage />
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
          path="/dashboard/today"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <CoachTodayView />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/records"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <RecordsView />
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
          path="/athlete/settings"
          element={
            <ProtectedRoute>
              <AthleteDashboardLayout>
                <SettingsView />
              </AthleteDashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/athlete/communities"
          element={
            <ProtectedRoute>
              <AthleteDashboardLayout>
                <CommunitiesView />
              </AthleteDashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/athlete/communities/:id"
          element={
            <ProtectedRoute>
              <AthleteDashboardLayout>
                <CommunityPage />
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
          path="/athlete/records"
          element={
            <ProtectedRoute>
              <AthleteDashboardLayout>
                <RecordsView />
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

        <Route
          path="/communities/:id"
          element={
            <ProtectedRoute>
              <CommunityInviteRedirect />
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
