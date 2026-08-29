/**
 * src/utils/dedup.js
 * Deduplication Logic
 */

import { parseDurationToSeconds } from './formatters.js';

/** Cross-source duplicates (FulGaz / Intervals / Strava enrich) may differ slightly in duration. */
export const CROSS_SOURCE_DURATION_TOLERANCE_SEC = 300;

/** Standard metric duplicate detection — duration must be within 5 minutes. */
export const METRIC_DURATION_TOLERANCE_SEC = 300;

/** Standard metric duplicate detection — distance must be within 500 m. */
export const METRIC_DISTANCE_TOLERANCE_KM = 0.5;

/**
 * Parse moving_time to seconds — supports numeric seconds and H:MM:SS / MM:SS strings.
 * @param {object} activity
 * @returns {number}
 */
export function activityDurationSec(activity) {
    const raw = activity?.moving_time;
    if (raw == null || raw === '') return 0;
    if (typeof raw === 'number' && !Number.isNaN(raw)) return Math.max(0, Math.floor(raw));
    return parseDurationToSeconds(String(raw));
}

/**
 * Normalize title for duplicate comparison (case, whitespace, trailing ellipsis).
 * @param {string | null | undefined} title
 * @returns {string}
 */
export function normalizeActivityTitleForDedup(title) {
    let s = (title || '').trim().toLowerCase();
    s = s.replace(/\.{2,}$/, '').replace(/\s+/g, ' ').trim();
    return s;
}

/**
 * True when titles match exactly or one is a truncated prefix of the other.
 * @param {object} a
 * @param {object} b
 */
export function titlesMatchForDedup(a, b) {
    const ta = normalizeActivityTitleForDedup(a?.title);
    const tb = normalizeActivityTitleForDedup(b?.title);
    if (!ta || !tb) return false;
    if (ta === tb) return true;
    const shorter = ta.length <= tb.length ? ta : tb;
    const longer = ta.length <= tb.length ? tb : ta;
    // Avoid matching unrelated rides that share a short prefix (e.g. "FulGaz - Col")
    if (shorter.length < 12) return false;
    return longer.startsWith(shorter);
}

/**
 * Cross-source duplicate pattern: same ride logged twice (Intervals + FulGaz, or Strava-enriched + raw).
 * One row often has distance 0 while the other has real km; titles and duration align.
 * @param {object} a
 * @param {object} b
 */
export function isCrossSourceDuplicatePattern(a, b) {
    if (!titlesMatchForDedup(a, b)) return false;

    const hasStravaA = Boolean(a?.strava_id);
    const hasStravaB = Boolean(b?.strava_id);
    const distA = Number(a?.distance) || 0;
    const distB = Number(b?.distance) || 0;
    const oneZeroDistance = (distA === 0 && distB > 0) || (distB === 0 && distA > 0);
    const stravaSplit = hasStravaA !== hasStravaB;

    if (!stravaSplit && !oneZeroDistance) return false;

    const durA = activityDurationSec(a);
    const durB = activityDurationSec(b);
    if (durA === 0 && durB === 0) return false;

    const durationDiff = Math.abs(durA - durB);
    return durationDiff < CROSS_SOURCE_DURATION_TOLERANCE_SEC;
}

/**
 * Describe why two activities were flagged as duplicates (for UI).
 * @param {object} a
 * @param {object} b
 */
export function duplicateMatchReason(a, b) {
    if (isCrossSourceDuplicatePattern(a, b)) {
        return 'Same date + title + duration (cross-source: Strava/FulGaz/Intervals)';
    }
    return 'Date match + metrics overlap';
}

export const isSameActivity = (a, b) => {
    // 1. Check ID (if same source)
    if (a.id === b.id) return true;

    // 2. Check Date (YYYY-MM-DD must match)
    if (!a.date || !b.date) return false;
    const dateA = a.date.split('T')[0];
    const dateB = b.date.split('T')[0];
    if (dateA !== dateB) return false;

    // 3. Check Type (Loose match: Ride vs VirtualRide is okish, but Run vs Ride is not)
    const isRideA = ['Ride', 'VirtualRide'].includes(a.type);
    const isRideB = ['Ride', 'VirtualRide'].includes(b.type);
    if (isRideA !== isRideB) return false; // Different major types

    // 4. Check start time proximity when full datetime is available.
    //    Two activities that started > 15 min apart are distinct, even if metrics overlap.
    const hasTimeA = a.date.includes('T');
    const hasTimeB = b.date.includes('T');
    if (hasTimeA && hasTimeB) {
        const startDiff = Math.abs(new Date(a.date).getTime() - new Date(b.date).getTime());
        if (startDiff > 15 * 60 * 1000) return false;
    }

    // 5. Cross-source duplicates (FulGaz + Strava-enriched Intervals row, etc.)
    if (isCrossSourceDuplicatePattern(a, b)) {
        return true;
    }

    // 6. Check Metrics - ALL must be similar to count as a duplicate.
    //    Two different activities on the same day can share one similar metric
    //    (e.g. two 30 km rides), but are unlikely to have identical duration AND
    //    distance AND power.
    const durA = activityDurationSec(a);
    const durB = activityDurationSec(b);
    const distA = Number(a.distance) || 0;
    const distB = Number(b.distance) || 0;

    // Safety: empty activities shouldn't match each other
    if (durA === 0 && durB === 0 && distA === 0 && distB === 0) return false;

    const durationDiff = Math.abs(durA - durB);
    const distDiff = Math.abs(distA - distB);

    // Require BOTH duration AND distance to be similar (AND, not OR)
    if (durationDiff >= METRIC_DURATION_TOLERANCE_SEC || distDiff >= METRIC_DISTANCE_TOLERANCE_KM) return false;

    // Optionally check avg_power when both activities have a meaningful value
    const powA = Number(a.avg_power) || 0;
    const powB = Number(b.avg_power) || 0;
    if (powA > 0 && powB > 0) {
        const powDiff = Math.abs(powA - powB);
        if (powDiff / Math.max(powA, powB) > 0.15) return false; // > 15% difference
    }

    return true;
};

export const findDuplicatesInList = (activities) => {
    if (!activities || activities.length < 2) return [];

    // Group by Date first for performance
    const groups = {};
    activities.forEach(act => {
        if (!act.date) return;
        const day = act.date.split('T')[0];
        if (!groups[day]) groups[day] = [];
        groups[day].push(act);
    });

    const duplicates = [];
    Object.values(groups).forEach(group => {
        if (group.length < 2) return;
        // Compare n^2 within the day
        for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
                const a = group[i];
                const b = group[j];
                if (isSameActivity(a, b)) {
                    duplicates.push({
                        a,
                        b,
                        reason: duplicateMatchReason(a, b),
                    });
                }
            }
        }
    });
    return duplicates;
};

/**
 * Set of activity ids that appear in at least one duplicate pair.
 * @param {Array} activities
 * @returns {Set<string>}
 */
export function duplicateActivityIdSet(activities) {
    const ids = new Set();
    for (const { a, b } of findDuplicatesInList(activities || [])) {
        if (a?.id != null) ids.add(String(a.id));
        if (b?.id != null) ids.add(String(b.id));
    }
    return ids;
};
