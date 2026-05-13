/**
 * src/firebase.js
 */
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

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

try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
  }
} catch (error) {
  console.error("Firebase init error:", error);
}

// EXPORT DEZE FUNCTIES OOK
export const loginWithGoogle = async () => {
    if (!auth) throw new Error("Firebase Auth not initialized");
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        console.error("Login failed:", error);
        throw error;
    }
};

export const logout = async () => {
    if (!auth) return;
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout failed:", error);
    }
};

export { db, analytics, auth, googleProvider };