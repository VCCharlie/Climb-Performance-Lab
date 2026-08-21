/**
 * Strava map-corrected elevation (total_elevation_gain) for site activity `climbing` (meters).
 */

import { shouldApplyStravaElevationPatch } from './activityFieldRetention';

/**
 * @param {number | string | null | undefined} totalElevationGain - Strava API field
 * @returns {number | null} rounded meters, or null if missing/invalid
 */
export function climbingMetersFromStrava(totalElevationGain) {
    if (totalElevationGain == null || totalElevationGain === '') return null;
    const n = Number(totalElevationGain);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.round(n);
}

/**
 * @param {object | null | undefined} stravaActivity - list or detail JSON from Strava API
 * @returns {{ climbing: number, climbing_from_strava: true } | {}}
 */
export function climbingPatchFromStravaActivity(stravaActivity) {
    const meters = climbingMetersFromStrava(stravaActivity?.total_elevation_gain);
    if (meters == null) return {};
    return { climbing: meters, climbing_from_strava: true };
}

/**
 * @param {object} activity
 * @param {object | null | undefined} stravaActivity
 * @returns {object}
 */
export function applyStravaElevationToActivity(activity, stravaActivity, opts = {}) {
    if (!shouldApplyStravaElevationPatch(activity, opts)) return activity;
    const patch = climbingPatchFromStravaActivity(stravaActivity);
    if (Object.keys(patch).length === 0) return activity;
    const next = { ...activity, ...patch };
    if (next.climbing_from_strava === true) {
        delete next.climbing_user_corrected;
    }
    return next;
}
