/**
 * Calendar-day guards for Strava auto-link and title assignment.
 * Prevents cross-day title bleed (e.g. Apr 13 Whoosh getting Apr 14 Strava title).
 */

import { siteCalendarDateKey } from './stravaMatch.js';
import { shouldPreferStravaTitle } from './stravaTitleHeuristics.js';

/**
 * Local calendar day from Strava list/detail `start_date_local`.
 * @param {object | null | undefined} stravaAct
 * @returns {string | null} YYYY-MM-DD
 */
export function stravaCalendarDateKey(stravaAct) {
    const raw = stravaAct?.start_date_local || stravaAct?.start_date;
    if (raw == null || raw === '') return null;
    const key = String(raw).split('T')[0];
    return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : null;
}

/**
 * @param {object | null | undefined} site
 * @param {object | null | undefined} stravaAct
 * @returns {boolean}
 */
export function isSameCalendarDay(site, stravaAct) {
    const siteDay = siteCalendarDateKey(site);
    const stravaDay = stravaCalendarDateKey(stravaAct);
    if (!siteDay || !stravaDay) return false;
    return siteDay === stravaDay;
}

/**
 * Stored Strava start date (if any) disagrees with the site activity calendar day.
 * Used to recover from legacy wrong auto-links without calling the Strava API.
 *
 * @param {object | null | undefined} site
 * @returns {boolean}
 */
export function isStoredStravaLinkDayMismatch(site) {
    if (!site?.strava_id) return false;
    const siteDay = siteCalendarDateKey(site);
    const stored = site?.strava_start_date;
    if (!siteDay || !stored) return false;
    const stravaDay = String(stored).split('T')[0];
    return /^\d{4}-\d{2}-\d{2}$/.test(stravaDay) && siteDay !== stravaDay;
}

/**
 * Whether an auto Strava link (strava_id assignment) is allowed for this pair.
 * @param {object | null | undefined} site
 * @param {object | null | undefined} stravaAct
 * @returns {boolean}
 */
export function shouldAcceptStravaAutoLink(site, stravaAct) {
    return isSameCalendarDay(site, stravaAct);
}

/**
 * Whether Strava's activity name may replace the site title for this match.
 * Requires same local calendar day plus existing title heuristics.
 *
 * @param {object | null | undefined} site
 * @param {object | null | undefined} stravaAct
 * @param {{ gearName?: string | null, deviceProfileTitles?: string[] }} [opts]
 * @returns {boolean}
 */
export function shouldApplyStravaTitleOnMatch(site, stravaAct, opts = {}) {
    if (!isSameCalendarDay(site, stravaAct)) return false;
    const stravaTitle = (stravaAct?.name || '').trim();
    if (!stravaTitle) return false;
    return shouldPreferStravaTitle(site?.title, stravaTitle, {
        gearName: opts.gearName ?? site?.gear_name,
        deviceProfileTitles: opts.deviceProfileTitles,
    });
}

/**
 * Patch to store when linking strava_id so later merges can detect day mismatch.
 * @param {object | null | undefined} stravaAct
 * @returns {{ strava_start_date?: string }}
 */
export function stravaStartDatePatch(stravaAct) {
    const raw = stravaAct?.start_date_local || stravaAct?.start_date;
    if (raw == null || raw === '') return {};
    return { strava_start_date: String(raw) };
}
