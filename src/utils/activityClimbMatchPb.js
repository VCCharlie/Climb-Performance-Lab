/**
 * Stricter climb matching for Bucket List PB attribution.
 * Profiler badges keep the looser heuristic in activityClimbMatch.js.
 *
 * PB rules: no single-word overlap (berg, Rome, Grande, korter). The climb name
 * (or its distinctive tokens) must clearly appear in the title or trusted description.
 */

import {
    buildClimbMatchIndex,
    climbMatchTitleForActivity,
    climbMatchDescriptionForActivity,
} from './activityClimbMatch';
import { isClimbVenueCompatible, activityVenue } from './activityVenue';
import { isGenericActivityTitle } from './stravaTitleHeuristics';

const TRUSTED_DESCRIPTION_PATTERN = /mycols|climbfinder|cols?\s+climbed|kols?\s+beklommen|climbs?\s+(done|ridden|completed|summited)/i;

/** Tokens too generic to prove a specific climb was ridden. */
const WEAK_NAME_TOKENS = new Set([
    'grande', 'rome', 'berg', 'korter', 'route', 'col', 'pass', 'mont', 'monte', 'alto',
    'barrage', 'chaine', 'top', 'wind', 'fiets', 'met', 'rit', 'ritje', 'sneller', 'langer',
    'north', 'south', 'east', 'west', 'nord', 'sud', 'short', 'long', 'kort', 'lang',
]);

function stripDiacritics(s) {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * @param {string} text
 * @returns {string}
 */
export function normalizeClimbMatchText(text) {
    return stripDiacritics((text || '').trim().toLowerCase())
        .replace(/['’`]/g, ' ')
        .replace(/[^a-z0-9\s-]/g, ' ')
        .replace(/[-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * @param {string} climbName
 * @returns {string}
 */
function climbPrimaryName(climbName) {
    const trimmed = (climbName || '').trim();
    const withoutParen = trimmed.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
    return withoutParen || trimmed;
}

/**
 * @param {string} haystackNorm
 * @param {string} token
 * @returns {boolean}
 */
function wholeWordIncludes(haystackNorm, token) {
    if (!token) return false;
    const re = new RegExp(`(?:^|\\s)${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`);
    return re.test(haystackNorm);
}

/**
 * @param {string} climbName
 * @returns {string[]}
 */
function distinctiveNameTokens(climbName) {
    const primary = normalizeClimbMatchText(climbPrimaryName(climbName));
    const words = primary.split(/\s+/).filter((w) => w.length >= 4 && !WEAK_NAME_TOKENS.has(w));
    const long = words.filter((w) => w.length >= 7);
    if (long.length > 0) return long;
    return words.filter((w) => w.length >= 6 && !WEAK_NAME_TOKENS.has(w));
}

/**
 * Strong PB proof: full primary climb name or every distinctive token as a whole word.
 * @param {string} climbName
 * @param {string} text
 * @returns {boolean}
 */
export function isStrongClimbNameMatch(climbName, text) {
    const haystack = normalizeClimbMatchText(text);
    if (!haystack || !climbName) return false;

    const primary = normalizeClimbMatchText(climbPrimaryName(climbName));
    const full = normalizeClimbMatchText(climbName);

    if (primary.length >= 10 && haystack.includes(primary)) return true;
    if (full.length >= 10 && full !== primary && haystack.includes(full)) return true;

    const tokens = distinctiveNameTokens(climbName);
    if (tokens.length === 0) return false;

    if (tokens.length === 1 && tokens[0].length < 8) {
        return false;
    }

    return tokens.every((tok) => wholeWordIncludes(haystack, tok));
}

/**
 * @deprecated Use isStrongClimbNameMatch — kept for tests migrating off substring-only checks.
 * @param {string} climbName
 * @param {string} text
 * @returns {boolean}
 */
export function climbNameAppearsInText(climbName, text) {
    return isStrongClimbNameMatch(climbName, text);
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
 * @param {string} text
 * @param {{ climbByWord: Map<string, Set<object>>, climbs: object[] }} index
 * @param {{ activityVenue?: 'outdoor' | 'virtual' | null }} matchOpts
 * @returns {object | null}
 */
function findClimbByStrongNameInText(text, index, matchOpts) {
    const venue = matchOpts.activityVenue ?? null;
    const venueOk = (climb) => !venue || isClimbVenueCompatible(climb, venue);

    let best = null;
    let bestLen = 0;

    for (const climb of index.climbs || []) {
        if (!venueOk(climb)) continue;
        const name = (climb.name || '').trim();
        if (!isStrongClimbNameMatch(name, text)) continue;
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
    return findClimbByStrongNameInText(title, index, matchOpts);
}

/**
 * @param {string} description
 * @param {{ climbByWord: Map<string, Set<object>>, climbs: object[] }} index
 * @param {{ activityVenue?: 'outdoor' | 'virtual' | null }} matchOpts
 * @returns {object | null}
 */
function findBestClimbPbFromDescription(description, index, matchOpts) {
    if (!description) return null;

    const byName = findClimbByStrongNameInText(description, index, matchOpts);
    if (byName) return byName;

    if (!isTrustedClimbDescription(description)) return null;

    return findClimbByStrongNameInText(description, index, matchOpts);
}

/**
 * PB-only climb match — title must name the climb; description needs trusted export text + strong name proof.
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
