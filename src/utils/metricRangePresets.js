/**
 * Preset chips for Activity Log metric range filters.
 * Pills toggle on/off and merge bounds; conflicting presets on the same axis replace each other.
 */

/** @typedef {Record<string, string>} MetricPresetBounds */

/**
 * Maps preset bound keys to MetricRangesSection handler names.
 * @type {Record<string, string>}
 */
export const PRESET_BOUND_HANDLERS = {
    distMin: 'onFilterDistMinChange',
    distMax: 'onFilterDistMaxChange',
    speedMin: 'onFilterSpeedMinChange',
    speedMax: 'onFilterSpeedMaxChange',
    powerMin: 'onFilterPowerMinChange',
    powerMax: 'onFilterPowerMaxChange',
    durMinMin: 'onFilterDurMinMinChange',
    durMaxMin: 'onFilterDurMaxMinChange',
    elevMin: 'onFilterElevMinChange',
    elevMax: 'onFilterElevMaxChange',
    kjMin: 'onFilterKjMinChange',
    kjMax: 'onFilterKjMaxChange',
    decMin: 'onFilterDecMinChange',
    decMax: 'onFilterDecMaxChange',
    thrMin: 'onFilterThrMinChange',
    thrMax: 'onFilterThrMaxChange',
    raceMin: 'onFilterRaceMinChange',
    raceMax: 'onFilterRaceMaxChange',
};

/** @type {Record<string, string>} */
export const BOUND_TO_FILTER_KEY = {
    distMin: 'filterDistMin',
    distMax: 'filterDistMax',
    speedMin: 'filterSpeedMin',
    speedMax: 'filterSpeedMax',
    powerMin: 'filterPowerMin',
    powerMax: 'filterPowerMax',
    durMinMin: 'filterDurMinMin',
    durMaxMin: 'filterDurMaxMin',
    elevMin: 'filterElevMin',
    elevMax: 'filterElevMax',
    kjMin: 'filterKjMin',
    kjMax: 'filterKjMax',
    decMin: 'filterDecMin',
    decMax: 'filterDecMax',
    thrMin: 'filterThrMin',
    thrMax: 'filterThrMax',
    raceMin: 'filterRaceMin',
    raceMax: 'filterRaceMax',
};

/** Bound keys where min/max pairs on the same metric are mutually exclusive across presets. */
export const OPPOSING_BOUND_KEYS = {
    durMinMin: 'durMaxMin',
    durMaxMin: 'durMinMin',
    distMin: 'distMax',
    distMax: 'distMin',
    speedMin: 'speedMax',
    speedMax: 'speedMin',
    elevMin: 'elevMax',
    elevMax: 'elevMin',
    kjMin: 'kjMax',
    kjMax: 'kjMin',
};

const MIN_BOUND_KEYS = new Set([
    'distMin', 'speedMin', 'powerMin', 'durMinMin', 'elevMin', 'kjMin', 'decMin', 'thrMin', 'raceMin',
]);

const MAX_BOUND_KEYS = new Set([
    'distMax', 'speedMax', 'powerMax', 'durMaxMin', 'elevMax', 'kjMax', 'decMax', 'thrMax', 'raceMax',
]);

/** @typedef {{ id: string, label: string, bounds: MetricPresetBounds }} MetricRangePreset */

export const GENERAL_METRIC_PRESETS = [
    { id: 'short-1h', label: 'Short <1h', bounds: { durMaxMin: '60' } },
    { id: 'long-4h', label: 'Long ≥4h', bounds: { durMinMin: '240' } },
    { id: 'dist-min-50', label: '≥50 km', bounds: { distMin: '50' } },
    { id: 'dist-max-30', label: '≤30 km', bounds: { distMax: '30' } },
    { id: 'speed-fast-32', label: 'Fast ≥32 km/h', bounds: { speedMin: '32' } },
    { id: 'speed-easy-26', label: 'Easy ≤26 km/h', bounds: { speedMax: '26' } },
    { id: 'power-min-200', label: 'Pwr ≥200 W', bounds: { powerMin: '200' } },
    { id: 'elev-min-1000', label: 'Climb ≥1000 m', bounds: { elevMin: '1000' } },
    { id: 'kj-min-1500', label: 'Work ≥1500 kJ', bounds: { kjMin: '1500' } },
];

/**
 * Drift presets for Dec / Thr / Race % columns.
 * "analyzed" presets set min to '0' (>= 0). activityMatchesDriftRange still requires
 * a finite drift value on the activity, so unanalyzed rides are excluded.
 */
export const DRIFT_METRIC_PRESETS = [
    { id: 'dec-max-5', label: 'Dec ≤5% (good)', bounds: { decMax: '5' } },
    { id: 'dec-analyzed', label: 'Dec analyzed', bounds: { decMin: '0' } },
    { id: 'dec-min-10', label: 'Dec >10% (high)', bounds: { decMin: '10' } },
    { id: 'thr-max-5', label: 'Thr ≤5% (good)', bounds: { thrMax: '5' } },
    { id: 'thr-analyzed', label: 'Thr analyzed', bounds: { thrMin: '0' } },
    { id: 'race-max-10', label: 'Race ≤10%', bounds: { raceMax: '10' } },
    { id: 'race-analyzed', label: 'Race analyzed', bounds: { raceMin: '0' } },
];

