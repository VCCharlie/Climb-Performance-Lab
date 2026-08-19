/**
 * Backfill stream-based HR drift for existing activities in the log.
 * Processes eligible steady, threshold, and race-style rides (newest first).
 */

import {
    DRIFT_PROFILE,
    activityNeedsDriftAnalysis,
    extractDriftPatch,
    getRideDriftProfile,
} from './coach/rideDurability';
import { enrichActivitiesWithDecoupling } from './decouplingStreamEnrich';
import { isLikelyIntervalsActivityId } from './mergeActivities';

const DEFAULT_MAX_PER_RUN = 24;
const DEFAULT_DELAY_MS = 150;

/**
 * @param {object[]} siteActivities
 * @param {number} profileFtp
 * @param {{ intervalsConfig?: object, hasStravaToken?: boolean }} [creds]
 */
export function buildDecouplingBackfillStats(siteActivities, profileFtp, creds = {}) {
    const list = siteActivities || [];
    let steadyEligible = 0;
    let thresholdEligible = 0;
    let raceEligible = 0;
    let alreadyAnalyzed = 0;
    let missingStreamAccess = 0;
    let candidates = 0;

    for (const act of list) {
        const profile = getRideDriftProfile(act, profileFtp);
        if (!profile) continue;

        if (profile === DRIFT_PROFILE.STEADY) steadyEligible += 1;
        else if (profile === DRIFT_PROFILE.THRESHOLD) thresholdEligible += 1;
        else raceEligible += 1;

        if (!activityNeedsDriftAnalysis(act, profileFtp)) {
            alreadyAnalyzed += 1;
            continue;
        }

        if (activityCanFetchDecouplingStreams(act, creds)) {
            candidates += 1;
        } else {
            missingStreamAccess += 1;
        }
    }

    return {
        totalActivities: list.length,
        steadyEligible,
        thresholdEligible,
        raceEligible,
        driftEligible: steadyEligible + thresholdEligible + raceEligible,
        alreadyAnalyzed,
        missingStreamAccess,
        candidates,
    };
}

/**
 * @param {ReturnType<typeof buildDecouplingBackfillStats>} stats
 * @param {number} [batchSize]
 */
export function formatDecouplingBackfillIntro(stats, batchSize = DEFAULT_MAX_PER_RUN) {
    if (!stats) return '';
    const parts = [
        `${stats.totalActivities} activities in log`,
        `${stats.candidates} ride(s) still need stream drift analysis`,
    ];
    if (stats.steadyEligible > 0 || stats.thresholdEligible > 0 || stats.raceEligible > 0) {
        const profileParts = [];
        if (stats.steadyEligible > 0) profileParts.push(`${stats.steadyEligible} steady`);
        if (stats.thresholdEligible > 0) profileParts.push(`${stats.thresholdEligible} threshold`);
        if (stats.raceEligible > 0) profileParts.push(`${stats.raceEligible} race`);
        parts.push(`${profileParts.join(' · ')} eligible`);
    }
    if (stats.alreadyAnalyzed > 0) {
        parts.push(`${stats.alreadyAnalyzed} ride(s) already analyzed`);
    }
    if (stats.missingStreamAccess > 0) {
        parts.push(`${stats.missingStreamAccess} ride(s) lack Strava link / Intervals stream access`);
    }
    const batchNote = stats.candidates > 0
        ? ` · processing up to ${Math.min(batchSize, stats.candidates)} now`
        : '';
    return `${parts.join(' · ')}${batchNote}`;
}

/**
 * @param {object | null | undefined} act
 * @param {number} profileFtp
 */
export function activityNeedsDecouplingBackfill(act, profileFtp) {
    if (!act?.id) return false;
    return activityNeedsDriftAnalysis(act, profileFtp);
}

/**
 * @param {object | null | undefined} act
 * @param {{ intervalsConfig?: object, hasStravaToken?: boolean }} creds
 */
export function activityCanFetchDecouplingStreams(act, creds = {}) {
    if (!act) return false;
    if (isLikelyIntervalsActivityId(act.id) && creds.intervalsConfig?.apiKey) return true;
    if (act.strava_id && creds.hasStravaToken) return true;
    return false;
}

