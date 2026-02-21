/**
 * scripts/nightlySync.js
 *
 * Nightly automation: fetches the last 14 days of Intervals.icu cycling activities
 * via the existing Cloud Function and upserts them into Firebase Firestore.
 *
 * Usage (local dry-run, requires a .env file — see README):
 *   node --env-file=.env scripts/nightlySync.js --dry-run
 *
 * Usage (production, called by GitHub Actions):
 *   node scripts/nightlySync.js
 *
 * Required environment variables:
 *   FIREBASE_SERVICE_ACCOUNT  — Full JSON content of the Firebase service account key
 *   INTERVALS_ATHLETE_ID      — e.g. "i34047"
 *   INTERVALS_API_KEY         — Your Intervals.icu API key
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ─── Constants ────────────────────────────────────────────────────────────────

const CLOUD_FUNCTION_URL = 'https://sync-intervals-97555677694.europe-west1.run.app';
const FIRESTORE_COLLECTION = 'activities';
const LOOKBACK_DAYS = 14;
const SPORT_TYPES = ['Ride', 'VirtualRide'];

// Firestore limits batch writes to 500 documents at a time.
const FIRESTORE_BATCH_LIMIT = 500;

// ─── Config ───────────────────────────────────────────────────────────────────

/**
 * Reads and validates all required environment variables.
 * Exits the process immediately if any are missing.
 * @returns {{ serviceAccount: object, athleteId: string, apiKey: string, isDryRun: boolean }}
 */
function loadConfig() {
    const requiredVars = ['FIREBASE_SERVICE_ACCOUNT', 'INTERVALS_ATHLETE_ID', 'INTERVALS_API_KEY'];

    for (const varName of requiredVars) {
        if (!process.env[varName]) {
            console.error(`[ERROR] Ontbrekende environment variabele: ${varName}`);
            process.exit(1);
        }
    }

    let serviceAccount;
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch {
        console.error('[ERROR] FIREBASE_SERVICE_ACCOUNT is geen geldige JSON. Controleer de secret waarde.');
        process.exit(1);
    }

    const isDryRun = process.argv.includes('--dry-run');

    return {
        serviceAccount,
        athleteId: process.env.INTERVALS_ATHLETE_ID,
        apiKey: process.env.INTERVALS_API_KEY,
        isDryRun,
    };
}

// ─── Date Helpers ─────────────────────────────────────────────────────────────

/**
 * Calculates the start and end date strings for a rolling lookback window.
 * @param {number} lookbackDays — Number of days to look back from today.
 * @returns {{ startDate: string, endDate: string }} ISO date strings (YYYY-MM-DD).
 */
function getDateRange(lookbackDays) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - lookbackDays);

    return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
    };
}

// ─── Cloud Function Call ──────────────────────────────────────────────────────

/**
 * Calls the Cloud Function to fetch and transform activities from Intervals.icu.
 * The Cloud Function handles all API auth and data transformation — we reuse it
 * exactly as the front-end does, ensuring consistent data shapes in Firestore.
 *
 * @param {{ athleteId: string, apiKey: string, startDate: string, endDate: string }} params
 * @returns {Promise<object[]>} Transformed activity objects ready for Firestore.
 */
async function fetchFromCloudFunction({ athleteId, apiKey, startDate, endDate }) {
    console.log(`[SYNC] Activiteiten ophalen van ${startDate} t/m ${endDate}...`);

    const payload = {
        start_date: startDate,
        end_date: endDate,
        sport_types: SPORT_TYPES,
        // Cloud Function prefers its own secrets, but we pass as fallback
        // for environments where the Cloud Function secrets aren't set.
        athlete_id: athleteId,
        api_key: apiKey,
        debug: false,
    };

    const response = await fetch(CLOUD_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cloud Function gaf fout ${response.status}: ${errorText}`);
    }

    const activities = await response.json();

    if (!Array.isArray(activities)) {
        throw new Error(`Onverwacht response van Cloud Function: geen array ontvangen.`);
    }

    return activities;
}

// ─── Firestore Upsert ─────────────────────────────────────────────────────────

/**
 * Splits an array into chunks of a maximum size.
 * Needed because Firestore batches are capped at 500 operations.
 * @template T
 * @param {T[]} array
 * @param {number} size
 * @returns {T[][]}
 */
function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

/**
 * Upserts (set + merge) a list of activities into Firestore.
 * Uses batched writes for efficiency and respects Firestore's 500-doc batch limit.
 * `merge: true` ensures we never accidentally overwrite fields not returned by the
 * Cloud Function (e.g. user-added notes or manual overrides).
 *
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {object[]} activities
 * @param {boolean} isDryRun — When true, logs what would be written but does nothing.
 * @returns {Promise<number>} Number of successfully upserted documents.
 */
async function upsertToFirestore(db, activities, isDryRun) {
    const validActivities = activities.filter((act) => act && act.id);

    if (validActivities.length === 0) {
        console.log('[SYNC] Geen activiteiten om op te slaan.');
        return 0;
    }

    if (isDryRun) {
        console.log(`[DRY-RUN] Zou ${validActivities.length} activiteiten opslaan in Firestore:`);
        validActivities.slice(0, 5).forEach((act) =>
            console.log(`  → ${act.id} | ${act.date} | ${act.title}`)
        );
        if (validActivities.length > 5) {
            console.log(`  ... en ${validActivities.length - 5} meer.`);
        }
        return validActivities.length;
    }

    const chunks = chunkArray(validActivities, FIRESTORE_BATCH_LIMIT);
    let totalSaved = 0;

    for (const [index, chunk] of chunks.entries()) {
        const batch = db.batch();

        for (const activity of chunk) {
            const docRef = db.collection(FIRESTORE_COLLECTION).doc(String(activity.id));
            batch.set(docRef, activity, { merge: true });
        }

        await batch.commit();
        totalSaved += chunk.length;
        console.log(
            `[SYNC] Batch ${index + 1}/${chunks.length} opgeslagen (${chunk.length} activiteiten)`
        );
    }

    return totalSaved;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function runNightlySync() {
    console.log('[SYNC] === Nightly Intervals.icu → Firebase Sync ===');

    const config = loadConfig();

    if (config.isDryRun) {
        console.log('[DRY-RUN] Modus actief — er wordt NIET naar Firebase geschreven.');
    }

    // Initialise Firebase Admin SDK (only needed for non-dry-run, but always init
    // so config errors surface early even during dry runs)
    initializeApp({ credential: cert(config.serviceAccount) });
    const db = getFirestore();

    const { startDate, endDate } = getDateRange(LOOKBACK_DAYS);

    try {
        const activities = await fetchFromCloudFunction({
            athleteId: config.athleteId,
            apiKey: config.apiKey,
            startDate,
            endDate,
        });

        if (activities.length === 0) {
            console.log('[SYNC] Geen activiteiten gevonden in de afgelopen 14 dagen. Klaar.');
            process.exit(0);
        }

        console.log(`[SYNC] ${activities.length} activiteiten ontvangen.`);

        const savedCount = await upsertToFirestore(db, activities, config.isDryRun);
        const action = config.isDryRun ? 'zouden worden opgeslagen' : 'opgeslagen/bijgewerkt';

        console.log(`[SYNC] ✅ Succes! ${savedCount} activiteiten ${action} in Firebase.`);
    } catch (error) {
        console.error('[ERROR] Sync mislukt:', error.message);
        process.exit(1);
    }
}

runNightlySync();
