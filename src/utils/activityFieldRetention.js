/**
 * Field-level retention for activity merge / enrich pipelines.
 *
 * Recommended order:
 * 1. Intervals.icu import (bike-computer metrics + zone times)
 * 2. protectEnrichedFieldsOnMerge (keep Strava / manual corrections)
 * 3. Strava enrich (map-corrected elevation, gear, route)
 * 4. Drift / decoupling (stream summaries only — never overwrites climbing)
 *
 * ─── Checklist when adding a new enriched field ───
 *
 * 1. Decide the pipeline stage:
 *    - Intervals-only metrics → no protect* needed if Intervals is source of truth.
 *    - Strava / manual / stream-derived → add protect* before any re-sync can wipe it.
 *
 * 2. Add a focused helper here (protectXOnMerge) when logic is non-trivial; wire it
 *    into protectEnrichedFieldsOnMerge in firestoreActivityMerge.js.
 *
 * 3. Audit every Firestore write path (setDoc merge: true):
 *    - useDataHubIntervalsSync.js
 *    - useDataHubImport.js (via mergePayload)
 *    - useDataHubBulkActions.js
 *    - useDataHubMaintenance.js
 *    - useDataHubStravaEnrich.js (silent + panel import)
 *    - ActivitiesContext (via activityUpsert.prepareProtectedActivityUpserts)
 *    - scripts/nightlySync.js (Node — import from src/utils/firestoreActivityMerge.js)
 *
 * 4. Add unit tests in activityFieldRetention.test.js and/or firestoreActivityMerge.test.js.
 *
 * 5. Cloud function (main.py) transforms API → activity shape only; merge protection
 *    runs client-side / nightly script — keep field names aligned with intervals.js.
 *
 * 6. User tags / notes (`tags`, `user_notes`) — protectActivityTagsOnMerge in activityTags.js.
 */

import { normalizeStravaActivityId } from './strava.js';
import { isGenericActivityTitle, shouldPreferStravaTitle } from './stravaTitleHeuristics.js';
import { isStoredStravaLinkDayMismatch } from './stravaTitleSameDay.js';
import { protectZoneTimesOnMerge } from './zoneTimes.js';

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
 * @param {object | null | undefined} activity
 * @returns {boolean}
 */
export function activityHasStravaLink(activity) {
    const n = normalizeStravaActivityId(activity?.strava_id);
    return !!(n && n.length >= 6);
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
    if (opts.dataSourcePrefs?.elevation === 'intervals') return false;
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
export function protectClimbingOnMerge(incoming, existing, out, opts = {}) {
    if (!existing || !out) return;

    if (existing.climbing_user_corrected === true) {
        out.climbing = existing.climbing;
        out.climbing_user_corrected = true;
        return;
    }

    if (opts.dataSourcePrefs?.elevation === 'intervals') {
        return;
    }

    if (
        existing.climbing_from_strava === true
        && incoming.climbing_from_strava !== true
    ) {
        out.climbing = existing.climbing;
        out.climbing_from_strava = true;
        return;
    }

    // Strava-linked rows without the flag (legacy) still lose map-corrected meters on backfill.
    if (
        activityHasStravaLink(existing)
        && climbingMetersRounded(existing.climbing) > 0
        && incoming.climbing_from_strava !== true
        && climbingMetersRounded(incoming.climbing) !== climbingMetersRounded(existing.climbing)
    ) {
        out.climbing = existing.climbing;
        if (existing.climbing_from_strava === true) {
            out.climbing_from_strava = true;
        }
    }
}

/**
 * Preserve Strava/custom titles when Intervals backfill sends profile or generic names.
 *
 * @param {object} incoming
 * @param {object} existing
 * @param {object} out
 * @param {{ deviceProfileTitles?: string[] }} [opts]
 */
export function protectStravaLinkedTitleOnMerge(incoming, existing, out, opts = {}) {
    if (!existing || !out || !activityHasStravaLink(existing)) return;

    const exTitle = (existing.title || '').trim();
    const inTitle = (incoming.title || '').trim();
    if (!exTitle) return;

    const titleOpts = {
        gearName: existing.gear_name,
        deviceProfileTitles: opts.deviceProfileTitles || [],
    };

    // Legacy wrong-day Strava link: allow Intervals re-import to restore the site title.
    if (isStoredStravaLinkDayMismatch(existing) && inTitle && !isGenericActivityTitle(inTitle)) {
        out.title = incoming.title;
        return;
    }

    if (opts.dataSourcePrefs?.title === 'intervals') {
        return;
    }

    // Incoming Strava title wins when existing title is replaceable and incoming is not generic.
    if (
        inTitle
        && !isGenericActivityTitle(inTitle)
        && shouldPreferStravaTitle(exTitle, inTitle, titleOpts)
    ) {
        return;
    }

    // Custom Strava / user titles must never be replaced by Intervals device-profile names.
    if (!isGenericActivityTitle(exTitle)) {
        out.title = existing.title;
    }
}

/**
 * Preserve Strava gear when Intervals sends bike-computer gear ids/names.
 *
 * @param {object} incoming
 * @param {object} existing
 * @param {object} out
 */
export function protectStravaLinkedGearOnMerge(incoming, existing, out, opts = {}) {
    if (!existing || !out || !activityHasStravaLink(existing)) return;

    if (opts.dataSourcePrefs?.gearAndType === 'intervals') {
        return;
    }

    if (existing.gear_id) {
        out.gear_id = existing.gear_id;
    }
    const exGearName = existing.gear_name != null && String(existing.gear_name).trim() !== '';
    if (exGearName) {
        out.gear_name = existing.gear_name;
    }
}

/**
 * Preserve Strava sport_type (VirtualRide, GravelRide, …) on Intervals re-sync.
 *
 * @param {object} incoming
 * @param {object} existing
 * @param {object} out
 */
export function protectStravaLinkedTypeOnMerge(incoming, existing, out, opts = {}) {
    if (!existing || !out || !activityHasStravaLink(existing)) return;

    if (opts.dataSourcePrefs?.gearAndType === 'intervals') {
        return;
    }

    const exType = (existing.type || '').trim();
    if (exType) {
        out.type = existing.type;
    }
}

/**
 * Preserve enriched zone-time arrays when Intervals re-sync omits them.
 *
 * @param {object} incoming
 * @param {object} existing
 * @param {object} out
 */
export function protectZoneTimesFieldsOnMerge(incoming, existing, out) {
    protectZoneTimesOnMerge(incoming, existing, out);
}
