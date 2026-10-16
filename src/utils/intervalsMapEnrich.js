/**
 * Backfill intervals_map on activities that have no Strava summary polyline yet.
 */

import { stripUndefinedFields } from './mergeActivities.js';
import { fetchIntervalsActivityMapPolyline } from './intervalsMapFetch.js';

/**
 * @param {object | null | undefined} activity
 * @returns {boolean}
 */
export function activityNeedsIntervalsMapPolyline(activity) {
    if (!activity?.id) return false;
    const stravaMap = activity.strava_map != null && String(activity.strava_map).trim() !== '';
    if (stravaMap) return false;
    const intervalsMap = activity.intervals_map != null && String(activity.intervals_map).trim() !== '';
    return !intervalsMap;
}

/** @deprecated Use activityNeedsIntervalsMapPolyline */
export function isEligibleForIntervalsMapBackfill(activity) {
    return activityNeedsIntervalsMapPolyline(activity);
}

/**
 * @param {object[] | null | undefined} activities
 * @returns {object[]}
 */
export function filterActivitiesForIntervalsMapBackfill(activities) {
    return (Array.isArray(activities) ? activities : []).filter(activityNeedsIntervalsMapPolyline);
}

/**
 * Intervals.icu activity ids are typically `i` + digits.
 *
 * @param {string | number | null | undefined} id
 * @returns {boolean}
 */
export function isIntervalsActivityId(id) {
    const s = String(id ?? '').trim();
    return /^i\d+$/i.test(s);
}

/**
 * @param {object} activity
 * @param {{ apiKey?: string }} intervalsConfig
 */
export async function enrichActivityMapFromIntervals(activity, intervalsConfig) {
    if (!activityNeedsIntervalsMapPolyline(activity) || !intervalsConfig?.apiKey) {
        return stripUndefinedFields({ ...activity });
    }
    const poly = await fetchIntervalsActivityMapPolyline(String(activity.id), intervalsConfig);
    if (!poly) return stripUndefinedFields({ ...activity });
    return stripUndefinedFields({ ...activity, intervals_map: poly });
}

/**
 * @param {object[]} siteActivities
 * @param {{ apiKey?: string }} intervalsConfig
 * @param {{ concurrency?: number, onProgress?: (msg: string) => void }} [opts]
 */
export async function buildIntervalsMapEnrichmentUpdates(siteActivities, intervalsConfig, opts = {}) {
    const conc = Math.max(1, Math.min(4, opts.concurrency ?? 2));
    const list = filterActivitiesForIntervalsMapBackfill(siteActivities);
    if (!intervalsConfig?.apiKey || list.length === 0) {
        return { updates: [], ridesProcessed: 0, unchanged: 0, failed: 0 };
    }

    opts.onProgress?.(`Intervals route map: ${list.length} ride(s)…`);

    const updates = [];
    let unchanged = 0;
    let failed = 0;
    let idx = 0;

    async function worker() {
        while (idx < list.length) {
            const i = idx;
            idx += 1;
            const act = list[i];
            try {
                const enriched = await enrichActivityMapFromIntervals(act, intervalsConfig);
                const poly = enriched.intervals_map;
                if (!poly || String(act.intervals_map || '') === String(poly)) {
                    unchanged += 1;
                    continue;
                }
                updates.push({ id: act.id, data: { intervals_map: poly } });
            } catch {
                failed += 1;
            }
            if (opts.delayMs) {
                await new Promise((r) => setTimeout(r, opts.delayMs));
            }
        }
    }

    const workers = Array.from({ length: conc }, () => worker());
    await Promise.all(workers);

    return {
        updates,
        ridesProcessed: list.length,
        unchanged,
        failed,
    };
}

/**
 * Merge intervals_map patches into an in-memory activity list (browser sync + nightly Node).
 *
 * @param {object[]} activities
 * @param {{ apiKey?: string }} intervalsConfig
 * @param {{ concurrency?: number, delayMs?: number, onProgress?: (msg: string) => void }} [opts]
 */
export async function enrichActivitiesWithIntervalsMapPolylines(activities, intervalsConfig, opts = {}) {
    const list = Array.isArray(activities) ? activities : [];
    if (!intervalsConfig?.apiKey || list.length === 0) {
        return {
            activities: list,
            updates: [],
            ridesProcessed: 0,
            unchanged: 0,
            failed: 0,
            mapsAdded: 0,
        };
    }

    const mapResult = await buildIntervalsMapEnrichmentUpdates(list, intervalsConfig, opts);
    const updatesMap = new Map(mapResult.updates.map((u) => [String(u.id), u.data.intervals_map]));
    const next = list.map((act) => {
        const poly = updatesMap.get(String(act.id));
        if (!poly) return act;
        return stripUndefinedFields({ ...act, intervals_map: poly });
    });

    return {
        activities: next,
        updates: mapResult.updates,
        ridesProcessed: mapResult.ridesProcessed,
        unchanged: mapResult.unchanged,
        failed: mapResult.failed,
        mapsAdded: mapResult.updates.length,
    };
}
