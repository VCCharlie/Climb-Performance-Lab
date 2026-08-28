/**
 * Strava orphan detection — import Strava rides not linked to Intervals rows.
 */
import { normalizeStravaActivity } from './stravaMatch.js';
import { stravaLocalDateYmd, ymdInRangeInclusive } from './stravaVsLogGap.js';

/** Intervals sport type → Strava API sport_type / type values. */
const INTERVALS_TO_STRAVA_TYPES = {
    Ride: ['Ride', 'GravelRide', 'MountainBikeRide', 'Cycling'],
    VirtualRide: ['VirtualRide'],
    GravelRide: ['GravelRide'],
    MountainBikeRide: ['MountainBikeRide', 'Ride'],
    EBikeRide: ['EBikeRide'],
    Run: ['Run'],
    Walk: ['Walk'],
    Hike: ['Hike'],
    Workout: ['Workout'],
    IndoorCycling: ['VirtualRide'],
};

/**
 * @param {object} stravaAct — raw Strava list item
 * @param {string[]} allowedIntervalsTypes — Intervals sport filters from sync UI
 * @returns {boolean}
 */
export function stravaMatchesIntervalsSportFilters(stravaAct, allowedIntervalsTypes) {
    const types = allowedIntervalsTypes || [];
    if (types.length === 0) return true;

    const stravaType = String(stravaAct?.sport_type || stravaAct?.type || '').trim();
    if (!stravaType) return false;

    for (const intervalsType of types) {
        const mapped = INTERVALS_TO_STRAVA_TYPES[intervalsType] || [intervalsType];
        if (mapped.includes(stravaType)) return true;
    }
    return false;
}

/**
 * Collect Strava IDs already represented in the activity log.
 * @param {object[]} activities
 * @returns {Set<string>}
 */
export function collectExistingStravaIds(activities) {
    const ids = new Set();
    for (const act of activities || []) {
        if (act?.strava_id != null && String(act.strava_id).trim() !== '') {
            ids.add(String(act.strava_id));
        }
    }
    return ids;
}

/**
 * Strava IDs consumed by linking Strava to Intervals rows in the current sync pass.
 * @param {object[]} linkedIntervalsActivities
 * @returns {Set<string>}
 */
export function collectLinkedStravaIds(linkedIntervalsActivities) {
    const ids = new Set();
    for (const act of linkedIntervalsActivities || []) {
        if (act?.strava_id != null && String(act.strava_id).trim() !== '') {
            ids.add(String(act.strava_id));
        }
    }
    return ids;
}

/**
 * Find Strava activities in range that are not linked to Intervals and not already in the log.
 *
 * @param {object} params
 * @param {object[]} params.stravaActivities — raw Strava list items
 * @param {object[]} params.linkedIntervalsActivities — Intervals rows after Strava link pass
 * @param {object[]} params.existingActivities — full activity log for strava_id dedup
 * @param {string[]} params.allowedSportTypes — Intervals sport filters
 * @param {string} params.startYmd
 * @param {string} params.endYmd
 * @returns {{ orphans: object[], alreadyLinkedCount: number, linkedToIntervalsCount: number }}
 */
export function findStravaOrphanActivities({
    stravaActivities,
    linkedIntervalsActivities,
    existingActivities,
    allowedSportTypes,
    startYmd,
    endYmd,
}) {
    const usedStravaIds = collectLinkedStravaIds(linkedIntervalsActivities);
    const existingStravaIds = collectExistingStravaIds(existingActivities);

    const orphans = [];
    let alreadyLinkedCount = 0;

    for (const stravaAct of stravaActivities || []) {
        const stravaId = stravaAct?.id != null ? String(stravaAct.id) : null;
        if (!stravaId) continue;

        const ymd = stravaLocalDateYmd(stravaAct);
        if (!ymdInRangeInclusive(ymd, startYmd, endYmd)) continue;

        if (!stravaMatchesIntervalsSportFilters(stravaAct, allowedSportTypes)) continue;

        if (existingStravaIds.has(stravaId)) {
            alreadyLinkedCount += 1;
            continue;
        }

        if (usedStravaIds.has(stravaId)) {
            continue;
        }

        orphans.push(normalizeStravaActivity(stravaAct));
    }

    return {
        orphans,
        alreadyLinkedCount,
        linkedToIntervalsCount: usedStravaIds.size,
    };
}
