/**
 * Fetch intervals_map for activities missing route polylines and persist to Firestore + in-memory list.
 */

import { db } from '../firebase.js';
import { batchWriteDocuments } from './firestoreBatchWrite.js';
import { buildActivityFirestoreMergePayload } from './activityFirestoreWrite.js';
import { protectEnrichedFieldsOnMerge } from './firestoreActivityMerge.js';
import { stripUndefinedFields } from './mergeActivities.js';
import { resolveOwnerUid } from './activityOwnership.js';
import { buildIntervalsMapEnrichmentUpdates } from './intervalsMapEnrich.js';

/**
 * @param {object[]} activities
 * @param {{ apiKey?: string }} intervalsConfig
 * @param {{ deviceProfileTitles?: string[], dataSourcePrefs?: object }} mergeProtectOpts
 * @param {{ concurrency?: number, delayMs?: number, onProgress?: (msg: string) => void }} [opts]
 * @returns {Promise<{ activities: object[], updates: object[], ridesProcessed: number, unchanged: number, failed: number }>}
 */
export async function applyIntervalsMapBackfill(activities, intervalsConfig, mergeProtectOpts = {}, opts = {}) {
    const list = Array.isArray(activities) ? activities : [];
    const activitiesMap = new Map(list.map((a) => [String(a.id), a]));

    const mapResult = await buildIntervalsMapEnrichmentUpdates(list, intervalsConfig, opts);

    if (db && mapResult.updates?.length) {
        const uid = resolveOwnerUid();
        await batchWriteDocuments(
            'activities',
            mapResult.updates.map(({ id, data }) => {
                const strId = String(id);
                const existingRow = activitiesMap.get(strId) || {};
                return {
                    id,
                    data: buildActivityFirestoreMergePayload(data, existingRow, mergeProtectOpts, uid),
                };
            }),
        );
    }

    const updatesMap = new Map(mapResult.updates.map((u) => [String(u.id), u.data]));
    const next = list.map((act) => {
        const patch = updatesMap.get(String(act.id));
        if (!patch) return act;
        const existingBase = activitiesMap.get(String(act.id)) || act;
        return protectEnrichedFieldsOnMerge(
            stripUndefinedFields({ ...act, ...patch }),
            existingBase,
            mergeProtectOpts,
        );
    });

    return {
        activities: next,
        updates: mapResult.updates,
        ridesProcessed: mapResult.ridesProcessed,
        unchanged: mapResult.unchanged,
        failed: mapResult.failed,
        outcomes: mapResult.outcomes || [],
    };
}
