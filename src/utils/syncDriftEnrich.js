/**
 * Post-sync HR drift enrichment — run after Strava link/detail so streams and HR are available.
 */

import { enrichActivitiesWithDecoupling } from './decouplingStreamEnrich';
import { activityNeedsDriftAnalysis, extractDriftPatch } from './coach/rideDurability';

/** Max stream fetches during a multi-day Intervals fetch-and-merge. */
export const SYNC_DRIFT_MAX_FETCHES_DEFAULT = 8;

/** Higher cap for single-day “sync today” (Dashboard / Activities / Training header). */
export const SYNC_DRIFT_MAX_FETCHES_TODAY = 12;

/**
 * @param {object[]} activities
 * @param {number} profileFtp
 */
export function countActivitiesNeedingDriftAnalysis(activities, profileFtp) {
    const ftp = Number(profileFtp) || 0;
    if (ftp <= 0) return 0;
    return (activities || []).filter((act) => activityNeedsDriftAnalysis(act, ftp)).length;
}

/**
 * @param {number} remaining
 */
export function formatSyncDriftRemainderNote(remaining) {
    if (!remaining || remaining <= 0) return '';
    const n = remaining;
    return `${n} eligible ride${n === 1 ? '' : 's'} still need drift analysis — use Activities → Decoupling backfill`;
}

/**
 * @param {object[]} activities
 * @param {{
 *   intervalsConfig?: object,
 *   stravaToken?: string | null,
 *   profileFtp?: number,
 *   maxFetches?: number,
 *   delayMs?: number,
 *   onProgress?: (message: string) => void,
 * }} [options]
 * @returns {Promise<{ activities: object[], enrichedCount: number, remainingCount: number }>}
 */
export async function enrichSyncedActivitiesDrift(activities, options = {}) {
    const profileFtp = Number(options.profileFtp) || 0;
    if (profileFtp <= 0 || !activities?.length) {
        return { activities: activities || [], enrichedCount: 0, remainingCount: 0 };
    }

    const hasIntervals = Boolean(options.intervalsConfig?.apiKey);
    const hasStrava = Boolean(options.stravaToken);
    if (!hasIntervals && !hasStrava) {
        const remainingCount = countActivitiesNeedingDriftAnalysis(activities, profileFtp);
        return { activities, enrichedCount: 0, remainingCount };
    }

    const analyzedBefore = new Set(
        (activities || [])
            .filter((act) => extractDriftPatch(act))
            .map((act) => String(act.id)),
    );

    const out = await enrichActivitiesWithDecoupling(activities, {
        intervalsConfig: options.intervalsConfig,
        stravaToken: options.stravaToken,
        profileFtp,
        maxFetches: options.maxFetches ?? SYNC_DRIFT_MAX_FETCHES_DEFAULT,
        delayMs: options.delayMs ?? 150,
        onProgress: options.onProgress,
    });

    let enrichedCount = 0;
    for (const act of out) {
        if (extractDriftPatch(act) && !analyzedBefore.has(String(act.id))) {
            enrichedCount += 1;
        }
    }

    const remainingCount = countActivitiesNeedingDriftAnalysis(out, profileFtp);

    return { activities: out, enrichedCount, remainingCount };
}
