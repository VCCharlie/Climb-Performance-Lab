import { resolveStravaGearDisplay } from './stravaBikesLocalMap';

/**
 * Unique Strava gear_id options from a list of activities (for Activity Log gear dropdown).
 * @param {Array<{ gear_id?: string, gear_name?: string }> | null | undefined} activities
 * @returns {Array<{ id: string, label: string }>}
 */
export function buildGearFilterOptionsFromActivities(activities) {
    const map = new Map();
    for (const a of activities || []) {
        const gid = a?.gear_id != null ? String(a.gear_id).trim() : '';
        if (!gid) continue;
        if (!map.has(gid)) {
            const rawName = (a.gear_name != null && String(a.gear_name).trim())
                ? String(a.gear_name).trim()
                : '';
            const { display } = resolveStravaGearDisplay(gid, rawName);
            map.set(gid, display !== '-' ? display : gid);
        }
    }
    return Array.from(map.entries())
        .map(([id, label]) => ({ id, label }))
        .sort((x, y) => x.label.localeCompare(y.label, undefined, { sensitivity: 'base' }));
}

/**
 * Keep the active gear filter visible even if it would drop out of the contextual list.
 * @param {Array<{ id: string, label: string }>} options
 * @param {string} activeGearId
 * @param {string} [fallbackLabel]
 */
export function mergeActiveGearFilterOption(options, activeGearId, fallbackLabel = '') {
    const id = activeGearId != null ? String(activeGearId).trim() : '';
    if (!id) return options;
    if (options.some((o) => o.id === id)) return options;
    const label = (fallbackLabel && String(fallbackLabel).trim()) || id;
    return [...options, { id, label }].sort((x, y) => x.label.localeCompare(y.label, undefined, { sensitivity: 'base' }));
}