/**
 * @param {object[]} siteActivities
 * @param {number} profileFtp
 * @param {string[] | Set<string> | null} [onlyIds]
 * @param {{ intervalsConfig?: object, hasStravaToken?: boolean }} [creds]
 */
export function pickActivitiesNeedingDecouplingBackfill(
    siteActivities,
    profileFtp,
    onlyIds = null,
    creds = {},
) {
    const allow = onlyIds
        ? new Set([...onlyIds].map((id) => String(id)))
        : null;

    return (siteActivities || [])
        .filter((act) => {
            if (!activityNeedsDecouplingBackfill(act, profileFtp)) return false;
            if (allow && !allow.has(String(act.id))) return false;
            return activityCanFetchDecouplingStreams(act, creds);
        })
        .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
}

/**
 * @param {object} enriched
 * @returns {object | null}
 */
export function extractDecouplingPatch(enriched) {
    return extractDriftPatch(enriched);
}

/**
 * @param {object[]} siteActivities
 * @param {{
 *   profileFtp?: number,
 *   intervalsConfig?: object,
 *   stravaToken?: string | null,
 *   maxPerRun?: number,
 *   delayMs?: number,
 *   onlyIds?: string[] | Set<string>,
 *   onProgress?: (msg: string) => void,
 * }} [opts]
 */
export async function buildDecouplingBackfillUpdates(siteActivities, opts = {}) {
    const profileFtp = Number(opts.profileFtp) || 0;
    const hasStravaToken = Boolean(opts.stravaToken);
    const hasIntervals = Boolean(opts.intervalsConfig?.apiKey);
    const creds = { intervalsConfig: opts.intervalsConfig, hasStravaToken };

    const candidates = pickActivitiesNeedingDecouplingBackfill(
        siteActivities,
        profileFtp,
        opts.onlyIds,
        creds,
    );

    const maxPerRun = Math.max(1, opts.maxPerRun ?? DEFAULT_MAX_PER_RUN);
    const batch = candidates.slice(0, maxPerRun);

    if (profileFtp <= 0) {
        return {
            updates: [],
            candidates: candidates.length,
            processed: 0,
            enriched: 0,
            failed: 0,
            remaining: candidates.length,
            blockedReason: 'missing_ftp',
        };
    }

    if (!hasIntervals && !hasStravaToken) {
        return {
            updates: [],
            candidates: candidates.length,
            processed: 0,
            enriched: 0,
            failed: 0,
            remaining: candidates.length,
            blockedReason: 'missing_credentials',
        };
    }

    if (batch.length === 0) {
        return {
            updates: [],
            candidates: candidates.length,
            processed: 0,
            enriched: 0,
            failed: 0,
            remaining: 0,
        };
    }

    opts.onProgress?.(`Drift backfill: 0 / ${batch.length}…`);

    const beforeById = new Map(batch.map((act) => [String(act.id), act]));
    const enriched = await enrichActivitiesWithDecoupling(batch, {
        intervalsConfig: opts.intervalsConfig,
        stravaToken: opts.stravaToken || null,
        profileFtp,
        maxFetches: batch.length,
        delayMs: opts.delayMs ?? DEFAULT_DELAY_MS,
        onProgress: (message) => opts.onProgress?.(message),
    });

    const updates = [];
    let enrichedCount = 0;

    for (const act of enriched) {
        const prev = beforeById.get(String(act.id));
        if (!prev || !activityNeedsDriftAnalysis(prev, profileFtp)) continue;
        const patch = extractDriftPatch(act);
        if (!patch) continue;
        updates.push({ id: act.id, data: patch });
        enrichedCount += 1;
    }

    opts.onProgress?.(`Drift backfill: ${batch.length} / ${batch.length}…`);

    return {
        updates,
        candidates: candidates.length,
        processed: batch.length,
        enriched: enrichedCount,
        failed: Math.max(0, batch.length - enrichedCount),
        remaining: Math.max(0, candidates.length - batch.length),
    };
}
