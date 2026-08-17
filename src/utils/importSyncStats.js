/**
 * Summarize Intervals.icu fetch/merge results for user-visible sync feedback.
 */

/**
 * @param {object} stats — from useIntervalsSync
 * @param {object} mergeMeta — local merge counts
 * @param {number} mergeMeta.newCount
 * @param {number} mergeMeta.updatedCount
 */
export function formatIntervalsSyncSummary(stats, mergeMeta = {}) {
    const parts = [];
    const fetched = Number(stats?.fetched) || 0;
    const imported = Number(stats?.imported) || 0;
    const skippedEmpty = Number(stats?.skippedEmpty) || 0;
    const skippedSport = Number(stats?.skippedSport) || 0;

    if (fetched > 0) {
        parts.push(`${imported} ride(s) imported`);
    }
    if (mergeMeta.newCount > 0) parts.push(`${mergeMeta.newCount} new`);
    if (mergeMeta.updatedCount > 0) parts.push(`${mergeMeta.updatedCount} updated`);
    if (skippedEmpty > 0) parts.push(`${skippedEmpty} skipped (no distance/time/power)`);
    if (skippedSport > 0) parts.push(`${skippedSport} filtered by sport type`);

    if (parts.length === 0) {
        return 'No activities returned for this range.';
    }
    return parts.join(' · ');
}

/**
 * @param {Array} incoming
 * @param {Array} existingActivities
 */
export function countMergeCategories(incoming, existingActivities) {
    const existingIds = new Set((existingActivities || []).map((a) => String(a.id)));
    let newCount = 0;
    let updatedCount = 0;
    for (const act of incoming || []) {
        if (act?.id == null) continue;
        if (existingIds.has(String(act.id))) updatedCount += 1;
        else newCount += 1;
    }
    return { newCount, updatedCount };
}
