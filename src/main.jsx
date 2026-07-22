import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { ClimbDatabaseProvider } from './context/ClimbDatabaseContext.jsx'
import { applyTheme, readStoredTheme } from './theme/applyTheme'
import { maintainBrowserStorageOnBoot } from './utils/safeStorage.js'
import { bootstrapDeployRecoveryForBoot, persistCurrentBuildId } from './utils/deployRecovery.js'
import { completeGoogleRedirectIfNeeded } from './utils/googleSignIn.js'
import { stripStaleStravaOAuthParamsFromUrl } from './utils/stravaOAuthUrl.js'
import { registerClimbLabServiceWorker } from './utils/registerServiceWorker.js'

applyTheme(readStoredTheme())
maintainBrowserStorageOnBoot()

async function boot() {
    await bootstrapDeployRecoveryForBoot()

    try {
        await completeGoogleRedirectIfNeeded()
    } catch (err) {
        console.warn('[auth] Could not complete Google redirect sign-in on boot:', err)
    }

    stripStaleStravaOAuthParamsFromUrl()

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

    await registerClimbLabServiceWorker()
}

boot()
