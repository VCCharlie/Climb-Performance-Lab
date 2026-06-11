import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './utils/leaflet-setup'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { registerPwaServiceWorker } from './pwa/registerPwa.js'

registerPwaServiceWorker()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
