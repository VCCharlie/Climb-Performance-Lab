/**
 * Lightweight fingerprint for duplicate-detection cache keys (Bolt Phase 1.5).
 * Fields mirror isSameActivity / findDuplicatesInList inputs.
 */

import { activityDurationSec } from './dedup';

/**
 * @param {object[]} activities
 * @returns {string}
 */
export function buildActivitiesDuplicateFingerprint(activities) {
    if (!activities?.length) return '0';

    const parts = [`n:${activities.length}`];
    for (const act of activities) {
        if (!act?.id) continue;
        const date = act.date ? String(act.date).split('T')[0] : '';
        const dist = Number(act.distance) || 0;
        const dur = activityDurationSec(act);
        parts.push(`${act.id}|${date}|${dist}|${dur}`);
    }
    return parts.join(';');
}
