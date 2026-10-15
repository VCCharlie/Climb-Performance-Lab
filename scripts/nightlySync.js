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
import { stampActivityOwnerId } from '../src/utils/activityOwnershipCore.js';
import { protectEnrichedFieldsOnMerge } from '../src/utils/firestoreActivityMerge.js';
import { runIntervalsSyncWithStravaGapFill } from '../src/utils/runIntervalsSyncWithStravaGapFill.js';
import { formatStravaGapFillSummary } from '../src/utils/importSyncStats.js';
import { enrichSyncedActivitiesDrift } from '../src/utils/syncDriftEnrich.js';
import { extractDriftPatch } from '../src/utils/coach/rideDurability.js';
import { enrichIntervalsActivitiesForNightlySync } from '../src/utils/nightlySyncIntervalsEnrich.js';
import {
    loadNightlySyncSettingsDoc,
    resolveNightlySyncContext,
} from '../src/utils/nightlySyncSettings.js';
import {
    buildNightlyIntervalsConfig,
    getDefaultNightlyAllowedSportTypes,
} from '../src/utils/nightlySyncDefaults.js';
import { fetchNightlyIntervalsActivitiesResilient } from '../src/utils/nightlySyncIntervalsFetch.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const FIRESTORE_COLLECTION = 'activities';
// We no longer strictly filter on SPORT_TYPES before storing, to ensure we catch Workouts with power data.
/** Orphan gap-fill + CF pre-filter — cycling types + Workout/IndoorCycling (see nightlySyncDefaults.js). */
const ACCEPTED_TYPES = getDefaultNightlyAllowedSportTypes();

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

async function applyNightlyIntervalsEnrichment(activities, syncContext, intervalsConfig) {
    if (!activities?.length) return activities;

    const { activities: enriched, stats } = await enrichIntervalsActivitiesForNightlySync(activities, {
        isFullSync: syncContext.isFullSync,
        intervalsConfig,
        enrichLimits: syncContext.enrichLimits,
        onProgress: (message) => console.log(`[ENRICH] ${message}`),
    });

    if (stats.zoneMapped > 0) {
        console.log(`[ENRICH] Zone times mapped on ${stats.zoneMapped} activit(y/ies).`);
    }
    if (stats.zoneTimesEnriched > 0) {
        console.log(`[ENRICH] Zone times fetched for ${stats.zoneTimesEnriched} activit(y/ies).`);
    }
    if (stats.powerCurveRan) {
        console.log('[ENRICH] Power-curve bests pass completed.');
    }
    if (stats.intervalsMapsAdded > 0) {
        console.log(`[ENRICH] Intervals route maps added for ${stats.intervalsMapsAdded} activit(y/ies).`);
    }

    return enriched;
}

async function persistDriftEnrichment(db, driftActivities, existingActivities, mergeOpts, isDryRun) {
    if (!driftActivities?.length) return 0;

    const existingById = new Map(
        (existingActivities || []).map((a) => [String(a.firestoreId || a.id), a]),
    );

    let saved = 0;
    const batch = [];
    for (const act of driftActivities) {
        const key = String(act.id);
        const existing = existingById.get(key);
        if (!existing) continue;

        const patch = extractDriftPatch(act);
        if (!patch) continue;
        const prevPatch = extractDriftPatch(existing);
        if (prevPatch && JSON.stringify(prevPatch) === JSON.stringify(patch)) continue;

        const payload = stampActivityOwnerId(
            protectEnrichedFieldsOnMerge(act, existing, mergeOpts),
            mergeOpts.ownerUid,
            existing,
        );

        if (isDryRun) {
            console.log(`[DRY-RUN] DRIFT UPDATE: "${payload.title || existing.title}" (${key})`);
            saved += 1;
            continue;
        }

        batch.push({ id: key, payload });
    }

    if (isDryRun || batch.length === 0) return saved;

    const chunks = chunkArray(batch, FIRESTORE_BATCH_LIMIT);
    for (const chunk of chunks) {
        const writeBatch = db.batch();
        for (const { id, payload } of chunk) {
            writeBatch.set(db.collection(FIRESTORE_COLLECTION).doc(id), payload, { merge: true });
        }
        await writeBatch.commit();
        saved += chunk.length;
    }

    return saved;
}

