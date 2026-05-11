import { resolveStravaGearDisplay } from './stravaBikesLocalMap';

/**
 * Strava bike list from localStorage (populated during Strava enrichment).
 * @returns {{ id: string, name: string }[]}
 */
export function getStoredBikesFromLocalStorage() {
    try {
        const saved = localStorage.getItem('stravaBikesMap');
        if (!saved) return [];
        return Object.entries(JSON.parse(saved))
            .map(([id, name]) => ({ id, name: name || 'Bike' }))
            .sort((a, b) => a.name.localeCompare(b.name));
    } catch {
        return [];
    }
}

/**
 * Unique gear names from activity history (exclude raw Strava gear_id-looking strings).
 * @param {object[]} allActivities
 * @returns {string[]}
 */
export function uniqueGearNamesFromActivities(allActivities) {
    if (!allActivities?.length) return [];
    // ⚡ Bolt Optimization: Use single-pass for...of loop with a Set instead of chained map/filter
    // This minimizes intermediate array allocations on hot paths.
    const namesSet = new Set();
    for (const a of allActivities) {
        if (!a.gear_name) continue;
        const name = String(a.gear_name).trim();
        if (name && !/^b\d+$/i.test(name)) {
            namesSet.add(name);
        }
    }
    return [...namesSet].sort((a, b) => a.localeCompare(b));
}

/**
 * Bikes with known Strava gear_id from activities (resolved display names).
 * @param {object[]} allActivities
 * @returns {{ id: string, name: string }[]}
 */
export function bikesFromActivitiesWithGearId(allActivities) {
    const byId = new Map();
    for (const a of allActivities || []) {
        const gid = a?.gear_id != null ? String(a.gear_id).trim() : '';
        if (!gid || byId.has(gid)) continue;
        const { display } = resolveStravaGearDisplay(gid, a.gear_name);
        if (display !== '-' && display !== gid) {
            byId.set(gid, { id: gid, name: display });
        }
    }
    return [...byId.values()];
}

/**
 * Combined bike list for gear dropdowns (Strava cache + activities + historical names as hist_* ids).
 * @param {object[]} allActivities
 * @returns {{ id: string, name: string }[]}
 */
export function buildUnifiedBikesList(allActivities) {
    const availableBikes = getStoredBikesFromLocalStorage();
    const fromActs = bikesFromActivitiesWithGearId(allActivities);
    const byId = new Map();
    [...availableBikes, ...fromActs].forEach((b) => {
        if (b?.id && !byId.has(b.id)) byId.set(b.id, b);
    });
    const list = [...byId.values()];
    uniqueGearNamesFromActivities(allActivities).forEach((name) => {
        if (!list.some((b) => b.name === name)) {
            list.push({ id: `hist_${name}`, name });
        }
    });
    return list.sort((a, b) => a.name.localeCompare(b.name));
}
