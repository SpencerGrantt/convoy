import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './styles/index.css'
import App from './App.jsx'

const SW_UPDATE_CHECK_INTERVAL_MS = 60_000

// registerType: 'autoUpdate' only takes effect if something actually calls
// registerSW() — without this, the SW's skipWaiting()/clientsClaim() take
// over future requests but an already-open tab keeps running its old,
// already-loaded JS forever, since nothing tells it to reload.
//
// registerSW() itself only checks for an update once, at this initial call —
// the browser never re-checks sw.js on its own for a tab/installed PWA that
// just stays open. With deploys shipping every few minutes during active
// iteration, a session left open across several of them would never catch
// up until manually closed and reopened. onRegisteredSW hands back the raw
// ServiceWorkerRegistration, so poll registration.update() periodically —
// each check that finds a real change re-triggers the same activate→reload
// path the initial registerSW() already wires up for registerType: autoUpdate.
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return
    setInterval(() => registration.update(), SW_UPDATE_CHECK_INTERVAL_MS)
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
