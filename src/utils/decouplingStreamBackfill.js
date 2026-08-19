/**
 * Backfill stream-based aerobic decoupling for existing activities in the log.
 * Processes eligible steady rides without cached decoupling_pct (newest first).
 */

import { isEligibleDecouplingRide } from './coach/aerobicDecoupling';
import { enrichActivitiesWithDecoupling } from './decouplingStreamEnrich';
import { isLikelyIntervalsActivityId } from './mergeActivities';

const DEFAULT_MAX_PER_RUN = 24;
const DEFAULT_DELAY_MS = 150;

const DECOUPLING_PATCH_KEYS = [
    'decoupling_pct',
    'decoupling_ef_first',
    'decoupling_ef_second',
    'decoupling_status',
    'decoupling_source',
    'decoupling_analyzed_at',
];

/**
 * @param {object[]} siteActivities
 * @param {number} profileFtp
 * @param {{ intervalsConfig?: object, hasStravaToken?: boolean }} [creds]
 */
export function buildDecouplingBackfillStats(siteActivities, profileFtp, creds = {}) {
    const list = siteActivities || [];
    let steadyEligible = 0;
    let alreadyAnalyzed = 0;
    let missingStreamAccess = 0;
    let candidates = 0;

    for (const act of list) {
        if (!isEligibleDecouplingRide(act, profileFtp)) continue;
        steadyEligible += 1;
        if (Number.isFinite(Number(act.decoupling_pct))) {
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
        `${stats.candidates} steady ride(s) still need stream decoupling`,
    ];
    if (stats.alreadyAnalyzed > 0) {
        parts.push(`${stats.alreadyAnalyzed} steady ride(s) already analyzed`);
    }
    if (stats.missingStreamAccess > 0) {
        parts.push(`${stats.missingStreamAccess} steady ride(s) lack Strava link / Intervals stream access`);
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
    if (!isEligibleDecouplingRide(act, profileFtp)) return false;
    return !Number.isFinite(Number(act.decoupling_pct));
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
    if (!enriched || !Number.isFinite(Number(enriched.decoupling_pct))) return null;
    const patch = {};
    for (const key of DECOUPLING_PATCH_KEYS) {
        if (enriched[key] != null) patch[key] = enriched[key];
    }
    return Object.keys(patch).length > 0 ? patch : null;
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

    opts.onProgress?.(`Decoupling backfill: 0 / ${batch.length}…`);

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
        if (!prev || Number.isFinite(Number(prev.decoupling_pct))) continue;
        const patch = extractDecouplingPatch(act);
        if (!patch) continue;
        updates.push({ id: act.id, data: patch });
        enrichedCount += 1;
    }

    opts.onProgress?.(`Decoupling backfill: ${batch.length} / ${batch.length}…`);

    return {
        updates,
        candidates: candidates.length,
        processed: batch.length,
        enriched: enrichedCount,
        failed: Math.max(0, batch.length - enrichedCount),
        remaining: Math.max(0, candidates.length - batch.length),
    };
}
