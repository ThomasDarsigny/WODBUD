import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardLayout from './components/dashboard/DashboardLayout'
import ExercisesView from './components/dashboard/ExercisesView'
import WorkoutBuilderView from './components/dashboard/WorkoutBuilderView'

function AiView() {
  return <ComingSoon label="Assistant IA" icon="🤖" />
}

function VoteView() {
  return <ComingSoon label="Creer un vote" icon="🗳️" />
}

function ComingSoon({ label, icon }: { label: string; icon: string }) {
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
        {label} - Bientot disponible
      </p>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route
          path="/entraineur_dashboard"
          element={<Navigate to="/dashboard/exercises" replace />}
        />

        <Route
          path="/dashboard"
          element={
            <DashboardLayout>
              <Navigate to="/dashboard/exercises" replace />
            </DashboardLayout>
          }
        />
        <Route
          path="/dashboard/exercises"
          element={
            <DashboardLayout>
              <ExercisesView />
            </DashboardLayout>
          }
        />
        <Route
          path="/dashboard/workout"
          element={
            <DashboardLayout>
              <WorkoutBuilderView />
            </DashboardLayout>
          }
        />
        <Route
          path="/dashboard/ai"
          element={
            <DashboardLayout>
              <AiView />
            </DashboardLayout>
          }
        />
        <Route
          path="/dashboard/vote"
          element={
            <DashboardLayout>
              <VoteView />
            </DashboardLayout>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
