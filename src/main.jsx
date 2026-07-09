import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './utils/leaflet-setup'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { applyTheme, readStoredTheme } from './theme/applyTheme'
import { maintainBrowserStorageOnBoot } from './utils/safeStorage.js'

applyTheme(readStoredTheme())
maintainBrowserStorageOnBoot()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
