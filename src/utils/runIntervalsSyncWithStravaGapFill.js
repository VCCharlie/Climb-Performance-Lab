/**
 * Shared Intervals sync pipeline: link Strava to Intervals rows, then import orphan Strava rides.
 */
import {
    fetchStravaActivitiesInRange,
    linkIntervalsActivitiesToStravaList,
    applyStravaFuzzyMatchesToIntervals,
} from './stravaLinkIntervalsFetch.js';
import { buildImportReplacementPlan } from './importDuplicateMatch.js';
import {
    collectExistingStravaIds,
    findStravaOrphanActivities,
} from './stravaOrphanImport.js';

/**
 * Link Strava list items to Intervals rows and import unmatched Strava orphans.
 *
 * @param {object} params
 * @param {object[]} params.intervalsActivities — normalized Intervals activities from sync
 * @param {object[]} params.existingActivities — full activity log for dedup / reserved ids
 * @param {string|null} params.stravaToken
 * @param {string} params.startYmd
 * @param {string} params.endYmd
 * @param {string[]} params.allowedSportTypes — Intervals sport type filters
 * @param {{ onProgress?: (message: string) => void }} [params.opts]
 * @returns {Promise<{
 *   intervalsActivities: object[],
 *   orphanActivities: object[],
 *   stats: {
 *     intervalsCount: number,
 *     orphansAdded: number,
 *     stravaAlreadyLinked: number,
 *     stravaLinkedToIntervals: number,
 *     importReplacedCount: number,
 *   },
 * }>}
 */
export async function runIntervalsSyncWithStravaGapFill({
    intervalsActivities,
    existingActivities,
    stravaToken,
    startYmd,
    endYmd,
    allowedSportTypes,
    opts = {},
}) {
    const onProgress = opts.onProgress;
    const intervals = [...(intervalsActivities || [])];
    const emptyStats = {
        intervalsCount: intervals.length,
        orphansAdded: 0,
        stravaAlreadyLinked: 0,
        stravaLinkedToIntervals: 0,
        importReplacedCount: 0,
    };

    if (!stravaToken) {
        return { intervalsActivities: intervals, orphanActivities: [], stats: emptyStats };
    }

    onProgress?.('Fetching Strava activities for link + gap fill…');
    let stravaList;
    try {
        stravaList = await fetchStravaActivitiesInRange(stravaToken, startYmd, endYmd);
    } catch (err) {
        console.warn('[Gap fill] Strava list fetch failed:', err);
        return { intervalsActivities: intervals, orphanActivities: [], stats: emptyStats };
    }

    const reservedStravaIds = collectExistingStravaIds(existingActivities);

    onProgress?.('Linking Strava to Intervals rows…');
    let linked = linkIntervalsActivitiesToStravaList(intervals, stravaList, { reservedStravaIds });
    applyStravaFuzzyMatchesToIntervals(linked, stravaList, { reservedStravaIds });

    onProgress?.('Checking for Strava-only rides to import…');
    const { orphans, alreadyLinkedCount, linkedToIntervalsCount } = findStravaOrphanActivities({
        stravaActivities: stravaList,
        linkedIntervalsActivities: linked,
        existingActivities,
        allowedSportTypes,
        startYmd,
        endYmd,
    });

    const replacementPlan = buildImportReplacementPlan(existingActivities, orphans);

    return {
        intervalsActivities: linked,
        orphanActivities: replacementPlan.activitiesToImport,
        stats: {
            intervalsCount: linked.length,
            orphansAdded: replacementPlan.activitiesToImport.length,
            stravaAlreadyLinked: alreadyLinkedCount,
            stravaLinkedToIntervals: linkedToIntervalsCount,
            importReplacedCount: replacementPlan.replacedCount,
        },
    };
}
