/**
 * When to replace an activity title with the Strava name after a match.
 * Generic titles + user-configured bike-computer profile names (Settings).
 */

import { titleMatchesConfiguredProfile } from './bikeComputerProfileTitles.js';

const GENERIC_TITLE_EXACT = new Set([
    'untitled',
    'workout',
    'zwift',
    'morning ride',
    'lunch ride',
    'afternoon ride',
    'evening ride',
    'night ride',
    'morning run',
    'afternoon run',
    'evening run',
    'ochtendrit',
    'middagrit',
    'avondrit',
    'nachtrit',
]);

const GENERIC_TITLE_PATTERN = /^(Morning|Lunch|Afternoon|Evening|Night) Ride$|^Untitled$/i;

/**
 * @param {string | null | undefined} title
 * @returns {boolean}
 */
export function isGenericActivityTitle(title) {
    const s = (title || '').trim();
    if (!s) return true;
    if (GENERIC_TITLE_PATTERN.test(s)) return true;
    return GENERIC_TITLE_EXACT.has(s.toLowerCase());
}

/**
 * @param {string | null | undefined} title
 * @param {string | null | undefined} gearName
 * @returns {boolean}
 */
export function titleMatchesGearName(title, gearName) {
    const t = (title || '').trim();
    const g = (gearName || '').trim();
    if (!t || !g) return false;
    return t.toLowerCase() === g.toLowerCase();
}

/**
 * Prefer Strava's activity name over the stored site title.
 *
 * @param {string | null | undefined} siteTitle
 * @param {string | null | undefined} stravaTitle
 * @param {{ gearName?: string | null, deviceProfileTitles?: string[] }} [opts]
 * @returns {boolean}
 */
export function shouldPreferStravaTitle(siteTitle, stravaTitle, opts = {}) {
    const strava = (stravaTitle || '').trim();
    if (!strava) return false;

    const site = (siteTitle || '').trim();
    const profileTitles = opts.deviceProfileTitles || [];

    if (!site || site === 'Untitled') return true;
    if (site === strava) return false;
    if (isGenericActivityTitle(site)) return true;
    if (titleMatchesConfiguredProfile(site, profileTitles)) return true;
    if (titleMatchesGearName(site, opts.gearName)) return true;

    return false;
}

/**
 * Browser-side hint: activity may still need a Strava title without calling the API.
 *
 * @param {{ title?: string | null }} activity
 * @param {string[]} [deviceProfileTitles]
 * @returns {boolean}
 */
export function activityLikelyNeedsStravaTitle(activity, deviceProfileTitles = []) {
    const title = activity?.title;
    return isGenericActivityTitle(title)
        || titleMatchesConfiguredProfile(title, deviceProfileTitles);
}
