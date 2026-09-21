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

export const PERFORMANCE_METRICS = [
    { id: 'normPower', label: 'Normalized power', unit: 'W', decimals: 0, stat: 'avg' },
    { id: 'avgPower', label: 'Average power', unit: 'W', decimals: 0, stat: 'avg' },
    { id: 'intensityFactor', label: 'Intensity factor (IF)', unit: '', decimals: 2, stat: 'avg' },
    { id: 'avgSpeed', label: 'Average speed', unit: 'km/h', decimals: 1, stat: 'avg' },
    { id: 'rpe', label: 'RPE', unit: '', decimals: 1, stat: 'avg' },
    { id: 'efficiencyFactor', label: 'EF (NP÷HR)', unit: 'W/bpm', decimals: 2, stat: 'avg' },
];

/** Stream-based HR drift metrics (per ride; averaged in time buckets). */
export const DRIFT_METRICS = [
    { id: 'decouplingPct', label: 'Decoupling %', unit: '%', decimals: 1, stat: 'avg' },
    { id: 'thresholdDriftPct', label: 'Threshold drift %', unit: '%', decimals: 1, stat: 'avg' },
    { id: 'raceDriftPct', label: 'Race drift %', unit: '%', decimals: 1, stat: 'avg' },
];

export const POWER_PEAK_FIELDS = [
    { id: 'best_1min', label: '1 min' },
    { id: 'best_5min', label: '5 min' },
    { id: 'best_10min', label: '10 min' },
    { id: 'best_20min', label: '20 min' },
    { id: 'best_60min', label: '60 min' },
    { id: 'best_90min', label: '90 min' },
    { id: 'best_120min', label: '120 min' },
    { id: 'best_150min', label: '150 min' },
    { id: 'best_180min', label: '180 min' },
];

/** Power peak metrics for explorer (avg / max / top-N avg per bucket). */
export const EXPLORER_POWER_METRICS = POWER_PEAK_FIELDS.flatMap((peak) => ([
    {
        id: `${peak.id}_avg`,
        label: `${peak.label} power (avg)`,
        unit: 'W',
        decimals: 0,
        group: 'Power peaks',
        peakField: peak.id,
        agg: 'avg',
    },
    {
        id: `${peak.id}_max`,
        label: `${peak.label} power (max)`,
        unit: 'W',
        decimals: 0,
        group: 'Power peaks',
        peakField: peak.id,
        agg: 'max',
    },
    {
        id: `${peak.id}_topN`,
        label: `${peak.label} power (top N avg)`,
        unit: 'W',
        decimals: 0,
        group: 'Power peaks',
        peakField: peak.id,
        agg: 'topN',
        usesTopN: true,
    },
]));

export const PLAYGROUND_METRICS = [
    ...VOLUME_METRICS,
    ...HR_METRICS,
    ...PERFORMANCE_METRICS,
    ...DRIFT_METRICS,
];

export const ALL_EXPLORER_METRICS = [
    ...VOLUME_METRICS.map((m) => ({ ...m, group: 'Volume' })),
    ...HR_METRICS.map((m) => ({ ...m, group: 'Heart rate' })),
    ...PERFORMANCE_METRICS.map((m) => ({ ...m, group: 'Performance' })),
    ...DRIFT_METRICS.map((m) => ({ ...m, group: 'HR drift' })),
    ...EXPLORER_POWER_METRICS,
];

export const EXPLORER_METRIC_GROUPS = [
    { group: 'Volume', options: VOLUME_METRICS },
    { group: 'Heart rate', options: HR_METRICS },
    { group: 'Performance', options: PERFORMANCE_METRICS },
    { group: 'HR drift', options: DRIFT_METRICS },
    { group: 'Power peaks', options: EXPLORER_POWER_METRICS },
];

export const CHART_TYPES = {
    COMPOSED: 'composed',
    LINE: 'line',
    AREA: 'area',
    BAR: 'bar',
    SCATTER: 'scatter',
};

export const CHART_TYPE_OPTIONS = [
    { id: CHART_TYPES.COMPOSED, label: 'Bars + trend' },
    { id: CHART_TYPES.LINE, label: 'Line' },
    { id: CHART_TYPES.AREA, label: 'Area' },
    { id: CHART_TYPES.BAR, label: 'Bars only' },
    { id: CHART_TYPES.SCATTER, label: 'Scatter / dots' },
];

export const EXPLORER_VIEW_MODES = {
    SCATTER: 'scatter',
    DUAL_TIMELINE: 'dual_timeline',
};

