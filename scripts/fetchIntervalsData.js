/**
 * scripts/fetchIntervalsData.js — DEPRECATED
 *
 * This file has been replaced by scripts/nightlySync.js which:
 *  - Uses ESM imports (compatible with "type": "module" in package.json)
 *  - Reads credentials from environment variables, never hardcoded
 *  - Writes directly to Firebase Firestore via firebase-admin
 *  - Is triggered nightly by .github/workflows/nightly-sync.yml
 *
 * See scripts/nightlySync.js for the current implementation.
 */