/* global process */
/**
 * scripts/nightlySync.js
 *
 * Nightly automation:
 * 1. Fetches the last 14 days of Intervals.icu cycling activities
 *    via the existing Cloud Function and upserts them into Firebase Firestore.
 * 2. Enriches activities with Strava data (title, HR, RPE, gear) using
 *    OAuth tokens stored in Firestore settings.
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
 * INTERVALS_API_KEY           — Your Intervals.icu API key
 * STRAVA_CLIENT_ID            — Strava app client id (GitHub Secret)
 * STRAVA_CLIENT_SECRET        — Strava app client secret (GitHub Secret)
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getValidStravaAccessToken } from './stravaTokenManager.js';
import { shouldApplyStravaTitleOnMatch } from '../src/utils/stravaTitleSameDay.js';
import { normalizeBikeComputerProfileTitles } from '../src/utils/bikeComputerProfileTitles.js';
import { protectEnrichedFieldsOnMerge } from '../src/utils/firestoreActivityMerge.js';
import { runIntervalsSyncWithStravaGapFill } from '../src/utils/runIntervalsSyncWithStravaGapFill.js';
import { formatStravaGapFillSummary } from '../src/utils/importSyncStats.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const CLOUD_FUNCTION_URL = 'https://sync-intervals-97555677694.europe-west1.run.app';
const FIRESTORE_COLLECTION = 'activities';
const LOOKBACK_DAYS = 14;
// We no longer strictly filter on SPORT_TYPES before storing, to ensure we catch Workouts with power data.
const ACCEPTED_TYPES = ['Ride', 'VirtualRide', 'Workout', 'IndoorCycling'];

// Firestore limits batch writes to 500 documents at a time.
const FIRESTORE_BATCH_LIMIT = 500;

const STRAVA_API_BASE = 'https://www.strava.com/api/v3';
const STRAVA_BIKE_TYPES = new Set(['Ride', 'VirtualRide', 'GravelRide', 'MountainBikeRide', 'Cycling']);

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

/**
 * Load bike-computer profile names from Firestore settings (saved from Settings UI).
 * Optional env FIREBASE_SETTINGS_DOC_ID = settings doc id (e.g. user_abc123).
 */
async function loadBikeComputerProfileTitles(db) {
    const explicitId = (process.env.FIREBASE_SETTINGS_DOC_ID || '').trim();
    if (explicitId) {
        const snap = await db.doc(`settings/${explicitId}`).get();
        if (snap.exists) {
            return normalizeBikeComputerProfileTitles(snap.data()?.body?.bikeComputerProfileTitles);
        }
    }

    const settingsSnaps = await db.collection('settings').limit(20).get();
    for (const settingsDoc of settingsSnaps.docs) {
        const titles = settingsDoc.data()?.body?.bikeComputerProfileTitles;
        if (Array.isArray(titles) && titles.length > 0) {
            return normalizeBikeComputerProfileTitles(titles);
        }
    }

    return [];
}

