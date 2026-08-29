/**
 * Merge two activity records: keep Intervals as the canonical id, enrich with Strava-style fields.
 */

import { normalizeStravaActivityId } from './strava.js';
import { parseDurationToSeconds } from './formatters.js';
import { activityDistanceKm } from './activityFilterMetrics.js';
import { climbingMetersFromStrava } from './stravaElevation.js';
import { isSameActivity } from './dedup.js';

/** Intervals sync uses seconds (number); Strava normalize uses "H:MM:SS" string — compare in seconds. */
function movingTimeToSeconds(val) {
    if (val == null || val === '') return 0;
    if (typeof val === 'number' && !Number.isNaN(val)) return Math.max(0, Math.floor(val));
    return parseDurationToSeconds(String(val));
}

const GENERIC_TITLE = /^(Morning|Lunch|Afternoon|Evening|Night) Ride$|^Untitled$/i;

const isGenericTitle = (t) => {
    const s = (t || '').trim();
    return !s || GENERIC_TITLE.test(s);
};

/** Strava-import rows use id like strava_123 */
export function isStravaOnlyActivityId(id) {
    return id != null && String(id).startsWith('strava_');
}

/** Intervals.icu ids are numeric or i-prefixed (e.g. i53534754); CSV imports use csv_ prefix */
export function isLikelyIntervalsActivityId(id) {
    const s = String(id ?? '');
    if (!s || s.startsWith('strava_')) return false;
    if (s.startsWith('csv_')) return true;
    if (/^i\d+$/i.test(s)) return true;
    return /^\d+$/.test(s);
}

/**
 * Score how complete an activity row is for merge keeper selection.
 * @param {object} activity
 * @returns {number}
 */
export function mergeCompletenessScore(activity) {
    if (!activity) return 0;
    let score = 0;
    if (activity.strava_id) score += 100;
    if (Number(activity.load) > 0) score += 50;
    if (Number(activity.norm_power) > 0 || Number(activity.avg_power) > 0) score += 25;
    if (Number(activity.avg_hr) > 0) score += 20;
    if (Number(activity.distance) > 0) score += 10;
    if (activity.gear_id) score += 5;
    if (isLikelyIntervalsActivityId(activity.id)) score += 5;
    return score;
}

/**
 * Pick keeper vs duplicate side for merge UI and Firestore write.
 * @param {object} x
 * @param {object} y
 * @returns {{ primary: object, secondary: object } | { error: string }}
 */
export function pickMergePairSides(x, y) {
    if (!x || !y) return { error: 'Select two activities to merge.' };
    if (String(x.id) === String(y.id)) {
        return { error: 'Cannot merge an activity with itself.' };
    }

    if (isLikelyIntervalsActivityId(x.id) && isStravaOnlyActivityId(y.id)) {
        return { primary: x, secondary: y };
    }
    if (isLikelyIntervalsActivityId(y.id) && isStravaOnlyActivityId(x.id)) {
        return { primary: y, secondary: x };
    }
    if (!String(x.id).startsWith('strava_') && String(y.id).startsWith('strava_')) {
        return { primary: x, secondary: y };
    }
    if (!String(y.id).startsWith('strava_') && String(x.id).startsWith('strava_')) {
        return { primary: y, secondary: x };
    }

    if (!isSameActivity(x, y)) {
        return {
            error: 'Selected rows do not look like duplicates. Use Tools → Duplicates to review, or pick two rows with the same date and title.',
        };
    }

    const sx = mergeCompletenessScore(x);
    const sy = mergeCompletenessScore(y);
    if (sx >= sy) return { primary: x, secondary: y };
    return { primary: y, secondary: x };
}

/**
 * Pick the richer title (prefer non-generic, then longer).
 * @param {string} a
 * @param {string} b
 */
export function pickMergedTitle(a, b) {
    const ta = (a || '').trim();
    const tb = (b || '').trim();
    const aSpec = !isGenericTitle(ta);
    const bSpec = !isGenericTitle(tb);
    if (aSpec && !bSpec) return ta;
    if (bSpec && !aSpec) return tb;
    if (ta.length >= tb.length) return ta || tb;
    return tb || ta;
}

const POWER_KEYS = [
    'norm_power', 'avg_power', 'load', 'work',
    'best_1min', 'best_5min', 'best_10min', 'best_20min', 'best_60min',
    'best_90min', 'best_120min',
    'max_power', 'ftp',
];

const HR_KEYS = ['avg_hr', 'max_hr'];

/**
 * Firestore setDoc rejects `undefined` field values — strip them (shallow).
 * @param {object} obj
 */
export function stripUndefinedFields(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const out = { ...obj };
    for (const k of Object.keys(out)) {
        if (out[k] === undefined) delete out[k];
    }
    return out;
}

