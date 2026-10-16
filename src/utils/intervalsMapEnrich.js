/**
 * Backfill intervals_map on activities that have no Strava summary polyline yet.
 */

import { stripUndefinedFields } from './mergeActivities.js';
import { fetchIntervalsActivityMapPolylineDetailed } from './intervalsMapFetch.js';
import {
    buildMapBackfillOutcome,
    planIntervalsMapBackfillFromActivities,
} from './intervalsMapBackfillOutcomes.js';
import { MAP_BACKFILL_CODE } from './intervalsMapBackfillCodes.js';
import { buildRideGeoPatchFromPolyline } from './activityRideGeo.js';

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
 * @param {object[]} siteActivities
 * @param {{ forceRefresh?: boolean }} [opts]
 * @returns {object[]}
 */
export function selectActivitiesForIntervalsMapFetch(siteActivities, opts = {}) {
    const list = Array.isArray(siteActivities) ? siteActivities : [];
    if (opts.forceRefresh) {
        return list.filter((a) => isIntervalsActivityId(a?.id));
    }
    return planIntervalsMapBackfillFromActivities(list).toFetch;
}

/**
 * @param {object} activity
 * @param {{ apiKey?: string }} intervalsConfig
 */
export async function enrichActivityMapFromIntervals(activity, intervalsConfig) {
    if (!activityNeedsIntervalsMapPolyline(activity) || !intervalsConfig?.apiKey) {
        return stripUndefinedFields({ ...activity });
    }
    const fetchResult = await fetchIntervalsActivityMapPolylineDetailed(String(activity.id), intervalsConfig);
    if (!fetchResult.polyline) return stripUndefinedFields({ ...activity });
    return stripUndefinedFields({ ...activity, intervals_map: fetchResult.polyline });
}

/**
 * @param {object[]} siteActivities
 * @param {{ apiKey?: string }} intervalsConfig
 * @param {{ concurrency?: number, onProgress?: (msg: string) => void }} [opts]
 */
export async function buildIntervalsMapEnrichmentUpdates(siteActivities, intervalsConfig, opts = {}) {
    const conc = Math.max(1, Math.min(4, opts.concurrency ?? 2));
    const forceRefresh = opts.forceRefresh === true;
    const inferRideGeo = opts.inferRideGeo !== false;
    const plan = planIntervalsMapBackfillFromActivities(siteActivities);
    /** @type {import('./intervalsMapBackfillOutcomes.js').IntervalsMapBackfillOutcome[]} */
    const outcomes = forceRefresh ? [] : [...plan.preSkipped];

    if (!intervalsConfig?.apiKey) {
        const missingKeyTargets = forceRefresh
            ? selectActivitiesForIntervalsMapFetch(siteActivities, { forceRefresh: true })
            : plan.toFetch;
        for (const act of missingKeyTargets) {
            outcomes.push(buildMapBackfillOutcome(act, 'skipped', MAP_BACKFILL_CODE.MISSING_API_KEY));
        }
        return {
            updates: [],
            ridesProcessed: 0,
            unchanged: 0,
            failed: 0,
            outcomes,
        };
    }

    const list = selectActivitiesForIntervalsMapFetch(siteActivities, { forceRefresh });
    if (list.length === 0) {
        return { updates: [], ridesProcessed: 0, unchanged: 0, failed: 0, outcomes };
    }

    opts.onProgress?.(`Intervals route map: ${list.length} ride(s)…`);

    const updates = [];
    let unchanged = 0;
    let failed = 0;
    let idx = 0;
    const fetchOutcomes = new Array(list.length);

    async function worker() {
        while (idx < list.length) {
            const i = idx;
            idx += 1;
            const act = list[i];
            try {
                const fetchResult = await fetchIntervalsActivityMapPolylineDetailed(String(act.id), intervalsConfig);
                const poly = fetchResult.polyline;
                const polyForGeo = poly || (forceRefresh ? String(act.intervals_map || '').trim() : '');
                let geoPatch = null;
                if (inferRideGeo && polyForGeo) {
                    geoPatch = await buildRideGeoPatchFromPolyline(act, polyForGeo);
                    if (opts.geocodeDelayMs) {
                        await new Promise((r) => setTimeout(r, opts.geocodeDelayMs));
                    }
                }
                const mapChanged = poly && String(act.intervals_map || '') !== String(poly);
                const geoChanged = geoPatch && (
                    String(act.ride_country || '') !== String(geoPatch.ride_country || '')
                    || String(act.ride_region || '') !== String(geoPatch.ride_region || '')
                );
                if (mapChanged || geoChanged) {
                    updates.push({
                        id: act.id,
                        data: stripUndefinedFields({
                            ...(mapChanged ? { intervals_map: poly } : {}),
                            ...(geoPatch || {}),
                        }),
                    });
                    fetchOutcomes[i] = buildMapBackfillOutcome(act, 'added', MAP_BACKFILL_CODE.ADDED);
                } else if (
                    fetchResult.code === MAP_BACKFILL_CODE.NO_GPS_DATA
                    || fetchResult.code === MAP_BACKFILL_CODE.NOT_INTERVALS_ACTIVITY
                ) {
                    unchanged += 1;
                    fetchOutcomes[i] = buildMapBackfillOutcome(
                        act,
                        'skipped',
                        fetchResult.code,
                        { httpStatus: fetchResult.httpStatus },
                    );
                } else if (!poly) {
                    failed += 1;
                    fetchOutcomes[i] = buildMapBackfillOutcome(
                        act,
                        'failed',
                        fetchResult.code,
                        {
                            httpStatus: fetchResult.httpStatus,
                            networkDetail: fetchResult.networkDetail,
                        },
                    );
                } else {
                    unchanged += 1;
                    fetchOutcomes[i] = buildMapBackfillOutcome(act, 'skipped', MAP_BACKFILL_CODE.NO_GPS_DATA);
                }
            } catch {
                failed += 1;
                fetchOutcomes[i] = buildMapBackfillOutcome(act, 'failed', MAP_BACKFILL_CODE.NETWORK_ERROR);
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
        outcomes: [...outcomes, ...fetchOutcomes.filter(Boolean)],
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
