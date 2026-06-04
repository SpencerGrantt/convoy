import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/AuthProvider'
import { useAuth } from './hooks/useAuth'
import MobileNav from './components/layout/MobileNav'
import LoadingSpinner from './components/ui/LoadingSpinner'

// Eagerly load only the login screen — everything else is lazy
import Login from './pages/Login'

// Lazy load all app screens to keep initial bundle small
const Dashboard     = lazy(() => import('./pages/Dashboard'))
const Runs          = lazy(() => import('./pages/Runs'))
const NewRunForm    = lazy(() => import('./pages/NewRunForm'))
const RunDetailPage = lazy(() => import('./pages/RunDetailPage'))
const Photos        = lazy(() => import('./pages/Photos'))
const Contracts     = lazy(() => import('./pages/Contracts'))
const Finances      = lazy(() => import('./pages/Finances'))
const Drivers       = lazy(() => import('./pages/Drivers'))
const AiAssistant   = lazy(() => import('./pages/AiAssistant'))
const Settings      = lazy(() => import('./pages/Settings'))

function AuthGate({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!session) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  const { session } = useAuth()
  return (
    <>
      <main role="main">
        <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/"          element={<AuthGate><Dashboard /></AuthGate>} />
          <Route path="/runs"      element={<AuthGate><Runs /></AuthGate>} />
          <Route path="/runs/new"  element={<AuthGate><NewRunForm /></AuthGate>} />
          <Route path="/runs/:id"  element={<AuthGate><RunDetailPage /></AuthGate>} />
          <Route path="/photos"    element={<AuthGate><Photos /></AuthGate>} />
          <Route path="/contracts" element={<AuthGate><Contracts /></AuthGate>} />
          <Route path="/finances"  element={<AuthGate><Finances /></AuthGate>} />
          <Route path="/drivers"   element={<AuthGate><Drivers /></AuthGate>} />
          <Route path="/ai"        element={<AuthGate><AiAssistant /></AuthGate>} />
          <Route path="/settings"  element={<AuthGate><Settings /></AuthGate>} />
          <Route path="*"          element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </main>
      {session && <MobileNav />}
    </>
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