/**
 * @param {object} primary - Record to keep (Intervals id)
 * @param {object} secondary - Other record (often Strava-only import)
 * @returns {object} Full merged activity (same id as primary)
 */
export function mergeActivitiesIntervalsPrimary(primary, secondary) {
    if (!primary || !secondary) throw new Error('mergeActivitiesIntervalsPrimary: missing activity');
    const p = { ...primary };
    const s = secondary;

    const existingSid = normalizeStravaActivityId(p.strava_id) || (p.strava_id ? String(p.strava_id).trim() : '');
    const incomingSid = normalizeStravaActivityId(s.strava_id) || (s.strava_id ? String(s.strava_id).trim() : '');
    const secondaryIsStrava = Boolean(incomingSid) || isStravaOnlyActivityId(s.id);
    if (existingSid && incomingSid && existingSid !== incomingSid) {
        throw new Error(
            `Intervals activity already has strava_id ${existingSid}; selected duplicate has ${incomingSid}. Unlink one first or pick a different pair.`
        );
    }
    if (s.strava_id) {
        const norm = normalizeStravaActivityId(s.strava_id);
        p.strava_id = norm || String(s.strava_id).trim();
    }
    if (s.strava_map) p.strava_map = s.strava_map;
    if (s.strava_kom_summary) p.strava_kom_summary = s.strava_kom_summary;
    if (s.gear_id) {
        p.gear_id = s.gear_id;
        const gn = (s.gear_name != null && String(s.gear_name).trim() !== '')
            ? String(s.gear_name).trim()
            : (p.gear_name != null && String(p.gear_name).trim() !== '')
                ? String(p.gear_name).trim()
                : null;
        if (gn) {
            p.gear_name = gn;
        } else {
            delete p.gear_name;
        }
    }

    p.title = pickMergedTitle(p.title, s.title);

    const pType = (p.type || '').trim();
    const sType = (s.type || '').trim();
    if (sType && (sType === 'VirtualRide' || pType === 'Ride')) {
        p.type = sType;
    }

    for (const k of POWER_KEYS) {
        const pv = Number(p[k]) || 0;
        const sv = Number(s[k]) || 0;
        if (pv > 0) continue;
        if (sv > 0) p[k] = s[k];
    }

    for (const k of HR_KEYS) {
        const pv = Number(p[k]) || 0;
        const sv = Number(s[k]) || 0;
        if (pv > 0) continue;
        if (sv > 0) p[k] = s[k];
    }

    const pr = Number(p.rpe) || 0;
    const sr = Number(s.rpe) || 0;
    if (pr <= 0 && sr > 0) p.rpe = s.rpe;

    const pClimb = Number(p.climbing) || 0;
    const sClimb = Number(s.climbing) || 0;
    if (secondaryIsStrava) {
        // Prefer Strava map-corrected elevation only from an authentic source:
        // total_elevation_gain, or climbing already flagged climbing_from_strava.
        // Falling back to bare climbing:0 (normalize default) was treating missing
        // elevation as authoritative and zeroing Intervals meters permanently.
        const fromGain = climbingMetersFromStrava(s.total_elevation_gain);
        if (fromGain != null) {
            p.climbing = fromGain;
            p.climbing_from_strava = true;
        } else if (s.climbing_from_strava === true) {
            const authenticated = climbingMetersFromStrava(s.climbing);
            if (authenticated != null) {
                p.climbing = authenticated;
                p.climbing_from_strava = true;
            }
        } else if (pClimb <= 0 && sClimb > 0) {
            p.climbing = s.climbing;
        }
    } else if (pClimb <= 0 && sClimb > 0) {
        p.climbing = s.climbing;
    }

    const pDistKm = activityDistanceKm(p) ?? 0;
    const sDistKm = activityDistanceKm(s) ?? 0;
    if (sDistKm > 0) {
        const primarySuspicious =
            pDistKm > 50
            && sDistKm > 0
            && sDistKm < 5
            && pDistKm >= sDistKm * 80;
        if (pDistKm <= 0 || primarySuspicious) {
            p.distance = s.distance;
        }
    }

    const pSec = movingTimeToSeconds(p.moving_time);
    const sSec = movingTimeToSeconds(s.moving_time);
    // Strava side is always a time string from normalizeStravaActivity — must parse, not Number().
    if (pSec <= 0 && sSec > 0) {
        p.moving_time = sSec;
    }

    const pSpd = Number(p.avg_speed) || 0;
    const sSpd = Number(s.avg_speed) || 0;
    if (pSpd <= 0 && sSpd > 0) p.avg_speed = s.avg_speed;

    return stripUndefinedFields(p);
}