/**
 * @returns {Promise<{ activities: object[], meta: import('../src/utils/nightlySyncIntervalsFetch.js').NightlyIntervalsFetchMeta }>}
 */
async function fetchFromIntervalsAPI({ athleteId, apiKey, startDate, endDate }) {
    console.log(`[SYNC] Fetching Intervals.icu data from ${startDate} to ${endDate}…`);

    const { activities, meta } = await fetchNightlyIntervalsActivitiesResilient({
        athleteId,
        apiKey,
        startDate,
        endDate,
        sportTypes: ACCEPTED_TYPES,
        automationSecret: process.env.AUTOMATION_SHARED_SECRET,
        onLog: (message) => console.log(`[SYNC] ${message}`),
    });

    if (meta.route === 'direct_fallback') {
        console.warn(`[FAILSAFE] ${meta.warning || 'Used direct Intervals.icu API fallback.'}`);
        if (meta.cloudError) {
            console.warn(`[FAILSAFE] Cloud error: ${meta.cloudError}`);
        }
    } else {
        console.log(`[SYNC] Cloud Run sync succeeded (${meta.cloudAttempts} attempt(s)).`);
    }

    return { activities, meta };
}

async function upsertToFirestore(db, newActivities, isDryRun, mergeOpts = {}) {
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
            const actToSave = stampActivityOwnerId(
                protectEnrichedFieldsOnMerge(newAct, exactMatch, mergeOpts),
                mergeOpts.ownerUid,
                exactMatch,
            );
            toProcess.push(actToSave);
            updatedCount++;
            if (isDryRun) console.log(`[DRY-RUN] UPDATE: Beschermde velden behouden voor "${actToSave.title}" (${actToSave.id})`);

        } else if (duplicateMatch) {
            // SCENARIO 2: MERGE (dedupe) — keep Firestore doc id, apply shared retention rules.
            const actToSave = stampActivityOwnerId({
                ...protectEnrichedFieldsOnMerge(newAct, duplicateMatch, mergeOpts),
                id: duplicateMatch.firestoreId,
            }, mergeOpts.ownerUid, duplicateMatch);
            toProcess.push(actToSave);
            mergedCount++;
            if (isDryRun) console.log(`[DRY-RUN] MERGE: "${actToSave.title}" (${actToSave.id}) <== Verrijkt met Intervals data`);

        } else {
            // SCENARIO 3: NEW — no existing row to protect.
            toProcess.push(stampActivityOwnerId({ ...newAct }, mergeOpts.ownerUid, null));
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

async function enrichWithStrava(db, firestoreActivities, startDate, endDate, isDryRun, mergeOpts = {}) {
    const deviceProfileTitles = mergeOpts.deviceProfileTitles || [];
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

        const payload = stampActivityOwnerId(
            protectEnrichedFieldsOnMerge(updateData, site, mergeOpts),
            mergeOpts.ownerUid,
            site,
        );

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

async function recordNightlySyncStatus(db, settingsRef, {
    activitiesSaved,
    isDryRun,
    syncContext,
    startDate,
    endDate,
    intervalsFetchMeta,
}) {
    if (isDryRun || !settingsRef) return;
    try {
        const summaryParts = ['GitHub Actions nightly sync'];
        if (intervalsFetchMeta?.route === 'direct_fallback') {
            summaryParts.push('(direct Intervals fallback)');
        }

        await settingsRef.set({
            lastNightlySync: {
                at: new Date().toISOString(),
                activitiesSaved: Number(activitiesSaved) || 0,
                summary: summaryParts.join(' '),
                syncDepth: syncContext?.syncDepth ?? 'fast',
                lookbackDays: syncContext?.lookbackDays ?? 14,
                windowStart: startDate,
                windowEnd: endDate,
                intervalsFetchRoute: intervalsFetchMeta?.route ?? 'cloud',
                intervalsFetchWarning: intervalsFetchMeta?.warning || null,
            },
            lastNightlySyncFailure: null,
        }, { merge: true });
    } catch (err) {
        console.warn('[SYNC] Could not record lastNightlySync on settings doc:', err.message);
    }
}

async function recordNightlySyncFailure(db, settingsRef, { message, isDryRun }) {
    if (isDryRun || !settingsRef) return;
    try {
        await settingsRef.set({
            lastNightlySyncFailure: {
                at: new Date().toISOString(),
                message: String(message || 'Unknown error').slice(0, 500),
                summary: 'GitHub Actions nightly sync failed',
            },
        }, { merge: true });
    } catch (err) {
        console.warn('[SYNC] Could not record lastNightlySyncFailure:', err.message);
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

    const settingsDoc = await loadNightlySyncSettingsDoc(db, {
        settingsDocId: process.env.FIREBASE_SETTINGS_DOC_ID,
    });
    const syncContext = resolveNightlySyncContext(settingsDoc?.body, {
        settingsDocId: settingsDoc?.docId,
        ownerUidEnv: process.env.FIREBASE_OWNER_UID,
    });
    const { mergeOpts, isFullSync, lookbackDays } = syncContext;
    const { startDate, endDate } = getDateRange(lookbackDays);

    const { deviceProfileTitles, dataSourcePrefs } = mergeOpts;
    const ownerUid = mergeOpts.ownerUid;

    if (!ownerUid) {
        console.warn('[SYNC] No owner uid resolved — set FIREBASE_SETTINGS_DOC_ID=user_{uid} or FIREBASE_OWNER_UID for ownerId stamps.');
    }
    console.log(`[SYNC] Settings: ${lookbackDays}-day window (${startDate} → ${endDate}), depth=${syncContext.syncDepthLabel}`);
    if (deviceProfileTitles.length > 0) {
        console.log(`[STRAVA] Bike computer profile titles: ${deviceProfileTitles.join(', ')}`);
    }
    console.log(`[SYNC] Data source prefs: elevation=${dataSourcePrefs.elevation}, title=${dataSourcePrefs.title}, gear/type=${dataSourcePrefs.gearAndType}`);

    const intervalsConfig = buildNightlyIntervalsConfig({
        athleteId: config.athleteId,
        apiKey: config.apiKey,
    });

    let stravaToken = null;
    if (isFullSync) {
        try {
            stravaToken = await getValidStravaAccessToken(db);
        } catch (err) {
            console.warn('[STRAVA] Token unavailable — Full sync will skip Strava/drift steps:', err.message);
        }
    } else {
        console.log('[SYNC] Fast sync — Intervals fetch + zone map only (no Strava gap fill / detail / drift).');
    }

    let intervalsFetchMeta = null;

    try {
        const fetchResult = await fetchFromIntervalsAPI({
            athleteId: config.athleteId,
            apiKey: config.apiKey,
            startDate,
            endDate,
        });
        intervalsFetchMeta = fetchResult.meta;
        let activities = fetchResult.activities;

        activities = await applyNightlyIntervalsEnrichment(activities, syncContext, intervalsConfig);

        const existingDocs = await db.collection(FIRESTORE_COLLECTION).get();
        const existingActivities = existingDocs.docs.map((d) => ({ ...d.data(), firestoreId: d.id }));

        let intervalsToSave = activities;
        let orphansToSave = [];

        if (isFullSync && stravaToken) {
            try {
                const gapResult = await runIntervalsSyncWithStravaGapFill({
                    intervalsActivities: activities,
                    existingActivities,
                    stravaToken,
                    startYmd: startDate,
                    endYmd: endDate,
                    allowedSportTypes: ACCEPTED_TYPES,
                    opts: { deviceProfileTitles, dataSourcePrefs, intervalsConfig },
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
        }

        const combinedActivities = [...intervalsToSave, ...orphansToSave];

        let savedCount = 0;

        if (combinedActivities.length === 0) {
            console.log(`[SYNC] Geen activiteiten gevonden in de afgelopen ${lookbackDays} dagen.`);
        } else {
            console.log(`[SYNC] ${combinedActivities.length} activiteiten ontvangen (${intervalsToSave.length} Intervals, ${orphansToSave.length} Strava orphans).`);

            savedCount = await upsertToFirestore(db, combinedActivities, config.isDryRun, mergeOpts);
            const action = config.isDryRun ? 'zouden worden opgeslagen' : 'opgeslagen/bijgewerkt';
            console.log(`[SYNC] ✅ Succes! ${savedCount} activiteiten ${action} in Firebase.`);
        }

        const refreshedDocs = await db.collection(FIRESTORE_COLLECTION).get();
        const allActivities = refreshedDocs.docs.map((d) => ({ ...d.data(), firestoreId: d.id }));
        const windowActivities = allActivities.filter((a) => {
            const d = a.date?.split('T')[0];
            return d && d >= startDate && d <= endDate;
        });

        if (isFullSync && stravaToken && windowActivities.length > 0) {
            await enrichWithStrava(db, windowActivities, startDate, endDate, config.isDryRun, mergeOpts);
        } else if (isFullSync && !stravaToken) {
            console.log('[STRAVA] Skipping detail enrichment (no valid token).');
        } else if (!isFullSync) {
            console.log('[STRAVA] Skipped (Fast sync depth).');
        } else {
            console.log('[STRAVA] Geen activiteiten in het sync-venster om te verrijken.');
        }

        if (isFullSync && stravaToken && syncContext.profileFtp > 0 && windowActivities.length > 0) {
            const postStravaDocs = await db.collection(FIRESTORE_COLLECTION).get();
            const postStravaAll = postStravaDocs.docs.map((d) => ({ ...d.data(), firestoreId: d.id }));
            const postStravaWindow = postStravaAll.filter((a) => {
                const d = a.date?.split('T')[0];
                return d && d >= startDate && d <= endDate;
            });

            console.log('[DRIFT] HR drift analysis (Full sync, Settings caps)…');
            const driftResult = await enrichSyncedActivitiesDrift(postStravaWindow, {
                intervalsConfig,
                stravaToken,
                profileFtp: syncContext.profileFtp,
                maxFetches: syncContext.enrichLimits.driftMaxFetches,
                onProgress: (message) => console.log(`[DRIFT] ${message}`),
            });

            if (driftResult.enrichedCount > 0) {
                const driftSaved = await persistDriftEnrichment(
                    db,
                    driftResult.activities,
                    postStravaWindow,
                    mergeOpts,
                    config.isDryRun,
                );
                console.log(`[DRIFT] ✅ ${driftResult.enrichedCount} analyse(s); ${driftSaved} document(s) updated.`);
            } else if (driftResult.remainingCount > 0) {
                console.log(`[DRIFT] No new drift this run; ${driftResult.remainingCount} ride(s) still eligible.`);
            } else {
                console.log('[DRIFT] No eligible rides in window.');
            }
        }

        await recordNightlySyncStatus(db, settingsDoc?.ref ?? null, {
            activitiesSaved: savedCount,
            isDryRun: config.isDryRun,
            syncContext,
            startDate,
            endDate,
            intervalsFetchMeta,
        });
    } catch (error) {
        console.error('[ERROR] Sync mislukt:', error.message);
        await recordNightlySyncFailure(db, settingsDoc?.ref ?? null, {
            message: error.message,
            isDryRun: config.isDryRun,
        });
        process.exit(1);
    }
}

runNightlySync();
