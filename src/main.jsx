import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './styles/index.css'
import App from './App.jsx'

// registerType: 'autoUpdate' only takes effect if something actually calls
// registerSW() — without this, the SW's skipWaiting()/clientsClaim() take
// over future requests but an already-open tab keeps running its old,
// already-loaded JS forever, since nothing tells it to reload.
registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
