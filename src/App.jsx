import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './hooks/AuthProvider'
import { useAuth } from './hooks/useAuth'
import Sidebar from './components/layout/Sidebar'
import MobileNav from './components/layout/MobileNav'
import AiFloatingWidget from './components/AiFloatingWidget'
import LoadingSpinner from './components/ui/LoadingSpinner'
import ErrorBoundary from './components/ui/ErrorBoundary'

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
const VehicleInspection = lazy(() => import('./pages/VehicleInspection'))
const MyCompliance     = lazy(() => import('./pages/MyCompliance'))
const MyTeam           = lazy(() => import('./pages/MyTeam'))
const MyEarnings       = lazy(() => import('./pages/MyEarnings'))
const Messages         = lazy(() => import('./pages/Messages'))
const MileageLog       = lazy(() => import('./pages/MileageLog'))
const IftaReport       = lazy(() => import('./pages/IftaReport'))

// Redirect to onboarding until the user completes setup — including the
// case where profile is still null (e.g. first-login auto-provisioning
// failed silently), which used to fall through and render a broken app
// with no profile data instead of ever reaching onboarding.
// `roles`, when given, enforces the same restriction server-side navigation
// hides in Sidebar/MobileNav (e.g. Finances is owner-only there) — those
// nav arrays only ever controlled link *visibility*, not whether the route
// itself would render for someone who typed the URL directly. Every role
// still passes through the session/onboarding checks first so a
// role-restricted deep link redirects to onboarding or login exactly like
// any other route, rather than leaking a "not allowed" state pre-auth.
function AuthGate({ children, roles }) {
  const { session, profile, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!session) return <Navigate to="/login" replace />
  if (!profile || profile.onboarding_complete === false) return <Navigate to="/onboarding" replace />
  if (roles && !roles.includes(profile.role)) return <Navigate to="/" replace />
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
  const { session, profile } = useAuth()
  const location = useLocation()
  // Nav chrome only once onboarding is actually complete — not just logged
  // in, since a mid-onboarding user has no company/runs/etc. to navigate to.
  const showNav = !!(session && profile?.onboarding_complete)

  return (
    <div className="min-h-screen bg-navy-900">
      {/* Sidebar/MobileNav get their own boundaries, separate from the
          route content's — previously a crash in either (e.g. a Realtime
          channel-name collision between the two, since both are always
          mounted at once regardless of viewport) had no boundary above it
          at all and blanked the entire app instead of just that one region. */}
      {showNav && (
        <ErrorBoundary>
          <Sidebar />
        </ErrorBoundary>
      )}
      <div className={showNav ? 'md:ml-60' : ''}>
        <main role="main">
          {/* Keyed by pathname so navigating away from a crashed route resets
              the boundary — otherwise its tripped state persists forever. */}
          <ErrorBoundary key={location.pathname}>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/login"      element={session ? <Navigate to="/" replace /> : <Login />} />
                <Route path="/onboarding" element={<OnboardingGate />} />
                <Route path="/"           element={<AuthGate><Home /></AuthGate>} />
                <Route path="/runs"       element={<AuthGate><Runs /></AuthGate>} />
                <Route path="/runs/new"   element={<AuthGate><NewRunForm /></AuthGate>} />
                <Route path="/runs/:id"   element={<AuthGate><RunDetailPage /></AuthGate>} />
                <Route path="/photos"     element={<AuthGate><Photos /></AuthGate>} />
                <Route path="/contracts"  element={<AuthGate roles={['owner', 'dispatcher']}><Contracts /></AuthGate>} />
                <Route path="/finances"   element={<AuthGate roles={['owner']}><Finances /></AuthGate>} />
                <Route path="/drivers"    element={<AuthGate roles={['owner', 'dispatcher']}><Drivers /></AuthGate>} />
                <Route path="/settings"   element={<AuthGate><Settings /></AuthGate>} />
                <Route path="/inspections/new" element={<AuthGate><VehicleInspection /></AuthGate>} />
                <Route path="/my-compliance"   element={<AuthGate><MyCompliance /></AuthGate>} />
                <Route path="/my-team"         element={<AuthGate><MyTeam /></AuthGate>} />
                <Route path="/my-earnings"     element={<AuthGate><MyEarnings /></AuthGate>} />
                <Route path="/messages"        element={<AuthGate><Messages /></AuthGate>} />
                <Route path="/mileage"         element={<AuthGate><MileageLog /></AuthGate>} />
                <Route path="/ifta-report"     element={<AuthGate roles={['owner']}><IftaReport /></AuthGate>} />
                <Route path="*"           element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      {showNav && (
        <ErrorBoundary>
          <MobileNav />
        </ErrorBoundary>
      )}
      {showNav && <AiFloatingWidget />}
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
