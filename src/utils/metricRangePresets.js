/**
 * Preset chips for Activity Log metric range filters.
 * applyMetricPreset (useDataHubLogDerivations) clears all ranges first, then applies one preset.
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

/** @typedef {{ label: string, bounds: MetricPresetBounds }} MetricRangePreset */

export const GENERAL_METRIC_PRESETS = [
    { label: 'Short <1h', bounds: { durMaxMin: '60' } },
    { label: 'Long ≥4h', bounds: { durMinMin: '240' } },
    { label: '≥50 km', bounds: { distMin: '50' } },
    { label: '≤30 km', bounds: { distMax: '30' } },
    { label: 'Fast ≥32 km/h', bounds: { speedMin: '32' } },
    { label: 'Easy ≤26 km/h', bounds: { speedMax: '26' } },
    { label: 'Pwr ≥200 W', bounds: { powerMin: '200' } },
    { label: 'Climb ≥1000 m', bounds: { elevMin: '1000' } },
    { label: 'Work ≥1500 kJ', bounds: { kjMin: '1500' } },
];

/**
 * Drift presets for Dec / Thr / Race % columns.
 * "analyzed" presets set min to '0' (>= 0). activityMatchesDriftRange still requires
 * a finite drift value on the activity, so unanalyzed rides are excluded.
 */
export const DRIFT_METRIC_PRESETS = [
    { label: 'Dec ≤5% (good)', bounds: { decMax: '5' } },
    { label: 'Dec analyzed', bounds: { decMin: '0' } },
    { label: 'Dec >10% (high)', bounds: { decMin: '10' } },
    { label: 'Thr ≤5% (good)', bounds: { thrMax: '5' } },
    { label: 'Thr analyzed', bounds: { thrMin: '0' } },
    { label: 'Race ≤10%', bounds: { raceMax: '10' } },
    { label: 'Race analyzed', bounds: { raceMin: '0' } },
];

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
    const state = {
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

    const boundToFilterKey = {
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

    for (const [boundKey, value] of Object.entries(bounds)) {
        const filterKey = boundToFilterKey[boundKey];
        if (filterKey) {
            state[filterKey] = value;
        }
    }

    return state;
}

/**
 * @param {MetricRangePreset} preset
 * @returns {(handlers: Record<string, (value: string) => void>) => void}
 */
export function createPresetApplier(preset) {
    return (handlers) => applyPresetBounds(preset.bounds, handlers);
}
