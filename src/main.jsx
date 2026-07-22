import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { ClimbDatabaseProvider } from './context/ClimbDatabaseContext.jsx'
import { applyTheme, readStoredTheme } from './theme/applyTheme'
import { maintainBrowserStorageOnBoot } from './utils/safeStorage.js'
import { bootstrapDeployRecovery, persistCurrentBuildId } from './utils/deployRecovery.js'
import { completeGoogleRedirectIfNeeded } from './utils/googleSignIn.js'
import {
    hasStravaOAuthReturnInUrl,
    hasPendingStravaOAuthState,
    stripStravaOAuthParamsFromUrl,
} from './utils/stravaOAuthUrl.js'

applyTheme(readStoredTheme())
maintainBrowserStorageOnBoot()
bootstrapDeployRecovery()

async function boot() {
    // Google redirect sign-in also returns ?code=&state= — finish Firebase auth before
    // stripping those params (otherwise getRedirectResult never sees the callback).
    try {
        await completeGoogleRedirectIfNeeded()
    } catch (err) {
        console.warn('[auth] Could not complete Google redirect sign-in on boot:', err)
    }

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
}

boot()
