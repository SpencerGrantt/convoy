import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/AuthProvider'
import { useAuth } from './hooks/useAuth'
import MobileNav from './components/layout/MobileNav'
import LoadingSpinner from './components/ui/LoadingSpinner'

import Login         from './pages/Login'
import Dashboard     from './pages/Dashboard'
import Runs          from './pages/Runs'
import NewRunForm    from './pages/NewRunForm'
import RunDetailPage from './pages/RunDetailPage'
import Photos        from './pages/Photos'
import Contracts     from './pages/Contracts'
import Finances      from './pages/Finances'
import Drivers       from './pages/Drivers'
import AiAssistant   from './pages/AiAssistant'
import Settings      from './pages/Settings'

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
