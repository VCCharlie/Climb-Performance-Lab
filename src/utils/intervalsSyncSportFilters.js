import { SPORT_TYPES, CYCLING_SPORT_TYPES } from '../config.js';

const CYCLING_SET = new Set(CYCLING_SPORT_TYPES);

/**
 * Default Intervals sync panel: all cycling types on, Run/Walk/Hike off.
 * @returns {Record<string, boolean>}
 */
export function buildDefaultIntervalsSyncSportFilters() {
    return SPORT_TYPES.reduce((acc, type) => {
        acc[type] = CYCLING_SET.has(type);
        return acc;
    }, {});
}

/**
 * @param {Record<string, boolean> | null | undefined} saved
 * @returns {Record<string, boolean>}
 */
export function mergeIntervalsSyncSportFilters(saved) {
    const defaults = buildDefaultIntervalsSyncSportFilters();
    if (!saved || typeof saved !== 'object') return defaults;
    const merged = { ...defaults };
    for (const type of SPORT_TYPES) {
        if (typeof saved[type] === 'boolean') merged[type] = saved[type];
    }
    return merged;
}
