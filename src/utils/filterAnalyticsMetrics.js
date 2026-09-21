import { safeLocalStorageSet } from './safeStorage';
import { formatTotalMovingTime } from './activityLogFilterAnalytics';
import { buildFilterAnalyticsYearChartData as buildYearChartDataFromRows } from './filterAnalyticsYearTable';

export const FILTER_ANALYTICS_METRICS_STORAGE_KEY = 'cpl.filterAnalyticsMetrics.v1';

/** @typedef {'volume' | 'load' | 'power' | 'pace' | 'physio'} FilterAnalyticsMetricGroup */

/**
 * @typedef {{
 *   key: string,
 *   label: string,
 *   group: FilterAnalyticsMetricGroup,
 *   defaultVisible: boolean,
 *   accent?: boolean,
 * }} FilterAnalyticsMetricDef
 */

/** @type {FilterAnalyticsMetricDef[]} */
export const FILTER_ANALYTICS_METRICS = [
    { key: 'activities', label: 'Activities', group: 'volume', defaultVisible: true, accent: true },
    { key: 'distance_total', label: 'Distance (total)', group: 'volume', defaultVisible: true },
    { key: 'distance_avg', label: 'Distance (avg)', group: 'volume', defaultVisible: false },
    { key: 'time_total', label: 'Moving time (total)', group: 'volume', defaultVisible: true },
    { key: 'time_avg', label: 'Duration (avg)', group: 'volume', defaultVisible: false },
    { key: 'elevation_total', label: 'Elevation (total)', group: 'volume', defaultVisible: true },
    { key: 'elevation_avg', label: 'Elevation (avg)', group: 'volume', defaultVisible: false },
    { key: 'tss_total', label: 'TSS (total)', group: 'load', defaultVisible: true },
    { key: 'tss_avg', label: 'TSS (avg)', group: 'load', defaultVisible: false },
    { key: 'avg_np', label: 'Avg NP', group: 'power', defaultVisible: false },
    { key: 'avg_power', label: 'Avg power', group: 'power', defaultVisible: false },
    { key: 'avg_if', label: 'Avg IF', group: 'power', defaultVisible: false },
    { key: 'avg_hr', label: 'Avg HR', group: 'physio', defaultVisible: false },
    { key: 'avg_speed', label: 'Avg speed', group: 'pace', defaultVisible: false },
];

export const FILTER_ANALYTICS_METRIC_KEYS = FILTER_ANALYTICS_METRICS.map((m) => m.key);

export const FILTER_ANALYTICS_METRIC_LABELS = Object.fromEntries(
    FILTER_ANALYTICS_METRICS.map((m) => [m.key, m.label]),
);

export const FILTER_ANALYTICS_METRIC_GROUPS = Object.freeze({
    volume: 'Volume',
    load: 'Load',
    power: 'Power',
    pace: 'Pace',
    physio: 'Heart rate',
});

/** @type {Record<string, string[]>} */
export const FILTER_ANALYTICS_METRIC_PRESETS = {
    essential: ['activities', 'distance_total', 'time_total', 'elevation_total', 'tss_total'],
    volume: [
        'activities',
        'distance_total',
        'distance_avg',
        'time_total',
        'time_avg',
        'elevation_total',
        'elevation_avg',
    ],
    intensity: ['activities', 'tss_avg', 'avg_np', 'avg_power', 'avg_if', 'avg_hr', 'avg_speed'],
    full: [...FILTER_ANALYTICS_METRIC_KEYS],
};

export const FILTER_ANALYTICS_PRESET_LABELS = Object.freeze({
    essential: 'Essential',
    volume: 'Volume',
    intensity: 'Intensity',
    full: 'All metrics',
});

const PRESET_ORDER = ['essential', 'volume', 'intensity', 'full'];

export function getDefaultFilterAnalyticsMetricKeys() {
    return FILTER_ANALYTICS_METRICS.filter((m) => m.defaultVisible).map((m) => m.key);
}

/**
 * @returns {{ visibleKeys: string[], activePreset: string | null }}
 */
export function readFilterAnalyticsMetricPrefs() {
    if (typeof localStorage === 'undefined') {
        return { visibleKeys: getDefaultFilterAnalyticsMetricKeys(), activePreset: 'essential' };
    }
    try {
        const raw = localStorage.getItem(FILTER_ANALYTICS_METRICS_STORAGE_KEY);
        if (!raw) {
            return { visibleKeys: getDefaultFilterAnalyticsMetricKeys(), activePreset: 'essential' };
        }
        const parsed = JSON.parse(raw);
        const visibleKeys = normalizeVisibleMetricKeys(parsed?.visibleKeys);
        const activePreset = typeof parsed?.activePreset === 'string' ? parsed.activePreset : 'custom';
        return { visibleKeys, activePreset };
    } catch {
        return { visibleKeys: getDefaultFilterAnalyticsMetricKeys(), activePreset: 'essential' };
    }
}

/**
 * @param {string[]} visibleKeys
 * @param {string | null} activePreset
 */
export function writeFilterAnalyticsMetricPrefs(visibleKeys, activePreset) {
    safeLocalStorageSet(
        FILTER_ANALYTICS_METRICS_STORAGE_KEY,
        JSON.stringify({
            visibleKeys: normalizeVisibleMetricKeys(visibleKeys),
            activePreset: activePreset || 'custom',
        }),
    );
}