export const ALL_METRIC_PRESETS = [...GENERAL_METRIC_PRESETS, ...DRIFT_METRIC_PRESETS];

/**
 * @returns {Record<string, string>}
 */
export function createEmptyMetricFilterState() {
    return {
        filterDistMin: '',
        filterDistMax: '',
        filterSpeedMin: '',
        filterSpeedMax: '',
        filterPowerMin: '',
        filterPowerMax: '',
        filterDurMinMin: '',
        filterDurMaxMin: '',
        filterElevMin: '',
        filterElevMax: '',
        filterKjMin: '',
        filterKjMax: '',
        filterDecMin: '',
        filterDecMax: '',
        filterThrMin: '',
        filterThrMax: '',
        filterRaceMin: '',
        filterRaceMax: '',
    };
}

/**
 * Apply preset bound values via MetricRangesSection handlers.
 * @param {MetricPresetBounds} bounds
 * @param {Record<string, (value: string) => void>} handlers
 */
export function applyPresetBounds(bounds, handlers) {
    for (const [boundKey, value] of Object.entries(bounds)) {
        const handlerName = PRESET_BOUND_HANDLERS[boundKey];
        const handler = handlerName ? handlers[handlerName] : null;
        if (typeof handler === 'function') {
            handler(value);
        }
    }
}

/**
 * Convert preset bounds to filter state field names used by useActivityFilter.
 * @param {MetricPresetBounds} bounds
 * @returns {Record<string, string>}
 */
export function presetBoundsToFilterState(bounds) {
    /** @type {Record<string, string>} */
    const state = createEmptyMetricFilterState();

    for (const [boundKey, value] of Object.entries(bounds)) {
        const filterKey = BOUND_TO_FILTER_KEY[boundKey];
        if (filterKey) {
            state[filterKey] = value;
        }
    }

    return state;
}

/**
 * @param {string} presetId
 * @returns {MetricRangePreset | undefined}
 */
export function getPresetById(presetId) {
    return ALL_METRIC_PRESETS.find((preset) => preset.id === presetId);
}

/**
 * Two presets conflict when they share a bound key or set opposing min/max on the same axis.
 * Drift min + max on the same column (e.g. Dec analyzed + Dec ≤5%) are allowed to combine.
 * @param {MetricRangePreset} presetA
 * @param {MetricRangePreset} presetB
 */
export function presetsConflict(presetA, presetB) {
    const keysA = Object.keys(presetA.bounds);
    const keysB = Object.keys(presetB.bounds);

    if (keysA.some((key) => keysB.includes(key))) {
        return true;
    }

    for (const keyA of keysA) {
        const opposite = OPPOSING_BOUND_KEYS[keyA];
        if (opposite && keysB.includes(opposite)) {
            return true;
        }
    }

    return false;
}

/**
 * @param {MetricRangePreset} preset
 * @param {string[]} activeIds
 * @returns {string[]}
 */
export function getConflictingPresetIds(preset, activeIds) {
    return activeIds.filter((id) => {
        const other = getPresetById(id);
        return other != null && presetsConflict(preset, other);
    });
}

/**
 * Merge one preset's bounds into accumulated filter state (union / tighten constraints).
 * @param {Record<string, string>} state
 * @param {MetricPresetBounds} bounds
 * @returns {Record<string, string>}
 */
export function mergeBoundsIntoFilterState(state, bounds) {
    const next = { ...state };

    for (const [boundKey, value] of Object.entries(bounds)) {
        const filterKey = BOUND_TO_FILTER_KEY[boundKey];
        if (!filterKey) continue;

        const existing = next[filterKey];
        if (existing === '' || existing == null) {
            next[filterKey] = value;
            continue;
        }

        if (MIN_BOUND_KEYS.has(boundKey)) {
            next[filterKey] = String(Math.max(Number(existing), Number(value)));
        } else if (MAX_BOUND_KEYS.has(boundKey)) {
            next[filterKey] = String(Math.min(Number(existing), Number(value)));
        } else {
            next[filterKey] = value;
        }
    }

    return next;
}

/**
 * Build full filter state from a set of active preset ids.
 * @param {string[]} activeIds
 * @returns {Record<string, string>}
 */
export function mergePresetsToFilterState(activeIds) {
    let state = createEmptyMetricFilterState();

    for (const presetId of activeIds) {
        const preset = getPresetById(presetId);
        if (preset) {
            state = mergeBoundsIntoFilterState(state, preset.bounds);
        }
    }

    return state;
}

/**
 * Toggle a preset id on/off. Activating removes conflicting active presets first.
 * @param {string[]} activeIds
 * @param {string} presetId
 * @returns {string[]}
 */
export function toggleMetricPresetIds(activeIds, presetId) {
    const preset = getPresetById(presetId);
    if (!preset) return activeIds;

    if (activeIds.includes(presetId)) {
        return activeIds.filter((id) => id !== presetId);
    }

    const withoutConflicts = activeIds.filter((id) => !getConflictingPresetIds(preset, [id]).includes(id));
    return [...withoutConflicts, presetId];
}

/**
 * @param {MetricRangePreset} preset
 * @returns {(handlers: Record<string, (value: string) => void>) => void}
 */
export function createPresetApplier(preset) {
    return (handlers) => applyPresetBounds(preset.bounds, handlers);
}
