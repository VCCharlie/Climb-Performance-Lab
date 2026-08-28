/**
 * User-visible Strava link summary after Intervals.icu sync.
 * Clarifies: Intervals is the source of log rows; Strava enrich only links existing rows.
 */

import { computeStravaVsLogGap, siteDateToYmd, ymdInRangeInclusive } from './stravaVsLogGap.js';
import { isIncludedStravaType } from './stravaMatch.js';

/**
 * @param {object[]} stravaList — raw Strava API list items
 * @param {string} startYmd
 * @param {string} endYmd
 * @returns {object[]}
 */
export function filterBikeStravaInRange(stravaList, startYmd, endYmd) {
    return (stravaList || []).filter((a) => {
        if (!isIncludedStravaType(a.sport_type || a.type)) return false;
        const ymd = String(a.start_date_local || a.start_date || '').split('T')[0];
        return ymdInRangeInclusive(ymd, startYmd, endYmd);
    });
}

/**
 * Count log rows in range that received a strava_id (after link + enrich).
 * @param {object[]} siteActivities
 * @param {string} startYmd
 * @param {string} endYmd
 */
export function countLinkedSiteRowsInRange(siteActivities, startYmd, endYmd) {
    let count = 0;
    for (const a of siteActivities || []) {
        if (!a?.strava_id) continue;
        const ymd = siteDateToYmd(a.date);
        if (ymd && ymdInRangeInclusive(ymd, startYmd, endYmd)) count += 1;
    }
    return count;
}

/**
 * Build short summary parts for sync toast / status line.
 *
 * Example: "2 Strava ride(s) in range · 1 Strava link on log · 1 Strava ride unmatched (no Intervals row — use Import → Strava URL)"
 *
 * @param {{
 *   siteActivities: object[],
 *   stravaList: object[],
 *   startYmd: string,
 *   endYmd: string,
 *   intervalsImported?: number,
 * }} input
 * @returns {{ parts: string[], unmatchedStravaIds: string[], stravaRideCount: number, linkedCount: number, unmatchedCount: number }}
 */
export function buildStravaSyncMatchSummary(input) {
    const {
        siteActivities = [],
        stravaList = [],
        startYmd,
        endYmd,
        intervalsImported,
    } = input || {};

    const bikeStrava = filterBikeStravaInRange(stravaList, startYmd, endYmd);
    const linkedCount = countLinkedSiteRowsInRange(siteActivities, startYmd, endYmd);

    const gap = computeStravaVsLogGap(bikeStrava, siteActivities, startYmd, endYmd, {
        useFuzzyMatch: true,
    });

    const parts = [];
    if (Number.isFinite(intervalsImported) && intervalsImported >= 0) {
        parts.push(`${intervalsImported} from Intervals.icu`);
    }
    if (bikeStrava.length > 0) {
        parts.push(`${bikeStrava.length} Strava ride(s) in range`);
    }
    if (linkedCount > 0) {
        parts.push(`${linkedCount} Strava link(s) on log`);
    }
    if (gap.fuzzyMissingCount > 0) {
        parts.push(
            `${gap.fuzzyMissingCount} Strava ride(s) unmatched (no Intervals row — paste Strava URL on Import tab)`,
        );
    }

    const unmatchedStravaIds = (gap.fuzzyMissing || []).map((a) => String(a.id));

    return {
        parts,
        unmatchedStravaIds,
        stravaRideCount: bikeStrava.length,
        linkedCount,
        unmatchedCount: gap.fuzzyMissingCount,
        logRideCount: gap.logRideCount,
    };
}

/**
 * @param {{ parts: string[] }} summary
 * @returns {string}
 */
export function formatStravaSyncMatchSummary(summary) {
    if (!summary?.parts?.length) return '';
    return summary.parts.join(' · ');
}
