import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './hooks/AuthProvider'
import { ThemeProvider } from './hooks/ThemeProvider'
import { useAuth } from './hooks/useAuth'
import { useTheme } from './hooks/useTheme'
import Sidebar from './components/layout/Sidebar'
import MobileNav from './components/layout/MobileNav'
import AiFloatingWidget from './components/AiFloatingWidget'
import RoleSwitcher from './components/dev/RoleSwitcher'
import LoadingSpinner from './components/ui/LoadingSpinner'
import ErrorBoundary from './components/ui/ErrorBoundary'

import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Landing from './pages/Landing'
import VerifyMfa from './pages/VerifyMfa'
import RequiresGovernmentPlan from './components/billing/RequiresGovernmentPlan'
import BillingBlockedScreen from './components/billing/BillingBlockedScreen'
import { BILLING_ENABLED } from './lib/billing'

const Dashboard        = lazy(() => import('./pages/Dashboard'))
const DriverDashboard  = lazy(() => import('./pages/DriverDashboard'))
const Runs             = lazy(() => import('./pages/Runs'))
const NewRunForm       = lazy(() => import('./pages/NewRunForm'))
const RunDetailPage    = lazy(() => import('./pages/RunDetailPage'))
const Photos           = lazy(() => import('./pages/Photos'))
const Contracts        = lazy(() => import('./pages/Contracts'))
const Finances         = lazy(() => import('./pages/Finances'))
const Drivers          = lazy(() => import('./pages/Drivers'))
const Fleet            = lazy(() => import('./pages/Fleet'))
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
// `requiresPlan`, when given, blocks the route for a company on a lower
// plan (e.g. Contracts/SAM.gov matching is Government-only) — checked
// after `roles` so a role-restricted route still redirects the same way
// it always has for someone who isn't allowed there at all.
// `allowBillingBlocked` exempts a route from the trial-expired/past-due/
// canceled screen below — Settings needs this, or an owner whose trial
// just expired could never reach the billing tab to fix it.
function AuthGate({ children, roles, requiresPlan, allowBillingBlocked }) {
  const { session, profile, loading, emailMfaVerified, isDevUser, viewPlan } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!session) return <Navigate to="/login" replace />
  if (!profile || profile.onboarding_complete === false) return <Navigate to="/onboarding" replace />

  // Email 2FA is enabled but this session hasn't verified the code yet —
  // block everything behind a code-entry screen until it does, same shape
  // as the onboarding-incomplete redirect above.
  if (profile.mfa_email_enabled && !emailMfaVerified) return <VerifyMfa />

  const company = profile.companies
  const billingBlocked = BILLING_ENABLED && company && (
    (company.subscription_status === 'trialing' && new Date(company.trial_ends_at) < new Date())
    || company.subscription_status === 'past_due'
    || company.subscription_status === 'canceled'
  )
  if (billingBlocked && !allowBillingBlocked) {
    return <BillingBlockedScreen status={company.subscription_status} isOwner={profile.role === 'owner'} />
  }

  if (roles && !roles.includes(profile.role)) return <Navigate to="/" replace />
  // Plan gating is dormant for real users until BILLING_ENABLED goes live,
  // but stays live for the dev account whenever a plan preview is set (see
  // AuthProvider's viewPlan) so Standard vs Government is previewable now.
  if ((BILLING_ENABLED || (isDevUser && viewPlan)) && requiresPlan && company?.plan !== requiresPlan) {
    return <RequiresGovernmentPlan isOwner={profile.role === 'owner'} />
  }
  return children
}

// Onboarding is only accessible while onboarding is incomplete
function OnboardingGate() {
  const { session, profile, loading, authError, refreshProfile } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!session) return <Navigate to="/login" replace />
  if (profile?.onboarding_complete) return <Navigate to="/" replace />
  // A signed-in user with no profile and a recorded provisioning error would
  // otherwise fall through to the generic "Welcome to Vantar" choice screen
  // with zero indication that account setup actually failed server-side —
  // this surfaces it with a way to retry instead of a silent dead end.
  if (!profile && authError) {
    return (
      <div className="min-h-screen bg-navy-900 flex flex-col items-center justify-center px-4 text-center gap-4">
        <p className="text-fg font-bold text-lg">Couldn't set up your account</p>
        <p className="text-fg/50 text-sm max-w-sm">{authError}</p>
        <button
          onClick={refreshProfile}
          className="bg-brand-600 text-white font-bold px-5 py-2.5 rounded-xl"
        >
          Try Again
        </button>
      </div>
    )
  }
  return <Onboarding />
}

// Home renders the right dashboard based on role
function Home() {
  const { profile } = useAuth()
  if (profile?.role === 'driver') return <DriverDashboard />
  return <Dashboard />
}

// Anonymous visitors at "/" see the marketing page instead of being
// bounced to /login — every other route keeps AuthGate's strict redirect
// unchanged. Must check `loading` the same way AuthGate does: `session`
// starts null until onAuthStateChange's first fire, so gating on
// `session` alone would flash Landing at an already-logged-in user for
// one tick on every load before correcting itself.
function RootRoute() {
  const { session, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!session) return <Landing />
  return <AuthGate><Home /></AuthGate>
}

function AppRoutes() {
  const { session, profile, emailMfaVerified } = useAuth()
  const location = useLocation()
  const mfaPending = !!(profile?.mfa_email_enabled && !emailMfaVerified)
  // Nav chrome only once onboarding is actually complete — not just logged
  // in, since a mid-onboarding user has no company/runs/etc. to navigate to.
  // Also withheld while an MFA-enabled account hasn't verified this session
  // yet — VerifyMfa (rendered by AuthGate below) is a full-screen gate like
  // Login, same as onboarding, not a page with app chrome around it.
  const showNav = !!(session && profile?.onboarding_complete && !mfaPending)

  // Light mode only applies inside the authenticated app shell — signed-out
  // surfaces (landing, login, onboarding, the MFA gate) always render dark,
  // regardless of what a signed-in user last picked, since those are public/
  // pre-auth pages a visitor sees before any preference should apply.
  const { theme } = useTheme()
  useEffect(() => {
    const applyLight = showNav && theme === 'light'
    if (applyLight) document.documentElement.dataset.theme = 'light'
    else delete document.documentElement.dataset.theme
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', applyLight ? '#f5f4f1' : '#131313')
  }, [showNav, theme])

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
                <Route path="/"           element={<RootRoute />} />
                <Route path="/runs"       element={<AuthGate><Runs /></AuthGate>} />
                <Route path="/runs/new"   element={<AuthGate roles={['owner', 'dispatcher']}><NewRunForm /></AuthGate>} />
                <Route path="/runs/:id"   element={<AuthGate><RunDetailPage /></AuthGate>} />
                <Route path="/photos"     element={<AuthGate><Photos /></AuthGate>} />
                <Route path="/contracts"  element={<AuthGate roles={['owner', 'dispatcher']} requiresPlan="government"><Contracts /></AuthGate>} />
                <Route path="/finances"   element={<AuthGate roles={['owner']}><Finances /></AuthGate>} />
                <Route path="/drivers"    element={<AuthGate roles={['owner', 'dispatcher']}><Drivers /></AuthGate>} />
                <Route path="/fleet"      element={<AuthGate roles={['owner', 'dispatcher']}><Fleet /></AuthGate>} />
                <Route path="/settings"   element={<AuthGate allowBillingBlocked><Settings /></AuthGate>} />
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
      {showNav && <RoleSwitcher />}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
