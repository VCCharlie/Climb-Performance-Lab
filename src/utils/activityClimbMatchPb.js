/**
 * Stricter climb matching for Bucket List PB attribution.
 * Profiler badges keep the looser heuristic in activityClimbMatch.js.
 */

import {
    buildClimbMatchIndex,
    findBestClimbUsingIndex,
    climbMatchTitleForActivity,
    climbMatchDescriptionForActivity,
} from './activityClimbMatch';
import { isClimbVenueCompatible, activityVenue } from './activityVenue';
import { isGenericActivityTitle } from './stravaTitleHeuristics';

const TRUSTED_DESCRIPTION_PATTERN = /mycols|climbfinder|cols?\s+climbed|kols?\s+beklommen|climbs?\s+(done|ridden|completed|summited)/i;

function stripDiacritics(s) {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Description from Strava / bike computer exports that lists cols actually ridden.
 * @param {string | null | undefined} text
 * @returns {boolean}
 */
export function isTrustedClimbDescription(text) {
    if (!text || typeof text !== 'string') return false;
    return TRUSTED_DESCRIPTION_PATTERN.test(text);
}

/**
 * @param {string} climbName
 * @param {string} text
 * @returns {boolean}
 */
export function climbNameAppearsInText(climbName, text) {
    const name = stripDiacritics((climbName || '').trim().toLowerCase());
    const haystack = stripDiacritics((text || '').trim().toLowerCase());
    return name.length >= 5 && haystack.includes(name);
}

/**
 * @param {string} text
 * @param {{ climbByWord: Map<string, Set<object>>, climbs: object[] }} index
 * @param {{ activityVenue?: 'outdoor' | 'virtual' | null }} matchOpts
 * @returns {object | null}
 */
function findClimbByFullNameInText(text, index, matchOpts) {
    const venue = matchOpts.activityVenue ?? null;
    const venueOk = (climb) => !venue || isClimbVenueCompatible(climb, venue);

    let best = null;
    let bestLen = 0;

    for (const climb of index.climbs || []) {
        if (!venueOk(climb)) continue;
        const name = (climb.name || '').trim();
        if (!climbNameAppearsInText(name, text)) continue;
        if (name.length > bestLen) {
            best = climb;
            bestLen = name.length;
        }
    }

    return best;
}

/**
 * @param {string} title
 * @param {{ climbByWord: Map<string, Set<object>>, climbs: object[] }} index
 * @param {{ activityVenue?: 'outdoor' | 'virtual' | null }} matchOpts
 * @returns {object | null}
 */
function findBestClimbPbFromTitle(title, index, matchOpts) {
    if (!title || isGenericActivityTitle(title)) return null;

    const byName = findClimbByFullNameInText(title, index, matchOpts);
    if (byName) return byName;

    return findBestClimbUsingIndex(title, index, {
        ...matchOpts,
        minScore: 12,
        minWordMatches: 2,
    });
}

/**
 * @param {string} description
 * @param {{ climbByWord: Map<string, Set<object>>, climbs: object[] }} index
 * @param {{ activityVenue?: 'outdoor' | 'virtual' | null }} matchOpts
 * @returns {object | null}
 */
function findBestClimbPbFromDescription(description, index, matchOpts) {
    if (!description) return null;

    const byName = findClimbByFullNameInText(description, index, matchOpts);
    if (byName) return byName;

    if (!isTrustedClimbDescription(description)) return null;

    return findBestClimbUsingIndex(description, index, {
        ...matchOpts,
        minScore: 10,
        minWordMatches: 2,
    });
}

/**
 * PB-only climb match — title must be specific; description needs trusted export text or full climb name.
 * @param {object} activity
 * @param {{ climbByWord: Map<string, Set<object>>, climbs: object[] }} index
 * @returns {{ climb: object | null, source: 'title' | 'description' | null }}
 */
export function findBestClimbForActivityPb(activity, index) {
    if (!activity || !index?.climbs?.length) {
        return { climb: null, source: null };
    }

    const matchOpts = { activityVenue: activityVenue(activity) };
    const title = climbMatchTitleForActivity(activity);
    const fromTitle = title ? findBestClimbPbFromTitle(title, index, matchOpts) : null;
    if (fromTitle) {
        return { climb: fromTitle, source: 'title' };
    }

    const description = climbMatchDescriptionForActivity(activity);
    const fromDescription = description
        ? findBestClimbPbFromDescription(description, index, matchOpts)
        : null;

    return {
        climb: fromDescription,
        source: fromDescription ? 'description' : null,
    };
}

export { buildClimbMatchIndex };
