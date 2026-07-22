/**
 * src/firebase.js
 */
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import {
    getAuth,
    initializeAuth,
    browserLocalPersistence,
    browserPopupRedirectResolver,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signOut,
} from "firebase/auth";
import { markExplicitSignOut } from "./utils/sessionData.js";

// Firebase Web API keys are public client identifiers (not secrets). Restrict abuse in
// Google Cloud Console (API key HTTP referrer / bundle id). Optional env override for
// forks or key rotation — GitHub Pages must either set VITE_FIREBASE_API_KEY in CI or
// rely on this fallback so Auth/Firestore initialize (see .github/workflows/static.yml).
const firebaseApiKey =
    import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBNWzcEXhzra-iCkHiZj_FdYUf0NcKvHAk";

const firebaseConfig = {
  apiKey: firebaseApiKey,
  authDomain: "climb-performance-lab.firebaseapp.com",
  projectId: "climb-performance-lab",
  storageBucket: "climb-performance-lab.firebasestorage.app",
  messagingSenderId: "97555677694",
  appId: "1:97555677694:web:fa84b31445639e260cc0af",
  measurementId: "G-G4WLCWCXFK"
};

let db;
let analytics;
let auth;
const googleProvider = new GoogleAuthProvider();

function initFirebaseAuth(app) {
    if (typeof window === 'undefined') {
        return getAuth(app);
    }
    try {
        return initializeAuth(app, {
            persistence: browserLocalPersistence,
            popupRedirectResolver: browserPopupRedirectResolver,
        });
    } catch (error) {
        if (error?.code === 'auth/already-initialized') {
            return getAuth(app);
        }
        throw error;
    }
}

try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = initFirebaseAuth(app);
  if (typeof window !== 'undefined') {
    try {
      analytics = getAnalytics(app);
    } catch (analyticsError) {
      console.warn('Firebase Analytics unavailable:', analyticsError);
    }
  }
} catch (error) {
  console.error("Firebase init error:", error);
}

/** Popup sign-in; falls back to full-page redirect when the popup cannot complete. */
export const loginWithGoogle = async () => {
    if (!auth) throw new Error("Firebase Auth not initialized");
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        if (
            error?.code === 'auth/popup-blocked'
            || error?.code === 'auth/popup-closed-by-user'
            || error?.code === 'auth/cancelled-popup-request'
        ) {
            await signInWithRedirect(auth, googleProvider);
            return null;
        }
        console.error("Login failed:", error);
        throw error;
    }
};

/** Full-page redirect sign-in (more reliable on GitHub Pages and strict browsers). */
export const loginWithGoogleRedirect = async () => {
    if (!auth) throw new Error("Firebase Auth not initialized");
    await signInWithRedirect(auth, googleProvider);
};

/** Complete a pending redirect sign-in when the app loads after Google returns. */
export const consumeGoogleRedirectResult = async () => {
    if (!auth) return null;
    try {
        const result = await getRedirectResult(auth);
        return result?.user ?? null;
    } catch (error) {
        console.error("Redirect sign-in failed:", error);
        throw error;
    }
};

export const logout = async () => {
    if (!auth) return;
    try {
        markExplicitSignOut();
        await signOut(auth);
    } catch (error) {
        console.error("Logout failed:", error);
    }
};

export { db, analytics, auth, googleProvider };
