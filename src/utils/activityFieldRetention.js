/**
 * Field-level retention for activity merge / enrich pipelines.
 *
 * Recommended order:
 * 1. Intervals.icu import (bike-computer metrics)
 * 2. protectEnrichedFieldsOnMerge (keep Strava / manual corrections)
 * 3. Strava enrich (map-corrected elevation, gear, route)
 * 4. Drift / decoupling (stream summaries only — never overwrites climbing)
 */

/**
 * @param {number | string | null | undefined} value
 * @returns {number}
 */
export function climbingMetersRounded(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.round(n);
}

/**
 * @param {object | null | undefined} activity
 * @returns {boolean}
 */
export function hasProtectedClimbing(activity) {
    if (!activity) return false;
    return activity.climbing_from_strava === true || activity.climbing_user_corrected === true;
}

/**
 * @param {object | null | undefined} previous
 * @param {object | null | undefined} next
 * @returns {boolean}
 */
export function climbingWasManuallyEdited(previous, next) {
    if (!previous || !next) return false;
    return climbingMetersRounded(previous.climbing) !== climbingMetersRounded(next.climbing);
}

/**
 * When the user edits climbing in the activity modal, mark it so later syncs do not
 * overwrite with Intervals bike-computer elevation.
 *
 * @param {object} previous
 * @param {object} next
 * @returns {object}
 */
export function applyManualClimbingCorrectionFlags(previous, next) {
    if (!climbingWasManuallyEdited(previous, next)) return next;
    return { ...next, climbing_user_corrected: true };
}

/**
 * Whether Strava API elevation should be written onto an activity.
 *
 * @param {object | null | undefined} activity
 * @param {{ forceRefreshElevation?: boolean }} [opts]
 * @returns {boolean}
 */
export function shouldApplyStravaElevationPatch(activity, opts = {}) {
    if (opts.forceRefreshElevation === true) return true;
    if (activity?.climbing_user_corrected === true) return false;
    if (activity?.climbing_from_strava === true) return false;
    return true;
}

/**
 * Preserve trusted climbing meters on Intervals re-sync / merge.
 *
 * @param {object} incoming
 * @param {object} existing
 * @param {object} out - mutable merge payload
 */
export function protectClimbingOnMerge(incoming, existing, out) {
    if (!existing || !out) return;

    if (existing.climbing_user_corrected === true) {
        out.climbing = existing.climbing;
        out.climbing_user_corrected = true;
        return;
    }

    if (
        existing.climbing_from_strava === true
        && incoming.climbing_from_strava !== true
    ) {
        out.climbing = existing.climbing;
        out.climbing_from_strava = true;
    }
}
