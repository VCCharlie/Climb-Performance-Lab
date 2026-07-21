/**
 * When to replace an activity title with the Strava name after a match.
 * Covers generic Strava/Intervals titles and bike-computer profile defaults (e.g. SUPERIOR, AETHOS).
 */

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
 * Bike profile names from head units (often all-caps, short) used as default activity titles.
 * Examples: SUPERIOR, AETHOS.
 *
 * @param {string | null | undefined} title
 * @returns {boolean}
 */
export function isBikeComputerProfileTitle(title) {
    const s = (title || '').trim();
    if (!s || s.length < 2 || s.length > 28) return false;
    if (isGenericActivityTitle(s)) return true;
    if (s !== s.toUpperCase()) return false;
    return /^[A-Z0-9][A-Z0-9 -]*$/.test(s);
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
 * @param {{ gearName?: string | null }} [opts]
 * @returns {boolean}
 */
export function shouldPreferStravaTitle(siteTitle, stravaTitle, opts = {}) {
    const strava = (stravaTitle || '').trim();
    if (!strava) return false;

    const site = (siteTitle || '').trim();
    if (!site || site === 'Untitled') return true;
    if (site === strava) return false;
    if (isGenericActivityTitle(site)) return true;
    if (isBikeComputerProfileTitle(site)) return true;
    if (titleMatchesGearName(site, opts.gearName)) return true;

    return false;
}

/**
 * Browser-side hint: activity may still need a Strava title without calling the API.
 *
 * @param {{ title?: string | null }} activity
 * @returns {boolean}
 */
export function activityLikelyNeedsStravaTitle(activity) {
    const title = activity?.title;
    return isGenericActivityTitle(title) || isBikeComputerProfileTitle(title);
}
