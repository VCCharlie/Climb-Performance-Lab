/* global process, Buffer */
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
const LOOKBACK_DAYS = 4650;
// We no longer strictly filter on SPORT_TYPES before storing, to ensure we catch Workouts with power data.
const ACCEPTED_TYPES = ['Ride', 'VirtualRide', 'Workout', 'IndoorCycling'];

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

// ─── Direct Intervals API Fetch & Transform ───────────────────────────────────

function determineActivityType(apiType, title, isIndoor) {
    let cleanType = apiType ? String(apiType).replace(/\s+/g, '') : 'Ride';
    const typeLower = cleanType.toLowerCase();

    if (typeLower === 'virtualride') return 'VirtualRide';
    if (typeLower === 'run') return 'Run';
    if (typeLower === 'walk') return 'Walk';
    if (typeLower === 'hike') return 'Hike';

    const virtualKeywords = ['virtual', 'indoor', 'zwift', 'watopia', 'rouvy', 'fulgaz', 'bkool', 'indievelo', 'tacx', 'trainerroad', 'wahoo'];
    const titleLower = title ? String(title).toLowerCase() : '';

    if (isIndoor || virtualKeywords.some(kw => titleLower.includes(kw))) {
        return 'VirtualRide';
    }

    if (typeLower === 'ride' || typeLower === 'cycling' || !cleanType) return 'Ride';
    return cleanType;
}

function normalizeActivity(item) {
    const getNum = (val) => { const n = Number(val); return isNaN(n) ? 0 : n; };
    const getVal = (...keys) => { for (const k of keys) { if (item[k] !== undefined && item[k] !== null && item[k] !== "") return item[k]; } return null; };

    const id = String(getVal('id', 'activity_id') || Math.random().toString(36).substr(2, 9));
    const dtSource = getVal('startDate', 'start_date_local', 'start_date', 'date') || new Date().toISOString();
    const dateStr = dtSource.split('T')[0];
    const title = getVal('name', 'title') || "Untitled";

    const movingTime = getNum(getVal('movingTime', 'moving_time', 'icu_recording_time', 'elapsedTime', 'elapsed_time', 'time'));
    const distanceMeters = getNum(getVal('distance', 'icu_distance', 'total_distance'));
    const climbing = getNum(getVal('elevationGain', 'total_elevation_gain', 'total_elevation_loss', 'climbing'));
    const avgSpeedMs = getNum(getVal('avg_speed', 'avgSpeed', 'average_speed', 'velocity_smooth'));
    const normPower = getNum(getVal('norm_power', 'normalizedPower', 'icu_weighted_avg_watts', 'weighted_average_watts', 'np', 'normalized_power'));
    const avgPower = getNum(getVal('avgWatts', 'icu_average_watts', 'average_watts', 'device_watts', 'avg_power', 'power'));
    const avgHr = getNum(getVal('average_heartrate', 'avg_hr', 'average_hr', 'hr', 'icu_average_heartrate', 'avg_heartrate', 'icu_avg_hr'));
    const load = getNum(getVal('load', 'trainingLoad', 'icu_training_load', 'training_load', 'power_load', 'hr_load', 'pace_load', 'tss'));

    let work = getNum(getVal('work', 'total_work', 'kilojoules', 'energy'));
    if (work === 0 && avgPower > 0 && movingTime > 0) {
        const joules = getNum(getVal('icu_joules', 'joules'));
        if (joules > 0) {
            work = joules / 1000;
        } else {
            work = (avgPower * movingTime) / 1000;
        }
    }

    const rpe = getNum(getVal('rpe', 'icu_rpe', 'perceived_exertion', 'feel', 'session_rpe', 'feeling', 'rating'));
    const ftp = getNum(getVal('ftp', 'icu_ftp', 'icu_pm_ftp', 'cp'));

    let maxPower = getNum(getVal('max_power', 'maxWatts', 'icu_max_watts', 'max_watts', 'p_max', 'icu_pm_p_max'));
    let maxPowerSource = 'Instant';

    if (maxPower === 0 && item.icu_intervals && Array.isArray(item.icu_intervals)) {
        const intervalMax = Math.max(...item.icu_intervals.map(i => Number(i.max_watts) || 0));
        if (intervalMax > 0) {
            maxPower = intervalMax;
            maxPowerSource = 'Interval';
        }
    }

    let best1min = getNum(getVal('best_1min', 'Best1minpower', 'best_1min_power', 'w1min'));
    if (best1min > 1200) best1min = 0;

    if (maxPower === 0 && best1min > 0) {
        maxPower = best1min;
        maxPowerSource = '1 min';
    }

    const maxHr = getNum(getVal('max_hr', 'max_heartrate', 'max_heart_rate', 'icu_max_hr', 'athlete_max_hr', 'icu_max_heartrate'));

    const best5min = getNum(getVal('best_5min', 'Best5minpower', 'best_5min_power', 'w5min'));
    const best10min = getNum(getVal('best_10min', 'Best10minpower', 'best_10min_power', 'w10min'));
    const best20min = getNum(getVal('best_20min', 'Best20minpower', 'best_20min_power', 'w20min'));
    const best60min = getNum(getVal('best_60min', 'Best60minpower', 'best_60min_power', 'w60min'));

    const avgAltitude = getNum(getVal('avgAltitude', 'average_altitude', 'avg_altitude'));
    const maxAltitude = getNum(getVal('maxAltitude', 'maximum_altitude', 'max_altitude'));

    const rawType = getVal('type', 'sub_type', 'activity_type');
    const isIndoor = item.trainer === true;
    let finalType = determineActivityType(rawType, title, isIndoor);

    // If it's a workout but has power data, we'll treat it as a Ride/VirtualRide
    if ((finalType === 'Workout' || finalType === 'IndoorCycling') && (avgPower > 0 || maxPower > 0)) {
        finalType = isIndoor ? 'VirtualRide' : 'Ride';
    }

    return {
        id: id,
        date: dateStr,
        title: title,
        type: finalType,
        moving_time: movingTime,
        distance: distanceMeters > 1000 ? Number((distanceMeters / 1000).toFixed(2)) : distanceMeters,
        climbing: Math.round(climbing),
        avg_speed: (avgSpeedMs > 0 && avgSpeedMs < 15) ? Number((avgSpeedMs * 3.6).toFixed(1)) : avgSpeedMs,
        norm_power: Math.round(normPower),
        avg_power: Math.round(avgPower),
        avg_hr: Math.round(avgHr),
        load: Math.round(load),
        work: Math.round(work),
        rpe: rpe,
        ftp: Math.round(ftp),
        max_power: Math.round(maxPower),
        max_power_source: maxPowerSource,
        max_hr: Math.round(maxHr),
        best_1min: Math.round(best1min),
        best_5min: Math.round(best5min),
        best_10min: Math.round(best10min),
        best_20min: Math.round(best20min),
        best_60min: Math.round(best60min),
        avg_altitude: Math.round(avgAltitude),
        max_altitude: Math.round(maxAltitude)
    };
}