async function fetchFromIntervalsAPI({ athleteId, apiKey, startDate, endDate }) {
    console.log(`[SYNC] Ophalen Intervals.icu data van ${startDate} tot ${endDate}...`);
    
    const url = CLOUD_FUNCTION_URL;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(process.env.AUTOMATION_SHARED_SECRET
                ? { 'X-Automation-Secret': process.env.AUTOMATION_SHARED_SECRET }
                : {}),
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

        if (exactMatch) {
            // SCENARIO 1: UPDATE — same id, preserve enriched fields (Strava, manual, zone times, drift).
            const actToSave = protectEnrichedFieldsOnMerge(newAct, exactMatch);
            toProcess.push(actToSave);
            updatedCount++;
            if (isDryRun) console.log(`[DRY-RUN] UPDATE: Beschermde velden behouden voor "${actToSave.title}" (${actToSave.id})`);

        } else if (duplicateMatch) {
            // SCENARIO 2: MERGE (dedupe) — keep Firestore doc id, apply shared retention rules.
            const actToSave = {
                ...protectEnrichedFieldsOnMerge(newAct, duplicateMatch),
                id: duplicateMatch.firestoreId,
            };
            toProcess.push(actToSave);
            mergedCount++;
            if (isDryRun) console.log(`[DRY-RUN] MERGE: "${actToSave.title}" (${actToSave.id}) <== Verrijkt met Intervals data`);

        } else {
            // SCENARIO 3: NEW — no existing row to protect.
            toProcess.push({ ...newAct });
            newCount++;
            if (isDryRun) console.log(`[DRY-RUN] NEW: "${newAct.title}" (${newAct.id})`);
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

// ─── Strava Enrichment ────────────────────────────────────────────────────────

async function fetchStravaActivities(token, startDate, endDate) {
    const afterTs = Math.floor(new Date(startDate).getTime() / 1000);
    const beforeTs = Math.floor(new Date(endDate).getTime() / 1000) + 86400;

    let page = 1;
    let all = [];
    while (true) {
        const resp = await fetch(
            `${STRAVA_API_BASE}/athlete/activities?after=${afterTs}&before=${beforeTs}&per_page=200&page=${page}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!resp.ok) {
            console.warn(`[STRAVA] API error fetching page ${page}: ${resp.status}`);
            break;
        }
        const data = await resp.json();
        if (!Array.isArray(data) || data.length === 0) break;
        all = all.concat(data);
        if (data.length < 200) break;
        page++;
    }

    return all.filter(a => STRAVA_BIKE_TYPES.has(a.sport_type || a.type));
}

async function fetchStravaDetail(token, activityId) {
    const resp = await fetch(`${STRAVA_API_BASE}/activities/${activityId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!resp.ok) return null;
    return resp.json();
}

/** Athlete bikes from Strava → gear_id → display name (emoji names included). */
async function fetchStravaAthleteBikesMap(token) {
    try {
        const resp = await fetch(`${STRAVA_API_BASE}/athlete`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) return {};
        const athlete = await resp.json();
        const map = {};
        for (const b of athlete.bikes || []) {
            if (!b?.id) continue;
            const label = b.name || [b.brand_name, b.model_name].filter(Boolean).join(' ') || 'Bike';
            map[String(b.id)] = label;
        }
        return map;
    } catch {
        return {};
    }
}

async function fetchStravaGearName(token, gearId) {
    if (!gearId) return null;
    try {
        const resp = await fetch(`${STRAVA_API_BASE}/gear/${encodeURIComponent(gearId)}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) return null;
        const g = await resp.json();
        return g.name || [g.brand_name, g.model_name].filter(Boolean).join(' ') || null;
    } catch {
        return null;
    }
}

function stravaWorkKilojoules(detail) {
    if (!detail) return 0;
    const kj = Number(detail.kilojoules);
    if (Number.isFinite(kj) && kj > 0) return Math.round(kj);
    const w = Number(detail.average_watts);
    const sec = Number(detail.moving_time);
    if (Number.isFinite(w) && w > 0 && Number.isFinite(sec) && sec > 0) {
        return Math.round((w * sec) / 1000);
    }
    return 0;
}

function gearNameIsPlaceholder(gearId, gearName) {
    const gid = gearId != null ? String(gearId).trim() : '';
    const gn = gearName != null ? String(gearName).trim() : '';
    if (!gid) return false;
    if (!gn || gn === gid) return true;
    return /^b\d+$/i.test(gn);
}

function matchStravaToFirestore(stravaActivities, firestoreActivities) {
    const results = [];
    const usedFirestoreIds = new Set();

    const byStravaId = new Map();
    const byDate = new Map();

    for (const act of firestoreActivities) {
        if (act.strava_id) byStravaId.set(String(act.strava_id), act);
        const dateKey = act.date?.split('T')[0];
        if (dateKey) {
            if (!byDate.has(dateKey)) byDate.set(dateKey, []);
            byDate.get(dateKey).push(act);
        }
    }

    for (const strava of stravaActivities) {
        const stravaIdStr = String(strava.id);
        const stravaDate = strava.start_date_local?.split('T')[0];
        const stravaDistKm = (strava.distance || 0) / 1000;

        // Al gekoppeld via strava_id?
        const linked = byStravaId.get(stravaIdStr);
        if (linked) {
            const siteDay = linked.date?.split('T')[0];
            if (siteDay && stravaDate && siteDay !== stravaDate) {
                continue;
            }
            results.push({ strava, site: linked, type: 'linked' });
            usedFirestoreIds.add(linked.firestoreId || linked.id);
            continue;
        }

        // Fuzzy match op datum + afstand
        const candidates = (byDate.get(stravaDate) || []).filter(s =>
            !usedFirestoreIds.has(s.firestoreId || s.id) && !s.strava_id
        );

        let best = null;
        for (const site of candidates) {
            const siteDist = Number(site.distance) || 0;
            if (siteDist <= 0 || stravaDistKm <= 0) continue;
            const distDiff = Math.abs(siteDist - stravaDistKm) / Math.max(siteDist, stravaDistKm);
            if (distDiff < 0.10 && (!best || distDiff < best.distDiff)) {
                best = { site, distDiff };
            }
        }

        if (best) {
            results.push({ strava, site: best.site, type: 'matched' });
            usedFirestoreIds.add(best.site.firestoreId || best.site.id);
        }
    }

    return results;
}

async function enrichWithStrava(db, firestoreActivities, startDate, endDate, isDryRun, deviceProfileTitles = []) {
    console.log('[STRAVA] === Strava enrichment (server-side credentials) ===');

    let token;
    try {
        token = await getValidStravaAccessToken(db);
    } catch (err) {
        console.warn('[STRAVA] Could not obtain a valid token:', err.message);
        return 0;
    }

    console.log(`[STRAVA] Fetching Strava activities from ${startDate} to ${endDate}...`);
    const stravaActivities = await fetchStravaActivities(token, startDate, endDate);
    console.log(`[STRAVA] ${stravaActivities.length} cycling activities found on Strava.`);

    if (stravaActivities.length === 0) return 0;

    const matches = matchStravaToFirestore(stravaActivities, firestoreActivities);
    console.log(`[STRAVA] ${matches.length} matches found (linked + fuzzy).`);

    if (matches.length === 0) return 0;

    const bikesMap = await fetchStravaAthleteBikesMap(token);
    let enrichedCount = 0;

    for (const { strava, site, type } of matches) {
        const needsTitle = shouldApplyStravaTitleOnMatch(site, strava, {
            gearName: site.gear_name,
            deviceProfileTitles,
        });
        const needsHr = !site.avg_hr || site.avg_hr === 0;
        const needsRpe = !site.rpe || site.rpe === 0;
        const needsGearId = !site.gear_id && !!strava.gear_id;
        const needsGearNameFix = gearNameIsPlaceholder(site.gear_id, site.gear_name);
        const needsStravaId = !site.strava_id;
        const needsMap = !site.strava_map || String(site.strava_map).trim() === '';
        const needsWork = !site.work || Number(site.work) === 0;

        if (
            !needsTitle
            && !needsHr
            && !needsRpe
            && !needsGearId
            && !needsGearNameFix
            && !needsStravaId
            && !needsMap
            && !needsWork
        ) {
            continue;
        }

        let detailed = strava;
        if (needsRpe || needsHr || needsMap || needsWork || needsGearNameFix || needsGearId) {
            try {
                const det = await fetchStravaDetail(token, strava.id);
                if (det) detailed = det;
            } catch { /* use list data */ }
        }

        const updateData = {};

        if (needsStravaId) updateData.strava_id = String(strava.id);
        if (needsTitle && strava.name) updateData.title = strava.name;
        if (needsRpe && detailed.perceived_exertion) updateData.rpe = detailed.perceived_exertion;
        if (needsHr && detailed.average_heartrate) updateData.avg_hr = Math.round(detailed.average_heartrate);
        if (needsHr && detailed.max_heartrate) updateData.max_hr = Math.round(detailed.max_heartrate);

        const gid = strava.gear_id || detailed.gear_id || site.gear_id || null;
        if (needsGearId && gid) {
            updateData.gear_id = String(gid);
        }
        const effectiveGid = updateData.gear_id || (site.gear_id != null ? String(site.gear_id) : '');
        if (effectiveGid && (needsGearId || needsGearNameFix)) {
            let gname = bikesMap[effectiveGid];
            if (!gname) {
                gname = await fetchStravaGearName(token, effectiveGid);
            }
            if (gname) updateData.gear_name = gname;
        }

        if (needsMap && detailed.map?.summary_polyline) {
            updateData.strava_map = detailed.map.summary_polyline;
        }

        if (needsWork) {
            const wkj = stravaWorkKilojoules(detailed);
            if (wkj > 0) updateData.work = wkj;
        }

        if (Object.keys(updateData).length === 0) continue;

        const docId = String(site.firestoreId || site.id);

        const payload = protectEnrichedFieldsOnMerge(updateData, site);

        if (isDryRun) {
            const fields = Object.keys(payload).join(', ');
            console.log(`[DRY-RUN] STRAVA ENRICH "${site.title}" → "${payload.title || site.title}" [${fields}] (${type})`);
        } else {
            await db.collection(FIRESTORE_COLLECTION).doc(docId).set(payload, { merge: true });
        }
        enrichedCount++;
    }

    console.log(`[STRAVA] ✅ ${enrichedCount} activities enriched with Strava data.`);
    return enrichedCount;
}

async function resolveSettingsDocRef(db) {
    const explicitId = process.env.FIREBASE_SETTINGS_DOC_ID;
    if (explicitId) {
        return db.doc(`settings/${explicitId}`);
    }
    const settingsSnaps = await db.collection('settings').limit(20).get();
    const first = settingsSnaps.docs[0];
    return first ? first.ref : null;
}

async function recordNightlySyncStatus(db, { activitiesSaved, isDryRun }) {
    if (isDryRun) return;
    try {
        const ref = await resolveSettingsDocRef(db);
        if (!ref) return;
        await ref.set({
            lastNightlySync: {
                at: new Date().toISOString(),
                activitiesSaved: Number(activitiesSaved) || 0,
                summary: 'GitHub Actions nightly sync',
            },
        }, { merge: true });
    } catch (err) {
        console.warn('[SYNC] Could not record lastNightlySync on settings doc:', err.message);
    }
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
    const deviceProfileTitles = await loadBikeComputerProfileTitles(db);
    if (deviceProfileTitles.length > 0) {
        console.log(`[STRAVA] Bike computer profile titles: ${deviceProfileTitles.join(', ')}`);
    }

    try {
        const activities = await fetchFromIntervalsAPI({
            athleteId: config.athleteId,
            apiKey: config.apiKey,
            startDate,
            endDate,
        });

        const existingDocs = await db.collection(FIRESTORE_COLLECTION).get();
        const existingActivities = existingDocs.docs.map((d) => ({ ...d.data(), firestoreId: d.id }));

        let intervalsToSave = activities;
        let orphansToSave = [];

        try {
            const stravaToken = await getValidStravaAccessToken(db);
            const gapResult = await runIntervalsSyncWithStravaGapFill({
                intervalsActivities: activities,
                existingActivities,
                stravaToken,
                startYmd: startDate,
                endYmd: endDate,
                allowedSportTypes: ACCEPTED_TYPES,
            });
            intervalsToSave = gapResult.intervalsActivities;
            orphansToSave = gapResult.orphanActivities;
            const gapSummary = formatStravaGapFillSummary(gapResult.stats);
            if (gapSummary) {
                console.log(`[STRAVA] Gap fill: ${gapSummary}`);
            }
        } catch (gapErr) {
            console.warn('[STRAVA] Gap fill skipped:', gapErr.message);
        }

        const combinedActivities = [...intervalsToSave, ...orphansToSave];

        let savedCount = 0;

        if (combinedActivities.length === 0) {
            console.log('[SYNC] Geen activiteiten gevonden in de afgelopen 14 dagen.');
        } else {
            console.log(`[SYNC] ${combinedActivities.length} activiteiten ontvangen (${intervalsToSave.length} Intervals, ${orphansToSave.length} Strava orphans).`);

            savedCount = await upsertToFirestore(db, combinedActivities, config.isDryRun);
            const action = config.isDryRun ? 'zouden worden opgeslagen' : 'opgeslagen/bijgewerkt';
            console.log(`[SYNC] ✅ Succes! ${savedCount} activiteiten ${action} in Firebase.`);
        }

        // Stap 2: Strava verrijking — altijd draaien, ook als er geen nieuwe Intervals ritten zijn
        const refreshedDocs = await db.collection(FIRESTORE_COLLECTION).get();
        const allActivities = refreshedDocs.docs.map(d => ({ ...d.data(), firestoreId: d.id }));
        const windowActivities = allActivities.filter(a => {
            const d = a.date?.split('T')[0];
            return d && d >= startDate && d <= endDate;
        });

        if (windowActivities.length > 0) {
            await enrichWithStrava(db, windowActivities, startDate, endDate, config.isDryRun, deviceProfileTitles);
        } else {
            console.log('[STRAVA] Geen activiteiten in het sync-venster om te verrijken.');
        }

        await recordNightlySyncStatus(db, { activitiesSaved: savedCount, isDryRun: config.isDryRun });
    } catch (error) {
        console.error('[ERROR] Sync mislukt:', error.message);
        process.exit(1);
    }
}

runNightlySync();
