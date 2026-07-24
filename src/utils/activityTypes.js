/**
 * src/utils/activityTypes.js
 * Extracted from parsers.js to break the circular dependency:
 *   intervals.js → parsers.js → intervals.js
 * Both intervals.js and parsers.js import from this file.
 */

import { SPORT_TYPES } from '../config';

/** Canonical sport types we preserve from import/API before title heuristics. */
const PRESERVED_CANONICAL_TYPES = new Map(
    SPORT_TYPES.map((t) => [t.toLowerCase(), t]),
);

/**
 * Normalize Intervals/Strava/Garmin type strings to a canonical key (no spaces).
 * @param {unknown} type
 * @returns {string}
 */
function normalizeTypeToken(type) {
    if (type == null || type === '') return 'ride';
    return type.toString().replace(/\s+/g, '').toLowerCase();
}

export const determineActivityType = (type, title) => {
    const token = normalizeTypeToken(type);

    if (token === 'virtualride') return 'VirtualRide';

    const preserved = PRESERVED_CANONICAL_TYPES.get(token);
    if (preserved && preserved !== 'Ride') return preserved;

    if (['nordicski', 'alpineski', 'iceskate'].includes(token)) return 'Run';

    const name = title ? title.toLowerCase() : '';
    const virtualKeywords = ['virtual', 'indoor', 'zwift', 'watopia', 'rouvy', 'fulgaz', 'bkool', 'indievelo', 'tacx', 'trainerroad', 'wahoo'];
    if (virtualKeywords.some((keyword) => name.includes(keyword))) return 'VirtualRide';

    return 'Ride';
};