/**
 * Fetches directly from Intervals.icu and normalizes the payload.
 */
async function fetchFromIntervalsAPI({ athleteId, apiKey, startDate, endDate }) {
    console.log(`[SYNC] Activiteiten ophalen van ${startDate} t/m ${endDate}...`);

    const url = `https://intervals.icu/api/v1/athlete/${athleteId}/activities?oldest=${startDate}&newest=${endDate}`;
    const authString = Buffer.from(`API_KEY:${apiKey}`).toString('base64');

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Basic ${authString}`,
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Intervals.icu gaf fout ${response.status}: ${errorText}`);
    }

    const rawActivities = await response.json();

    if (!Array.isArray(rawActivities)) {
        throw new Error(`Onverwacht response van Intervals: geen array ontvangen.`);
    }

    let transformed = rawActivities.map(normalizeActivity);

    // Allow activities that have distance, time, OR power.
    transformed = transformed.filter(act =>
        (act.distance && act.distance > 0) ||
        (act.moving_time && act.moving_time > 0) ||
        (act.avg_power && act.avg_power > 0)
    );

    return transformed;
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
 * Smart Upsert (Deep Merge Strategy)
 * 1. Fetches all existing activities from Firestore.
 * 2. Compares incoming Intervals.icu activities against existing (Strava) activities based on Date, Time and Distance.
 * 3. If a match is found: updates the existing Strava document with Intervals power data (keeping Strava ID, Title, Type).
 *    If NO match is found: creates a new document with the Intervals ID.
 *
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {object[]} newActivities
 * @param {boolean} isDryRun
 */
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

    for (const newAct of validActivities) {
        // Find duplicate based on Date + Duration/Distance logic
        const newDate = newAct.date?.split('T')[0];

        const duplicate = existingActivities.find(existing => {
            if (existing.id === newAct.id) return false; // Not a duplicate if it's the exact same Intervals activity

            const exDate = existing.date?.split('T')[0];
            if (exDate !== newDate) return false;

            // Loose type check (Ride vs VirtualRide is ok)
            const isRideEx = ['Ride', 'VirtualRide'].includes(existing.type);
            const isRideNew = ['Ride', 'VirtualRide'].includes(newAct.type);
            if (isRideEx !== isRideNew) return false;

            const timeDiff = Math.abs((existing.moving_time || 0) - (newAct.moving_time || 0));
            const distDiff = Math.abs((existing.distance || 0) - (newAct.distance || 0));

            // Require BOTH duration AND distance to be similar (300s, 0.5km)
            return timeDiff < 300 && distDiff < 0.5;
        });

        if (duplicate) {
            // MERGE MODE!
            // We keep the duplicate's ID, title, and type, but add the power data from intervals
            const mergedAct = {
                ...newAct,
                id: duplicate.firestoreId,   // Preserve original Firestore ID (e.g. Strava numeric ID)
                title: duplicate.title,      // Preserve personalized title
                type: duplicate.type,        // Preserve original type
            };

            // If the existing activity has better data for something, preserve it?
            // (For now, we overwrite metrics with Intervals' normalized calculations as they are usually better)

            toProcess.push(mergedAct);
            mergedCount++;
            if (isDryRun) console.log(`[DRY-RUN] MERGE: "${duplicate.title}" (${duplicate.firestoreId}) <== Intervals Power Data`);
        } else {
            // NEW MODE!
            toProcess.push(newAct);
            newCount++;
            if (isDryRun) console.log(`[DRY-RUN] NEW:   "${newAct.title}" (${newAct.id})`);
        }
    }

    console.log(`[SYNC] Resultaat deduplicatie: ${mergedCount} ritten worden gemerged, ${newCount} nieuwe ritten.`);

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
