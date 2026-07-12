import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/AuthProvider'
import { useAuth } from './hooks/useAuth'
import Sidebar from './components/layout/Sidebar'
import MobileNav from './components/layout/MobileNav'
import AiFloatingWidget from './components/AiFloatingWidget'
import LoadingSpinner from './components/ui/LoadingSpinner'

import Login from './pages/Login'
import Onboarding from './pages/Onboarding'

const Dashboard        = lazy(() => import('./pages/Dashboard'))
const DriverDashboard  = lazy(() => import('./pages/DriverDashboard'))
const Runs             = lazy(() => import('./pages/Runs'))
const NewRunForm       = lazy(() => import('./pages/NewRunForm'))
const RunDetailPage    = lazy(() => import('./pages/RunDetailPage'))
const Photos           = lazy(() => import('./pages/Photos'))
const Contracts        = lazy(() => import('./pages/Contracts'))
const Finances         = lazy(() => import('./pages/Finances'))
const Drivers          = lazy(() => import('./pages/Drivers'))
const Settings         = lazy(() => import('./pages/Settings'))

// Redirect to onboarding until the user completes setup — including the
// case where profile is still null (e.g. first-login auto-provisioning
// failed silently), which used to fall through and render a broken app
// with no profile data instead of ever reaching onboarding.
function AuthGate({ children }) {
  const { session, profile, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!session) return <Navigate to="/login" replace />
  if (!profile || profile.onboarding_complete === false) return <Navigate to="/onboarding" replace />
  return children
}

// Onboarding is only accessible while onboarding is incomplete
function OnboardingGate() {
  const { session, profile, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!session) return <Navigate to="/login" replace />
  if (profile?.onboarding_complete) return <Navigate to="/" replace />
  return <Onboarding />
}

// Home renders the right dashboard based on role
function Home() {
  const { profile } = useAuth()
  if (profile?.role === 'driver') return <DriverDashboard />
  return <Dashboard />
}

function AppRoutes() {
  const { session } = useAuth()

  return (
    <div className="min-h-screen bg-navy-900">
      {session && <Sidebar />}
      <div className={session ? 'md:ml-60' : ''}>
        <main role="main">
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/login"      element={session ? <Navigate to="/" replace /> : <Login />} />
              <Route path="/onboarding" element={<OnboardingGate />} />
              <Route path="/"           element={<AuthGate><Home /></AuthGate>} />
              <Route path="/runs"       element={<AuthGate><Runs /></AuthGate>} />
              <Route path="/runs/new"   element={<AuthGate><NewRunForm /></AuthGate>} />
              <Route path="/runs/:id"   element={<AuthGate><RunDetailPage /></AuthGate>} />
              <Route path="/photos"     element={<AuthGate><Photos /></AuthGate>} />
              <Route path="/contracts"  element={<AuthGate><Contracts /></AuthGate>} />
              <Route path="/finances"   element={<AuthGate><Finances /></AuthGate>} />
              <Route path="/drivers"    element={<AuthGate><Drivers /></AuthGate>} />
              <Route path="/settings"   element={<AuthGate><Settings /></AuthGate>} />
              <Route path="*"           element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
      {session && <MobileNav />}
      {session && <AiFloatingWidget />}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
