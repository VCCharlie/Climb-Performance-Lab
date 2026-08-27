import { safeLocalStorageSet } from './safeStorage';

export const ACTIVITY_LOG_FILTER_STATE_KEY = 'cpl.activityLogFilterState.v1';

/** @returns {Record<string, unknown> | null} */
export function readActivityLogFilterState() {
    if (typeof localStorage === 'undefined') return null;
    try {
        const raw = localStorage.getItem(ACTIVITY_LOG_FILTER_STATE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
        return parsed;
    } catch {
        return null;
    }
}

/**
 * @param {Record<string, unknown>} state
 */
export function writeActivityLogFilterState(state) {
    safeLocalStorageSet(ACTIVITY_LOG_FILTER_STATE_KEY, JSON.stringify(state));
}

/**
 * Build a serializable snapshot from filter hook state (excludes ephemeral UI like bulk selection).
 * @param {Record<string, unknown>} filterState
 */
export function buildActivityLogFilterSnapshot(filterState) {
    return {
        search: filterState.search ?? '',
        indoorFilter: filterState.indoorFilter ?? 'all',
        thisWeekOnly: Boolean(filterState.thisWeekOnly),
        rollingDays: filterState.rollingDays ?? null,
        stravaLinkedOnly: Boolean(filterState.stravaLinkedOnly),
        noStravaLinkOnly: Boolean(filterState.noStravaLinkOnly),
        possibleDuplicatesOnly: Boolean(filterState.possibleDuplicatesOnly),
        noPowerOnly: Boolean(filterState.noPowerOnly),
        withPowerOnly: Boolean(filterState.withPowerOnly),
        highLoadOnly: Boolean(filterState.highLoadOnly),
        longRideOnly: Boolean(filterState.longRideOnly),
        missingHrOnly: Boolean(filterState.missingHrOnly),
        virtualRideChip: Boolean(filterState.virtualRideChip),
        gravelRideChip: Boolean(filterState.gravelRideChip),
        mtbRideChip: Boolean(filterState.mtbRideChip),
        ebikeRideChip: Boolean(filterState.ebikeRideChip),
        minTss: filterState.minTss ?? '',
        filterDistMin: filterState.filterDistMin ?? '',
        filterDistMax: filterState.filterDistMax ?? '',
        filterSpeedMin: filterState.filterSpeedMin ?? '',
        filterSpeedMax: filterState.filterSpeedMax ?? '',
        filterPowerMin: filterState.filterPowerMin ?? '',
        filterPowerMax: filterState.filterPowerMax ?? '',
        filterDurMinMin: filterState.filterDurMinMin ?? '',
        filterDurMaxMin: filterState.filterDurMaxMin ?? '',
        filterElevMin: filterState.filterElevMin ?? '',
        filterElevMax: filterState.filterElevMax ?? '',
        filterKjMin: filterState.filterKjMin ?? '',
        filterKjMax: filterState.filterKjMax ?? '',
        filterDecMin: filterState.filterDecMin ?? '',
        filterDecMax: filterState.filterDecMax ?? '',
        filterThrMin: filterState.filterThrMin ?? '',
        filterThrMax: filterState.filterThrMax ?? '',
        filterRaceMin: filterState.filterRaceMin ?? '',
        filterRaceMax: filterState.filterRaceMax ?? '',
        filterGearId: filterState.filterGearId ?? '',
        activeMetricPresetIds: Array.isArray(filterState.activeMetricPresetIds)
            ? filterState.activeMetricPresetIds
            : [],
    };
}

/**
 * Apply persisted filter fields onto initial React state values.
 * @param {Record<string, unknown> | null} saved
 * @param {Record<string, unknown>} defaults
 */
export function mergeActivityLogFilterDefaults(saved, defaults) {
    if (!saved) return defaults;
    const merged = { ...defaults };
    for (const key of Object.keys(defaults)) {
        if (saved[key] !== undefined && saved[key] !== null) {
            merged[key] = saved[key];
        }
    }
    return merged;
}
