/**
 * Orchestrate best-power enrichment: Intervals power-curve first, Strava streams fallback.
 */

import {
    enrichActivitiesWithPowerCurveBests,
    missingPowerCurveBestTargets,
    STANDARD_POWER_CURVE_BEST_TARGETS,
} from './intervalsPowerCurveEnrich';
import { enrichActivitiesWithStravaStreamBestPowers } from './stravaPowerStreamBests';

/**
 * @param {object[]} activities
 * @param {{
 *   intervalsConfig?: { apiKey?: string, athleteId?: string } | null,
 *   stravaToken?: string | null,
 *   stravaGetToken?: () => Promise<string>,
 *   maxFetches?: number,
 *   delayMs?: number,
 * }} [opts]
 * @returns {Promise<object[]>}
 */
export async function enrichActivitiesWithBestPowerEfforts(activities, opts = {}) {
    let out = (activities || []).map((a) => ({ ...a }));

    if (opts.intervalsConfig?.apiKey) {
        out = await enrichActivitiesWithPowerCurveBests(out, opts.intervalsConfig, {
            maxFetches: opts.maxFetches,
            delayMs: opts.delayMs ?? 0,
        });
    }

    const stillMissing = out.some((act) =>
        missingPowerCurveBestTargets(act, STANDARD_POWER_CURVE_BEST_TARGETS).length > 0,
    );
    if (!stillMissing) return out;

    return enrichActivitiesWithStravaStreamBestPowers(out, {
        stravaToken: opts.stravaToken,
        stravaGetToken: opts.stravaGetToken,
        maxFetches: opts.maxFetches,
    });
}
