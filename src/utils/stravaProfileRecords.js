/**
 * Resolve Strava list activities that best match athlete stats (longest ride, most elevation).
 * Stats come from GET /athletes/{id}/stats; list activities from GET /athlete/activities.
 */
import { STRAVA_BIKE_TYPES } from './stravaMatch';

const STRAVA_LIST = 'https://www.strava.com/api/v3/athlete/activities';

const isBikeActivity = (a) => STRAVA_BIKE_TYPES.has(a.sport_type || a.type);

/**
 * @param {string} token
 * @param {(msg: string) => void} [onProgress]
 * @param {{ maxPages?: number }} [opts]
 * @returns {Promise<{ activities: object[], historyComplete: boolean }>}
 */
export async function fetchAllBikeActivitiesForRecords(token, onProgress, opts = {}) {
    const maxPages = opts.maxPages ?? 100;
    let page = 1;
    const all = [];
    let historyComplete = true;

    while (true) {
        if (page > maxPages) {
            historyComplete = false;
            break;
        }
        onProgress?.(`Scanning ride history (page ${page})…`);
        const resp = await fetch(`${STRAVA_LIST}?per_page=200&page=${page}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!resp.ok) throw new Error(`Strava activities error: ${resp.status}`);
        const batch = await resp.json();
        if (!Array.isArray(batch) || batch.length === 0) break;
        for (const a of batch) {
            if (isBikeActivity(a)) all.push(a);
        }
        if (batch.length < 200) break;
        page++;
    }

    return { activities: all, historyComplete };
}

const OUTDOOR_TYPES = new Set(['Ride', 'GravelRide', 'MountainBikeRide', 'Cycling']);
const INDOOR_TYPES = new Set(['VirtualRide']);

/**
 * Sum stats from scanned Strava activities, split outdoor vs indoor (VirtualRide).
 * @param {object[]} bikeActivities - already filtered to bike types
 */
export function aggregateBikeActivitiesByContext(bikeActivities) {
    const empty = () => ({
        count: 0,
        distance: 0,
        elevation_gain: 0,
        moving_time: 0
    });
    const combined = empty();
    const outdoor = empty();
    const indoor = empty();

    for (const a of bikeActivities || []) {
        const st = a.sport_type || a.type || '';
        const d = Number(a.distance) || 0;
        const e = Number(a.total_elevation_gain) || 0;
        const t = Number(a.moving_time) || 0;

        combined.count++;
        combined.distance += d;
        combined.elevation_gain += e;
        combined.moving_time += t;

        if (INDOOR_TYPES.has(st)) {
            indoor.count++;
            indoor.distance += d;
            indoor.elevation_gain += e;
            indoor.moving_time += t;
        } else if (OUTDOOR_TYPES.has(st)) {
            outdoor.count++;
            outdoor.distance += d;
            outdoor.elevation_gain += e;
            outdoor.moving_time += t;
        }
    }

    const withAvg = (b) => ({
        ...b,
        avg_distance: b.count > 0 ? b.distance / b.count : 0,
        avg_elevation: b.count > 0 ? b.elevation_gain / b.count : 0,
        avg_moving_time: b.count > 0 ? b.moving_time / b.count : 0
    });

    return {
        combined: withAvg(combined),
        outdoor: withAvg(outdoor),
        indoor: withAvg(indoor)
    };
}

/**
 * Map stats to concrete activities from the athlete activity list.
 * When full history was scanned, the max-distance / max-elevation rides are the API records.
 * @param {object[]} bikeActivities bike-type activities only
 * @param {{ biggest_ride_distance?: number, biggest_climb_elevation_gain?: number }} stats
 * @param {{ historyComplete?: boolean }} meta
 */
export function matchRecordActivities(bikeActivities, stats, meta = {}) {
    const historyComplete = !!meta.historyComplete;

    if (!bikeActivities?.length) {
        return {
            longestRide: null,
            mostElevation: null,
            maxTotalElevationRide: null,
            maxTotalElevationM: 0,
            longestApprox: false,
            elevApprox: false,
            ridesScanned: 0,
            historyComplete
        };
    }

    const targetDist = Number(stats?.biggest_ride_distance) || 0;
    const targetElev = Number(stats?.biggest_climb_elevation_gain) || 0;

    let longestAct = null;
    let maxDist = -1;
    let highestAct = null;
    let maxElev = -1;

    for (const a of bikeActivities) {
        const d = Number(a.distance) || 0;
        const e = Number(a.total_elevation_gain) || 0;
        if (d > maxDist) {
            maxDist = d;
            longestAct = a;
        }
        if (e > maxElev) {
            maxElev = e;
            highestAct = a;
        }
    }

    const distTolM = Math.max(800, targetDist * 0.025);
    const elevTolM = Math.max(20, targetElev * 0.04);

    const longestExact = targetDist > 0 && longestAct && Math.abs(maxDist - targetDist) <= distTolM;
    const elevExact = targetElev > 0 && highestAct && Math.abs(maxElev - targetElev) <= elevTolM;

    let longestRide = null;
    let longestApprox = false;
    if (longestAct && targetDist > 0) {
        if (longestExact) {
            longestRide = longestAct;
        } else if (historyComplete) {
            longestRide = longestAct;
            longestApprox = true;
        }
    }

    let mostElevation = null;
    let elevApprox = false;
    if (highestAct && targetElev > 0) {
        if (elevExact) {
            mostElevation = highestAct;
        } else if (historyComplete) {
            mostElevation = highestAct;
            elevApprox = true;
        }
    }

    /** Ride with highest activity total elevation (Strava `total_elevation_gain` per ride), from scanned history. */
    const maxTotalElevationRide = highestAct && maxElev > 0 ? highestAct : null;
    const maxTotalElevationM = maxElev > 0 ? maxElev : 0;

    return {
        longestRide,
        mostElevation,
        maxTotalElevationRide,
        maxTotalElevationM,
        longestApprox,
        elevApprox,
        ridesScanned: bikeActivities.length,
        historyComplete
    };
}
