/**
 * Metric definitions for the Coach Data Playground.
 */

export const VOLUME_METRICS = [
    { id: 'distanceKm', label: 'Distance', unit: 'km', decimals: 0, stat: 'sum' },
    { id: 'elevationM', label: 'Elevation', unit: 'm', decimals: 0, stat: 'sum' },
    { id: 'load', label: 'Load (TSS)', unit: '', decimals: 0, stat: 'sum' },
    { id: 'hours', label: 'Moving time', unit: 'h', decimals: 1, stat: 'sum' },
    { id: 'rideCount', label: 'Rides', unit: '', decimals: 0, stat: 'sum' },
    { id: 'workKj', label: 'Work', unit: 'kJ', decimals: 0, stat: 'sum' },
];

export const HR_METRICS = [
    { id: 'avgHr', label: 'Avg HR', unit: 'bpm', decimals: 0, stat: 'avg' },
    { id: 'maxHr', label: 'Max HR (peak)', unit: 'bpm', decimals: 0, stat: 'max' },
];

export const POWER_PEAK_FIELDS = [
    { id: 'best_1min', label: '1 min' },
    { id: 'best_5min', label: '5 min' },
    { id: 'best_10min', label: '10 min' },
    { id: 'best_20min', label: '20 min' },
    { id: 'best_60min', label: '60 min' },
    { id: 'best_90min', label: '90 min' },
    { id: 'best_120min', label: '120 min' },
];

export const PLAYGROUND_METRICS = [...VOLUME_METRICS, ...HR_METRICS];

export const CHART_TYPES = {
    COMPOSED: 'composed',
    LINE: 'line',
    AREA: 'area',
    BAR: 'bar',
};

export const CHART_TYPE_OPTIONS = [
    { id: CHART_TYPES.COMPOSED, label: 'Bars + trend' },
    { id: CHART_TYPES.LINE, label: 'Line' },
    { id: CHART_TYPES.AREA, label: 'Area' },
    { id: CHART_TYPES.BAR, label: 'Bars only' },
];

/** Volume trend stat modes */
export const VOLUME_STAT_MODES = {
    PRIMARY: 'primary',
    MAX: 'max',
};

export const VOLUME_STAT_OPTIONS = [
    { id: VOLUME_STAT_MODES.PRIMARY, label: 'Sum / average' },
    { id: VOLUME_STAT_MODES.MAX, label: 'Max per period' },
];

/** Power ranking stat modes */
export const POWER_STAT_MODES = {
    AVG_AND_TREND: 'avg_trend',
    MAX_ONLY: 'max_only',
    MAX_AND_TREND: 'max_trend',
};

export const POWER_STAT_OPTIONS = [
    { id: POWER_STAT_MODES.AVG_AND_TREND, label: 'Avg + avg trend' },
    { id: POWER_STAT_MODES.MAX_ONLY, label: 'Max only' },
    { id: POWER_STAT_MODES.MAX_AND_TREND, label: 'Max + max trend' },
];

/**
 * @param {string} metricId
 */
export function getPlaygroundMetric(metricId) {
    return PLAYGROUND_METRICS.find((m) => m.id === metricId) || PLAYGROUND_METRICS[0];
}

/**
 * @param {string} field
 */
export function getPowerFieldLabel(field) {
    return POWER_PEAK_FIELDS.find((f) => f.id === field)?.label || field;
}

/**
 * Stable key for excluding an effort from rankings.
 * @param {object} activity
 * @param {string} [field]
 */
export function effortExclusionKey(activity, field) {
    if (field) {
        const watts = Number(activity?.[field]) || activity?.watts || 0;
        return `${activity?.date}:${field}:${watts}`;
    }
    return `${activity?.date}:${activity?.watts}`;
}
