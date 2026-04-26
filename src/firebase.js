/**
 * src/firebase.js
 */
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
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