/**
 * Fetch power/HR streams after sync and persist per-ride drift summaries on activities.
 * Supports steady decoupling, threshold tempo drift, and race-style drift profiles.
 */

import { DRIFT_PROFILE } from './coach/rideDurability';
import {
    activityNeedsDriftAnalysis,
    buildDriftPatch,
    buildRideDriftPatchFromStreams,
    getRideDriftProfile,
} from './coach/rideDurability';
import { analyzeDecouplingFromStreams } from './coach/aerobicDecoupling';
import { fetchIntervalsActivityStreams } from './intervalsStreamFetch';
import { fetchStravaActivityStreams } from './stravaStreamFetch';
import { isLikelyIntervalsActivityId } from './mergeActivities';
import { devLog } from './safeLog';

/**
 * @param {object | null} analysis
 * @param {'intervals' | 'strava'} source
 * @returns {object | null}
 */
export function buildDecouplingPatch(analysis, source) {
    return buildDriftPatch(analysis, DRIFT_PROFILE.STEADY, source);
}

/**
 * @param {object} activity
 * @param {{ intervalsConfig?: object, stravaToken?: string | null, profileFtp?: number }} options
 * @returns {Promise<object | null>}
 */
export async function fetchDriftPatchForActivity(activity, options = {}) {
    const profileFtp = Number(options.profileFtp) || Number(activity?.ftp) || 0;
    const profile = getRideDriftProfile(activity, profileFtp);
    if (!profile || !activityNeedsDriftAnalysis(activity, profileFtp)) return null;

    const { intervalsConfig, stravaToken } = options;

    if (isLikelyIntervalsActivityId(activity.id) && intervalsConfig?.apiKey) {
        const streams = await fetchIntervalsActivityStreams(activity.id, intervalsConfig);
        if (streams) {
            const patch = buildRideDriftPatchFromStreams(activity, streams, 'intervals', profileFtp);
            if (patch) return patch;
        }
    }

    if (activity.strava_id && stravaToken) {
        const streams = await fetchStravaActivityStreams(activity.strava_id, stravaToken);
        if (streams) {
            const patch = buildRideDriftPatchFromStreams(activity, streams, 'strava', profileFtp);
            if (patch) return patch;
        }
    }

    return null;
}

/**
 * @deprecated Use fetchDriftPatchForActivity — kept for existing imports/tests.
 */
export async function fetchDecouplingPatchForActivity(activity, options = {}) {
    return fetchDriftPatchForActivity(activity, options);
}

/**
 * Enrich eligible activities with stream-based drift metrics (summary fields only).
 *
 * @param {object[]} activities
 * @param {{
 *   intervalsConfig?: object,
 *   stravaToken?: string | null,
 *   profileFtp?: number,
 *   maxFetches?: number,
 *   delayMs?: number,
 *   onProgress?: (message: string) => void,
 * }} [opts]
 * @returns {Promise<object[]>}
 */
export async function enrichActivitiesWithDecoupling(activities, opts = {}) {
    if (!activities?.length) return activities || [];

    const profileFtp = Number(opts.profileFtp) || 0;
    if (profileFtp <= 0) return activities;

    const maxFetches = opts.maxFetches ?? 8;
    const delayMs = opts.delayMs ?? 150;
    const hasIntervals = Boolean(opts.intervalsConfig?.apiKey);
    const hasStrava = Boolean(opts.stravaToken);
    if (!hasIntervals && !hasStrava) return activities;

    const out = activities.map((act) => ({ ...act }));
    let fetchCount = 0;
    let enrichedCount = 0;

    const candidates = out
        .filter((act) => activityNeedsDriftAnalysis(act, profileFtp))
        .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

    for (const act of candidates) {
        if (fetchCount >= maxFetches) break;

        const profile = getRideDriftProfile(act, profileFtp);
        opts.onProgress?.(`Analyzing ${profile || 'drift'} for ${act.title || act.date || act.id}…`);
        fetchCount += 1;

        try {
            const patch = await fetchDriftPatchForActivity(act, {
                intervalsConfig: opts.intervalsConfig,
                stravaToken: opts.stravaToken,
                profileFtp,
            });
            if (patch) {
                Object.assign(act, patch);
                enrichedCount += 1;
            }
        } catch (err) {
            devLog(`[Drift enrich] ${act.id}: ${err?.message || err}`);
        }

        if (delayMs > 0 && fetchCount < maxFetches) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }

    if (enrichedCount > 0) {
        devLog(`[Drift enrich] Added stream drift metrics to ${enrichedCount} activit${enrichedCount === 1 ? 'y' : 'ies'}`);
    }

    return out;
}

/**
 * Re-export for tests that need direct stream analysis.
 */
export { analyzeDecouplingFromStreams };
