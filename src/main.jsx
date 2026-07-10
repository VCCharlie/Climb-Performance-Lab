import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { ClimbDatabaseProvider } from './context/ClimbDatabaseContext.jsx'
import { applyTheme, readStoredTheme } from './theme/applyTheme'
import { maintainBrowserStorageOnBoot } from './utils/safeStorage.js'
import { bootstrapDeployRecovery, persistCurrentBuildId } from './utils/deployRecovery.js'
import {
    hasStravaOAuthReturnInUrl,
    hasPendingStravaOAuthState,
    stripStravaOAuthParamsFromUrl,
} from './utils/stravaOAuthUrl.js'

applyTheme(readStoredTheme())
maintainBrowserStorageOnBoot()
bootstrapDeployRecovery()

// Remove stale Strava ?code= before React mounts (blocks Google sign-in after logout).
if (hasStravaOAuthReturnInUrl() && !hasPendingStravaOAuthState()) {
    stripStravaOAuthParamsFromUrl()
}

const root = createRoot(document.getElementById('root'))
root.render(
  <StrictMode>
    <ErrorBoundary>
      <ClimbDatabaseProvider>
        <App />
      </ClimbDatabaseProvider>
    </ErrorBoundary>
  </StrictMode>,
)
persistCurrentBuildId()
