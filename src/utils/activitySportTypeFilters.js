import { SPORT_TYPES } from '../config';

/** Short labels for Activity Log sport-type filter chips. */
export const ACTIVITY_SPORT_TYPE_FILTER_OPTIONS = [
    { type: 'Ride', label: 'Ride' },
    { type: 'VirtualRide', label: 'Virtual' },
    { type: 'GravelRide', label: 'Gravel' },
    { type: 'MountainBikeRide', label: 'MTB' },
    { type: 'EBikeRide', label: 'E-bike' },
    { type: 'Run', label: 'Run' },
    { type: 'Walk', label: 'Walk' },
    { type: 'Hike', label: 'Hike' },
];

/**
 * @param {unknown} value
 * @returns {string[]}
 */
export function normalizeActiveSportTypes(value) {
    if (!Array.isArray(value)) return [];
    const allowed = new Set(SPORT_TYPES);
    return value.filter((t) => typeof t === 'string' && allowed.has(t));
}

/**
 * Migrate legacy boolean chips (Virtual / Gravel / MTB / E-bike) to multi-select types.
 * @param {Record<string, unknown> | null | undefined} saved
 * @returns {string[]}
 */
export function migrateLegacySportTypeFilters(saved) {
    if (Array.isArray(saved?.activeSportTypes)) {
        return normalizeActiveSportTypes(saved.activeSportTypes);
    }
    const types = [];
    if (saved?.virtualRideChip) types.push('VirtualRide');
    if (saved?.gravelRideChip) types.push('GravelRide');
    if (saved?.mtbRideChip) types.push('MountainBikeRide');
    if (saved?.ebikeRideChip) types.push('EBikeRide');
    return types;
}

/**
 * @param {string[]} activeSportTypes
 * @param {string} type
 * @returns {string[]}
 */
export function toggleActiveSportType(activeSportTypes, type) {
    const set = new Set(normalizeActiveSportTypes(activeSportTypes));
    if (set.has(type)) set.delete(type);
    else set.add(type);
    return SPORT_TYPES.filter((t) => set.has(t));
}

/**
 * @param {string[] | null | undefined} a
 * @param {string[] | null | undefined} b
 * @returns {boolean}
 */
export function activeSportTypesEqual(a, b) {
    const left = normalizeActiveSportTypes(a);
    const right = normalizeActiveSportTypes(b);
    if (left.length !== right.length) return false;
    return left.every((t, i) => t === right[i]);
}
