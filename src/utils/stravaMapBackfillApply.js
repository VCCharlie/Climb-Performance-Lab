/**
 * Store Strava summary polylines (strava_map) for selected activities from Settings / bulk flows.
 */

import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase.js';
import { protectEnrichedFieldsOnMerge } from './firestoreActivityMerge.js';
import { buildActivityFirestoreMergePayload } from './activityFirestoreWrite.js';
import { resolveOwnerUid } from './activityOwnership.js';
import { enrichSelectedActivitiesFromStrava } from './stravaSelectedEnrich.js';
import {
    classifyMissingRouteMapBackfillAction,
    buildMapBackfillOutcome,
} from './intervalsMapBackfillOutcomes.js';
import { MAP_BACKFILL_CODE } from './intervalsMapBackfillCodes.js';
import { activityNeedsIntervalsMapPolyline } from './intervalsMapEnrich.js';

/**
 * @param {object[]} activities
 * @param {() => Promise<string|null>} stravaGetToken
 * @param {{ deviceProfileTitles?: string[], dataSourcePrefs?: object }} mergeProtectOpts
 * @param {{ concurrency?: number, onProgress?: (msg: string) => void }} [opts]
 */
export async function applyStravaMapBackfill(activities, stravaGetToken, mergeProtectOpts = {}, opts = {}) {
    const list = Array.isArray(activities) ? activities : [];
    const activitiesMap = new Map(list.map((a) => [String(a.id), a]));
    /** @type {import('./intervalsMapBackfillOutcomes.js').IntervalsMapBackfillOutcome[]} */
    const outcomes = [];

    const eligible = list.filter((act) => {
        const { action } = classifyMissingRouteMapBackfillAction(act);
        return action === 'strava_enrich';
    });

    if (!stravaGetToken) {
        for (const act of eligible) {
            outcomes.push(buildMapBackfillOutcome(act, 'skipped', MAP_BACKFILL_CODE.STRAVA_NOT_CONNECTED));
        }
        return { activities: list, updates: [], outcomes, mapsAdded: 0 };
    }

    if (eligible.length === 0) {
        return { activities: list, updates: [], outcomes, mapsAdded: 0 };
    }

    opts.onProgress?.(`Strava route map: ${eligible.length} ride(s)…`);
    const token = await stravaGetToken();
    if (!token) {
        for (const act of eligible) {
            outcomes.push(buildMapBackfillOutcome(act, 'failed', MAP_BACKFILL_CODE.STRAVA_NOT_CONNECTED));
        }
        return { activities: list, updates: [], outcomes, mapsAdded: 0 };
    }

    const enrichResult = await enrichSelectedActivitiesFromStrava(eligible, token, {
        concurrency: opts.concurrency ?? 3,
        forceStravaDetail: true,
        deviceProfileTitles: mergeProtectOpts.deviceProfileTitles,
        dataSourcePrefs: mergeProtectOpts.dataSourcePrefs,
        onProgress: opts.onProgress,
    });

    const updates = enrichResult.updates || [];
    const updatesMap = new Map(updates.map((u) => [String(u.id), u.data]));

    if (db && updates.length) {
        const uid = resolveOwnerUid();
        await Promise.all(
            updates.map(({ id, data }) => {
                const prev = activitiesMap.get(String(id)) || {};
                const payload = buildActivityFirestoreMergePayload(data, prev, mergeProtectOpts, uid);
                return setDoc(doc(db, 'activities', String(id)), payload, { merge: true });
            }),
        );
    }

    const next = list.map((act) => {
        const patch = updatesMap.get(String(act.id));
        if (!patch) return act;
        const existingBase = activitiesMap.get(String(act.id)) || act;
        return protectEnrichedFieldsOnMerge({ ...act, ...patch }, existingBase, mergeProtectOpts);
    });

    for (const act of eligible) {
        const patch = updatesMap.get(String(act.id));
        const hadMap = patch?.strava_map != null && String(patch.strava_map).trim() !== '';
        if (hadMap) {
            outcomes.push(buildMapBackfillOutcome(act, 'added', MAP_BACKFILL_CODE.ADDED));
        } else if (!activityNeedsIntervalsMapPolyline({ ...act, ...patch })) {
            outcomes.push(buildMapBackfillOutcome(act, 'added', MAP_BACKFILL_CODE.ADDED));
        } else {
            outcomes.push(buildMapBackfillOutcome(act, 'skipped', MAP_BACKFILL_CODE.NO_GPS_DATA));
        }
    }

    const mapsAdded = outcomes.filter((o) => o.status === 'added').length;

    return {
        activities: next,
        updates,
        outcomes,
        mapsAdded,
        enrichStats: enrichResult,
    };
}
