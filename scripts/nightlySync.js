/* global process, Buffer */
/**
 * scripts/nightlySync.js
 *
 * Nightly automation: fetches the last 14 days of Intervals.icu cycling activities
 * via the existing Cloud Function and upserts them into Firebase Firestore.
 *
 * Usage (local dry-run, requires a .env file — see README):
 * node --env-file=.env scripts/nightlySync.js --dry-run
 *
 * Usage (production, called by GitHub Actions):
 * node scripts/nightlySync.js
 *
 * Required environment variables:
 * FIREBASE_SERVICE_ACCOUNT  — Full JSON content of the Firebase service account key
 * INTERVALS_ATHLETE_ID      — e.g. "i34047"
 * INTERVALS_API_KEY         — Your Intervals.icu API key
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ─── Constants ────────────────────────────────────────────────────────────────

const CLOUD_FUNCTION_URL = 'https://sync-intervals-97555677694.europe-west1.run.app';
const FIRESTORE_COLLECTION = 'activities';
const LOOKBACK_DAYS = 14;
// We no longer strictly filter on SPORT_TYPES before storing, to ensure we catch Workouts with power data.
const ACCEPTED_TYPES = ['Ride', 'VirtualRide', 'Workout', 'IndoorCycling'];

// Firestore limits batch writes to 500 documents at a time.
const FIRESTORE_BATCH_LIMIT = 500;

// ─── Config ───────────────────────────────────────────────────────────────────

function loadConfig() {
    const isDryRun = process.argv.includes('--dry-run');
    
    const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
    const athleteId = process.env.INTERVALS_ATHLETE_ID;
    const apiKey = process.env.INTERVALS_API_KEY;

    if (!serviceAccountRaw || !athleteId || !apiKey) {
        console.error('[ERROR] Missing required environment variables.');
        process.exit(1);
    }

    let serviceAccount;
    try {
        serviceAccount = JSON.parse(serviceAccountRaw);
    } catch (err) {
        console.error('[ERROR] FIREBASE_SERVICE_ACCOUNT is not valid JSON.', err.message);
        process.exit(1);
    }

    return {
        isDryRun,
        serviceAccount,
        athleteId,
        apiKey
    };
}

function getDateRange(daysBack) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - daysBack);
    
    return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
    };
}

function chunkArray(array, size) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

async function fetchFromIntervalsAPI({ athleteId, apiKey, startDate, endDate }) {
    console.log(`[SYNC] Ophalen Intervals.icu data van ${startDate} tot ${endDate}...`);
    
    const url = CLOUD_FUNCTION_URL;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            athlete_id: athleteId,
            api_key: apiKey,
            start_date: startDate,
            end_date: endDate,
            // We pass the accepted types to allow the function to pre-filter
            sport_types: ACCEPTED_TYPES
        })
    });

    if (!response.ok) {
        throw new Error(`Cloud function returned ${response.status}: ${await response.text()}`);
    }
    
    // The function now returns the full transformed activity object directly
    const data = await response.json();
    return data;
}

async function upsertToFirestore(db, newActivities, isDryRun) {
    const validActivities = newActivities.filter((act) => act && act.id);

    if (validActivities.length === 0) {
        console.log('[SYNC] Geen activiteiten om op te slaan.');
        return 0;
    }

    console.log('[SYNC] Bestaande activiteiten ophalen uit Firestore voor deduplicatie/merge...');
    const existingDocs = await db.collection(FIRESTORE_COLLECTION).get();
    const existingActivities = existingDocs.docs.map(d => ({ ...d.data(), firestoreId: d.id }));
    console.log(`[SYNC] ${existingActivities.length} activiteiten gevonden in Firestore.`);

    const toProcess = [];
    let mergedCount = 0;
    let newCount = 0;
    let updatedCount = 0;

    for (const newAct of validActivities) {
        const newDate = newAct.date?.split('T')[0];

        // 1. Zoek naar een EXACTE match (De rit bestaat al, dit is een update)
        const exactMatch = existingActivities.find(ex => ex.firestoreId === String(newAct.id));

        // 2. Zoek naar een FUZZY dubbeling (Ander ID, zelfde rit - bv. Strava import)
        const duplicateMatch = existingActivities.find(existing => {
            if (existing.firestoreId === String(newAct.id)) return false; // Exacte matches slaan we hier over

            const exDate = existing.date?.split('T')[0];
            if (exDate !== newDate) return false;

            const isRideEx = ['Ride', 'VirtualRide'].includes(existing.type);
            const isRideNew = ['Ride', 'VirtualRide'].includes(newAct.type);
            if (isRideEx !== isRideNew) return false;

            const timeDiff = Math.abs((existing.moving_time || 0) - (newAct.moving_time || 0));
            const distDiff = Math.abs((existing.distance || 0) - (newAct.distance || 0));

            return timeDiff < 300 && distDiff < 0.5;
        });

        // Maak het basisobject klaar met de nieuwe Intervals data
        let actToSave = { ...newAct };

        if (exactMatch) {
            // SCENARIO 1: UPDATE MODUS
            // De rit bestond al. Bescherm handmatige edits!
            if (exactMatch.title && exactMatch.title.trim() !== '') actToSave.title = exactMatch.title;
            if (exactMatch.type) actToSave.type = exactMatch.type;
            if (exactMatch.rpe !== undefined && exactMatch.rpe !== null) actToSave.rpe = exactMatch.rpe;
            if (exactMatch.strava_id) actToSave.strava_id = exactMatch.strava_id;
            if (exactMatch.gear_id) actToSave.gear_id = exactMatch.gear_id;

            toProcess.push(actToSave);
            updatedCount++;
            if (isDryRun) console.log(`[DRY-RUN] UPDATE: Beschermde velden behouden voor "${actToSave.title}" (${actToSave.id})`);

        } else if (duplicateMatch) {
            // SCENARIO 2: MERGE MODUS (Deduplicatie)
            // Overschrijf het nieuwe ID met het bestaande ID in de database
            actToSave.id = duplicateMatch.firestoreId; 
            
            // Bescherm ook hier de handmatige edits van de bestaande dubbele rit
            if (duplicateMatch.title && duplicateMatch.title.trim() !== '') actToSave.title = duplicateMatch.title;
            if (duplicateMatch.type) actToSave.type = duplicateMatch.type;
            if (duplicateMatch.rpe !== undefined && duplicateMatch.rpe !== null) actToSave.rpe = duplicateMatch.rpe;
            if (duplicateMatch.strava_id) actToSave.strava_id = duplicateMatch.strava_id;
            if (duplicateMatch.gear_id) actToSave.gear_id = duplicateMatch.gear_id;

            toProcess.push(actToSave);
            mergedCount++;
            if (isDryRun) console.log(`[DRY-RUN] MERGE: "${actToSave.title}" (${actToSave.id}) <== Verrijkt met Intervals data`);

        } else {
            // SCENARIO 3: NEW MODUS
            // Volledig nieuwe rit, geen bescherming nodig.
            toProcess.push(actToSave);
            newCount++;
            if (isDryRun) console.log(`[DRY-RUN] NEW: "${actToSave.title}" (${actToSave.id})`);
        }
    }

    console.log(`[SYNC] Resultaat: ${updatedCount} updates (beschermd), ${mergedCount} deduplicaties, ${newCount} nieuwe ritten.`);

    if (isDryRun) {
        return validActivities.length;
    }

    const chunks = chunkArray(toProcess, FIRESTORE_BATCH_LIMIT);
    let totalSaved = 0;

    for (const [index, chunk] of chunks.entries()) {
        const batch = db.batch();

        for (const activity of chunk) {
            const docRef = db.collection(FIRESTORE_COLLECTION).doc(String(activity.id));
            batch.set(docRef, activity, { merge: true });
        }

        await batch.commit();
        totalSaved += chunk.length;
        console.log(`[SYNC] Batch ${index + 1}/${chunks.length} opgeslagen (${chunk.length} activiteiten)`);
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
        const activities = await fetchFromIntervalsAPI({
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
