/**
 * Repair stuck sign-in in the normal browser profile (works in incognito but not here).
 * Clears stale OAuth URL params, logout flags, PWA caches, and corrupted Firebase auth storage.
 */
import { signOut } from 'firebase/auth';
import { auth } from '../firebase.js';
import { RECOVERY_ATTEMPT_KEY } from './deployRecovery.js';
import { resetGoogleSignInProgress } from './googleSignIn.js';
import {
    stripStravaOAuthParamsFromUrl,
    clearPendingStravaOAuthState,
} from './stravaOAuthUrl.js';
import { clearExplicitSignOutFlag } from './sessionData.js';
import { repairLocalStorageQuota } from './safeStorage.js';

async function deleteFirebaseAuthIndexedDb() {
    if (typeof indexedDB === 'undefined') return;

    let dbNames = [];
    try {
        if (typeof indexedDB.databases === 'function') {
            const listed = await indexedDB.databases();
            dbNames = listed
                .map((db) => db.name)
                .filter((name) => name && /firebase/i.test(name));
        }
    } catch {
        dbNames = [];
    }

    if (dbNames.length === 0) {
        dbNames = ['firebaseLocalStorageDb', 'firebase-heartbeat-database'];
    }

    await Promise.all(
        dbNames.map(
            (name) => new Promise((resolve) => {
                const request = indexedDB.deleteDatabase(name);
                request.onsuccess = () => resolve();
                request.onerror = () => resolve();
                request.onblocked = () => resolve();
            }),
        ),
    );
}

async function unregisterServiceWorkersAndCaches() {
    if ('serviceWorker' in navigator) {
        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map((registration) => registration.unregister()));
        } catch {
            /* ignore */
        }
    }

    if ('caches' in window) {
        try {
            const keys = await caches.keys();
            await Promise.all(keys.map((key) => caches.delete(key)));
        } catch {
            /* ignore */
        }
    }
}

/**
 * One-click repair from the sign-in screen. Reloads the page when done.
 */
export async function repairSignInBrowserState() {
    stripStravaOAuthParamsFromUrl();
    clearPendingStravaOAuthState();
    clearExplicitSignOutFlag();
    resetGoogleSignInProgress();

    if (typeof sessionStorage !== 'undefined') {
        try {
            sessionStorage.removeItem(RECOVERY_ATTEMPT_KEY);
        } catch {
            /* ignore */
        }
    }

    try {
        repairLocalStorageQuota();
    } catch (err) {
        console.warn('[repairSignIn] localStorage quota repair failed:', err);
    }

    await unregisterServiceWorkersAndCaches();

    try {
        if (auth) await signOut(auth);
    } catch {
        /* ignore — may already be signed out */
    }

    await deleteFirebaseAuthIndexedDb();

    window.location.replace(window.location.origin + window.location.pathname);
}
