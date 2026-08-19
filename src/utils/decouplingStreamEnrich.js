/**
 * Fetch power/HR streams after sync and persist per-ride decoupling summaries on activities.
 */

import {
    analyzeDecouplingFromStreams,
    isEligibleDecouplingRide,
} from './coach/aerobicDecoupling';
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
    if (!analysis || analysis.decouplingPct == null || !Number.isFinite(analysis.decouplingPct)) {
        return null;
    }
    return {
        decoupling_pct: Math.round(analysis.decouplingPct * 10) / 10,
        decoupling_ef_first: analysis.efFirst != null
            ? Math.round(analysis.efFirst * 100) / 100
            : undefined,
        decoupling_ef_second: analysis.efSecond != null
            ? Math.round(analysis.efSecond * 100) / 100
            : undefined,
        decoupling_status: analysis.status,
        decoupling_source: source,
        decoupling_analyzed_at: new Date().toISOString().slice(0, 10),
    };
}

/**
 * @param {object} activity
 * @param {{ intervalsConfig?: object, stravaToken?: string | null, profileFtp?: number }} options
 * @returns {Promise<object | null>}
 */
export async function fetchDecouplingPatchForActivity(activity, options = {}) {
    const profileFtp = Number(options.profileFtp) || Number(activity?.ftp) || 0;
    if (!activity || !isEligibleDecouplingRide(activity, profileFtp)) return null;
    if (Number.isFinite(Number(activity.decoupling_pct))) return null;

    const { intervalsConfig, stravaToken } = options;

    if (isLikelyIntervalsActivityId(activity.id) && intervalsConfig?.apiKey) {
        const streams = await fetchIntervalsActivityStreams(activity.id, intervalsConfig);
        if (streams) {
            const analysis = analyzeDecouplingFromStreams(
                streams.watts,
                streams.heartrate,
                streams.time,
            );
            const patch = buildDecouplingPatch(analysis, 'intervals');
            if (patch) return patch;
        }
    }

    if (activity.strava_id && stravaToken) {
        const streams = await fetchStravaActivityStreams(activity.strava_id, stravaToken);
        if (streams) {
            const analysis = analyzeDecouplingFromStreams(
                streams.watts,
                streams.heartrate,
                streams.time,
            );
            const patch = buildDecouplingPatch(analysis, 'strava');
            if (patch) return patch;
        }
    }

    return null;
}

/**
 * Enrich eligible activities with stream-based decoupling metrics (summary fields only).
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
        .filter((act) => isEligibleDecouplingRide(act, profileFtp))
        .filter((act) => !Number.isFinite(Number(act.decoupling_pct)))
        .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

    for (const act of candidates) {
        if (fetchCount >= maxFetches) break;

        opts.onProgress?.(`Analyzing decoupling for ${act.title || act.date || act.id}…`);
        fetchCount += 1;

        try {
            const patch = await fetchDecouplingPatchForActivity(act, {
                intervalsConfig: opts.intervalsConfig,
                stravaToken: opts.stravaToken,
                profileFtp,
            });
            if (patch) {
                Object.assign(act, patch);
                enrichedCount += 1;
            }
        } catch (err) {
            devLog(`[Decoupling enrich] ${act.id}: ${err?.message || err}`);
        }

        if (delayMs > 0 && fetchCount < maxFetches) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }

    if (enrichedCount > 0) {
        devLog(`[Decoupling enrich] Added stream decoupling to ${enrichedCount} activit${enrichedCount === 1 ? 'y' : 'ies'}`);
    }

    return out;
}
