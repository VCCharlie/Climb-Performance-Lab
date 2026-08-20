/**
 * Post-sync HR drift enrichment — run after Strava link/detail so streams and HR are available.
 */

import { enrichActivitiesWithDecoupling } from './decouplingStreamEnrich';
import { extractDriftPatch } from './coach/rideDurability';

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
 * @returns {Promise<{ activities: object[], enrichedCount: number }>}
 */
export async function enrichSyncedActivitiesDrift(activities, options = {}) {
    const profileFtp = Number(options.profileFtp) || 0;
    if (profileFtp <= 0 || !activities?.length) {
        return { activities: activities || [], enrichedCount: 0 };
    }

    const hasIntervals = Boolean(options.intervalsConfig?.apiKey);
    const hasStrava = Boolean(options.stravaToken);
    if (!hasIntervals && !hasStrava) {
        return { activities, enrichedCount: 0 };
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
        maxFetches: options.maxFetches ?? 8,
        delayMs: options.delayMs ?? 150,
        onProgress: options.onProgress,
    });

    let enrichedCount = 0;
    for (const act of out) {
        if (extractDriftPatch(act) && !analyzedBefore.has(String(act.id))) {
            enrichedCount += 1;
        }
    }

    return { activities: out, enrichedCount };
}