/**
 * @param {unknown} keys
 * @returns {string[]}
 */
export function normalizeVisibleMetricKeys(keys) {
    if (!Array.isArray(keys)) return getDefaultFilterAnalyticsMetricKeys();
    const valid = keys.filter((k) => FILTER_ANALYTICS_METRIC_KEYS.includes(k));
    return valid.length > 0 ? valid : getDefaultFilterAnalyticsMetricKeys();
}

/**
 * @param {string} presetId
 * @returns {string[] | null}
 */
export function metricKeysForPreset(presetId) {
    const keys = FILTER_ANALYTICS_METRIC_PRESETS[presetId];
    return keys ? [...keys] : null;
}

/**
 * @param {string[]} visibleKeys
 * @returns {string | null}
 */
export function detectFilterAnalyticsPreset(visibleKeys) {
    const normalized = normalizeVisibleMetricKeys(visibleKeys).join(',');
    for (const id of PRESET_ORDER) {
        const presetKeys = metricKeysForPreset(id);
        if (presetKeys && presetKeys.join(',') === normalized) return id;
    }
    return null;
}

function formatPct(value) {
    if (value == null || Number.isNaN(Number(value))) return null;
    return `${value}%`;
}

/**
 * Build display chips for visible metric keys. Returns null entries when data is missing (skipped in UI).
 * @param {string[]} visibleKeys
 * @param {ReturnType<import('./activityLogFilterAnalytics').computeActivityLogFilterAnalytics>} analytics
 * @returns {Array<{ key: string, label: string, value: string, sub: string | null, accent?: boolean }>}
 */
export function buildFilterAnalyticsMetricChips(visibleKeys, analytics) {
    if (!analytics) return [];

    const countSub = analytics.rideCountPct != null
        ? `${analytics.rideCount} of ${analytics.totalRideCount} · ${formatPct(analytics.rideCountPct)} of log`
        : `${analytics.rideCount} activities`;

    /** @type {Record<string, { label: string, value: string, sub: string | null, accent?: boolean } | null>} */
    const byKey = {
        activities: {
            label: 'Activities',
            value: String(analytics.rideCount),
            sub: countSub,
            accent: true,
        },
        distance_total: {
            label: 'Distance (total)',
            value: `${analytics.formatted.distanceKm} km`,
            sub: formatPct(analytics.distancePctOfAll)
                ? `${formatPct(analytics.distancePctOfAll)} of log`
                : null,
        },
        distance_avg: analytics.avgDistanceKm != null ? {
            label: 'Distance (avg)',
            value: `${analytics.formatted.avgDistanceKm} km`,
            sub: 'per activity',
        } : null,
        time_total: {
            label: 'Moving time (total)',
            value: analytics.movingTimeLabel,
            sub: formatPct(analytics.movingTimePctOfAll)
                ? `${formatPct(analytics.movingTimePctOfAll)} of log`
                : null,
        },
        time_avg: analytics.avgMovingTimeLabel ? {
            label: 'Duration (avg)',
            value: analytics.avgMovingTimeLabel,
            sub: 'per activity',
        } : null,
        elevation_total: {
            label: 'Elevation (total)',
            value: `${analytics.formatted.elevationM} m`,
            sub: formatPct(analytics.elevationPctOfAll)
                ? `${formatPct(analytics.elevationPctOfAll)} of log`
                : null,
        },
        elevation_avg: analytics.avgElevationM != null && analytics.avgElevationM > 0 ? {
            label: 'Elevation (avg)',
            value: `${analytics.formatted.avgElevationM} m`,
            sub: 'per activity',
        } : null,
        tss_total: analytics.totalLoad > 0 ? {
            label: 'TSS (total)',
            value: analytics.formatted.totalLoad,
            sub: formatPct(analytics.loadPctOfAll)
                ? `${formatPct(analytics.loadPctOfAll)} of log`
                : null,
        } : null,
        tss_avg: analytics.avgLoad != null && analytics.avgLoad > 0 ? {
            label: 'TSS (avg)',
            value: analytics.formatted.avgLoad,
            sub: 'per activity',
        } : null,
        avg_np: analytics.avgNormPower != null ? {
            label: 'Avg NP',
            value: `${analytics.avgNormPower} W`,
            sub: null,
        } : null,
        avg_power: analytics.avgPower != null ? {
            label: 'Avg power',
            value: `${analytics.avgPower} W`,
            sub: null,
        } : null,
        avg_if: analytics.avgIntensityFactor != null ? {
            label: 'Avg IF',
            value: analytics.avgIntensityFactor.toFixed(2),
            sub: null,
        } : null,
        avg_hr: analytics.avgHeartRate != null ? {
            label: 'Avg HR',
            value: `${analytics.avgHeartRate} bpm`,
            sub: null,
        } : null,
        avg_speed: analytics.avgSpeedKmh != null ? {
            label: 'Avg speed',
            value: `${analytics.avgSpeedKmh} km/h`,
            sub: null,
        } : null,
    };

    return normalizeVisibleMetricKeys(visibleKeys)
        .map((key) => {
            const chip = byKey[key];
            if (!chip) return null;
            return { key, ...chip };
        })
        .filter(Boolean);
}

/** @param {{ byYear?: object[] }} analytics */
export function buildFilterAnalyticsChartData(analytics) {
    return buildYearChartDataFromRows(analytics?.byYear || []);
}