export const EXPLORER_VIEW_OPTIONS = [
    { id: EXPLORER_VIEW_MODES.SCATTER, label: 'Scatter (X vs Y)' },
    { id: EXPLORER_VIEW_MODES.DUAL_TIMELINE, label: 'Dual timeline' },
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

export const EXPLORER_PRESETS = [
    {
        id: 'hr_speed',
        label: 'HR vs speed',
        xMetric: 'avgHr',
        yMetric: 'avgSpeed',
        colorMetric: 'distanceKm',
        cadence: 'yearly',
    },
    {
        id: 'distance_power20',
        label: 'Distance vs 20-min power',
        xMetric: 'distanceKm',
        yMetric: 'best_20min_topN',
        colorMetric: 'avgHr',
        cadence: 'yearly',
    },
    {
        id: 'load_rpe',
        label: 'Load vs RPE',
        xMetric: 'load',
        yMetric: 'rpe',
        colorMetric: 'hours',
        cadence: 'monthly',
    },
    {
        id: 'np_speed',
        label: 'NP vs speed',
        xMetric: 'normPower',
        yMetric: 'avgSpeed',
        colorMetric: 'elevationM',
        cadence: 'monthly',
    },
    {
        id: 'load_decoupling',
        label: 'Load vs decoupling',
        xMetric: 'load',
        yMetric: 'decouplingPct',
        colorMetric: 'efficiencyFactor',
        cadence: 'monthly',
    },
    {
        id: 'if_threshold_drift',
        label: 'NP vs threshold drift',
        xMetric: 'normPower',
        yMetric: 'thresholdDriftPct',
        colorMetric: 'avgHr',
        cadence: 'monthly',
    },
    {
        id: 'ef_decoupling',
        label: 'EF vs decoupling',
        xMetric: 'efficiencyFactor',
        yMetric: 'decouplingPct',
        colorMetric: 'hours',
        cadence: 'ride',
    },
    {
        id: 'race_drift_load',
        label: 'Load vs race drift',
        xMetric: 'load',
        yMetric: 'raceDriftPct',
        colorMetric: 'normPower',
        cadence: 'monthly',
    },
    {
        id: 'hours_threshold_drift',
        label: 'Duration vs threshold drift',
        xMetric: 'hours',
        yMetric: 'thresholdDriftPct',
        colorMetric: 'avgHr',
        cadence: 'monthly',
    },
    {
        id: 'ef_race_drift',
        label: 'EF vs race drift',
        xMetric: 'efficiencyFactor',
        yMetric: 'raceDriftPct',
        colorMetric: 'load',
        cadence: 'ride',
    },
    {
        id: 'decoupling_thr_scatter',
        label: 'Dec vs threshold drift',
        xMetric: 'decouplingPct',
        yMetric: 'thresholdDriftPct',
        colorMetric: 'normPower',
        cadence: 'yearly',
    },
];

/**
 * @param {string} metricId
 */
export function isDriftRelatedMetric(metricId) {
    if (metricId === 'efficiencyFactor') return true;
    return DRIFT_METRICS.some((m) => m.id === metricId);
}

/**
 * @param {string} metricId
 */
export function getPlaygroundMetric(metricId) {
    return PLAYGROUND_METRICS.find((m) => m.id === metricId)
        || ALL_EXPLORER_METRICS.find((m) => m.id === metricId)
        || PLAYGROUND_METRICS[0];
}

/**
 * @param {string} metricId
 */
export function getExplorerMetric(metricId) {
    return ALL_EXPLORER_METRICS.find((m) => m.id === metricId) || ALL_EXPLORER_METRICS[0];
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

/**
 * @param {number | null | undefined} value
 * @param {{ decimals?: number }} metric
 */
export function roundExplorerValue(value, metric) {
    if (value == null || Number.isNaN(value)) return null;
    const decimals = metric?.decimals ?? 0;
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
}

/**
 * Format chart axis ticks — avoids float noise like 3.3699999999999999.
 * @param {number} value
 * @param {{ decimals?: number, unit?: string }} [options]
 */
export function formatPlaygroundAxisTick(value, options = {}) {
    if (value == null || Number.isNaN(Number(value))) return '';
    const n = Number(value);
    let decimals = options.decimals;
    if (decimals == null) {
        if (options.unit === 'h') decimals = 1;
        else if (Math.abs(n) >= 100) decimals = 0;
        else if (Math.abs(n) >= 10) decimals = 1;
        else decimals = 2;
    }
    const factor = 10 ** decimals;
    const rounded = Math.round(n * factor) / factor;
    if (decimals <= 0) return String(rounded);
    return rounded.toFixed(decimals).replace(/\.?0+$/, '');
}
