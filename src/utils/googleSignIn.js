/**
 * Shared Google sign-in wrapper — tracks in-progress state so auth listeners
 * do not wipe local session while the sign-in popup is open.
 */
import {
    loginWithGoogle,
    consumeGoogleRedirectResult,
} from '../firebase';

let signInInProgress = false;
/** @type {Promise<import('firebase/auth').User | null> | null} */
let redirectCompletionPromise = null;

export function isGoogleSignInInProgress() {
    return signInInProgress;
}

/** Reset stuck in-progress flag (e.g. after a crashed popup flow). */
export function resetGoogleSignInProgress() {
    signInInProgress = false;
}

/**
 * Finish a pending redirect sign-in once per page load.
 * Must run before stripping ?code= from the URL (Strava cleanup uses the same param names).
 */
export function completeGoogleRedirectIfNeeded() {
    if (typeof window === 'undefined') return Promise.resolve(null);
    if (!redirectCompletionPromise) {
        redirectCompletionPromise = consumeGoogleRedirectResult().catch((err) => {
            redirectCompletionPromise = null;
            throw err;
        });
    }
    return redirectCompletionPromise;
}

/** @internal Vitest-only — module-level redirect promise must not leak across tests. */
export function resetGoogleRedirectCompletionForTests() {
    redirectCompletionPromise = null;
}

/**
 * GitHub Pages and similar static hosts: browser pop-ups often close immediately
 * (third-party cookies, tracking protection) and Firebase reports popup-closed-by-user.
 * @deprecated Prefer loginWithGoogle() popup + redirect fallback; kept for tests/host checks.
 */
export function shouldUseGoogleRedirectSignIn() {
    if (typeof window === 'undefined') return false;
    const { hostname } = window.location;
    return hostname.endsWith('.github.io');
}

/** @returns {Promise<import('firebase/auth').User | null>} */
export async function runGoogleSignIn() {
    if (signInInProgress) return null;
    signInInProgress = true;
    try {
        return await loginWithGoogle();
    } finally {
        signInInProgress = false;
    }
}

/** User-facing message for Firebase Auth error codes. */
export function googleSignInErrorMessage(err) {
    const code = err?.code;
    if (code === 'auth/popup-blocked') {
        return 'Pop-up was blocked. Allow pop-ups for this site and try again.';
    }
    if (code === 'auth/popup-closed-by-user') {
        return 'Sign-in was cancelled. If you did not close the window, try again — the app will use a full-page Google sign-in when pop-ups fail.';
    }
    if (code === 'auth/network-request-failed') {
        return 'Network error. Check your connection and try again.';
    }
    if (code === 'auth/unauthorized-domain') {
        return 'This domain is not authorized for Google sign-in. Add this site under Firebase Console → Authentication → Settings → Authorized domains.';
    }
    if (code === 'auth/internal-error') {
        return 'Sign-in could not complete (often blocked by browser security or Content Security Policy). Try again, allow pop-ups, or use a different browser.';
    }
    return err?.message || 'Sign-in failed.';
}
