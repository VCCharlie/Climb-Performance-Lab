/**
 * Shared Google sign-in wrapper — tracks in-progress state so auth listeners
 * do not wipe local session while the sign-in popup is open.
 */
import { loginWithGoogle } from '../firebase';

let signInInProgress = false;

export function isGoogleSignInInProgress() {
    return signInInProgress;
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
        return 'Sign-in was cancelled.';
    }
    if (code === 'auth/network-request-failed') {
        return 'Network error. Check your connection and try again.';
    }
    if (code === 'auth/unauthorized-domain') {
        return 'This domain is not authorized for Google sign-in. Check Firebase Auth settings.';
    }
    if (code === 'auth/internal-error') {
        return 'Sign-in could not complete (often blocked by browser security or Content Security Policy). Try again, allow pop-ups, or use a different browser.';
    }
    return err?.message || 'Sign-in failed.';
}
