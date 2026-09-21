import { normalizeVisibleMetricKeys } from './filterAnalyticsMetrics';

/**
 * Context-aware metric profiles for the filter analytics bar.
 * Applied automatically when a matching filter is active (unless the user overrides).
 */

/** @type {Record<string, { id: string, label: string, keys: string[] }>} */
export const FILTER_ANALYTICS_CONTEXT_PROFILES = {
    long_ride: {
        id: 'long_ride',
        label: 'Long ride',
        keys: [
            'activities',
            'distance_total',
            'distance_avg',
            'time_total',
            'time_avg',
            'elevation_total',
            'tss_total',
        ],
    },
    high_load: {
        id: 'high_load',
        label: 'High load',
        keys: [
            'activities',
            'tss_total',
            'tss_avg',
            'avg_np',
            'avg_if',
            'time_total',
            'time_avg',
        ],
    },
    with_power: {
        id: 'with_power',
        label: 'With power',
        keys: [
            'activities',
            'avg_np',
            'avg_power',
            'avg_if',
            'tss_total',
            'tss_avg',
            'avg_speed',
        ],
    },
    no_power: {
        id: 'no_power',
        label: 'No power',
        keys: [
            'activities',
            'distance_total',
            'distance_avg',
            'time_total',
            'avg_hr',
            'avg_speed',
        ],
    },
    missing_hr: {
        id: 'missing_hr',
        label: 'No HR',
        keys: [
            'activities',
            'distance_total',
            'time_total',
            'avg_np',
            'avg_speed',
            'tss_total',
        ],
    },
    metric_ranges: {
        id: 'metric_ranges',
        label: 'Metric ranges',
        keys: [
            'activities',
            'distance_total',
            'distance_avg',
            'time_total',
            'time_avg',
            'elevation_total',
            'elevation_avg',
            'avg_speed',
            'avg_np',
        ],
    },
    recent_volume: {
        id: 'recent_volume',
        label: 'Recent window',
        keys: [
            'activities',
            'distance_total',
            'time_total',
            'tss_total',
            'distance_avg',
            'time_avg',
        ],
    },
    date_range: {
        id: 'date_range',
        label: 'Date range',
        keys: [
            'activities',
            'distance_total',
            'time_total',
            'elevation_total',
            'tss_total',
            'distance_avg',
            'time_avg',
        ],
    },
    single_day: {
        id: 'single_day',
        label: 'Single day',
        keys: [
            'activities',
            'distance_total',
            'time_total',
            'elevation_total',
            'tss_total',
            'avg_speed',
        ],
    },
    single_activity: {
        id: 'single_activity',
        label: 'Single activity',
        keys: [
            'activities',
            'distance_total',
            'time_total',
            'elevation_total',
            'tss_total',
            'avg_np',
            'avg_hr',
            'avg_speed',
        ],
    },
    climb_focus: {
        id: 'climb_focus',
        label: 'Climbing',
        keys: [
            'activities',
            'elevation_total',
            'elevation_avg',
            'distance_total',
            'distance_avg',
            'time_total',
            'avg_speed',
        ],
    },
    gravel: {
        id: 'gravel',
        label: 'Gravel',
        keys: [
            'activities',
            'distance_total',
            'distance_avg',
            'elevation_total',
            'elevation_avg',
            'time_total',
        ],
    },
    mtb: {
        id: 'mtb',
        label: 'MTB',
        keys: [
            'activities',
            'elevation_total',
            'elevation_avg',
            'distance_total',
            'time_total',
            'avg_hr',
        ],
    },
    virtual: {
        id: 'virtual',
        label: 'Virtual',
        keys: [
            'activities',
            'time_total',
            'time_avg',
            'tss_total',
            'tss_avg',
            'avg_np',
            'avg_power',
        ],
    },
};

/**
 * Detect the highest-priority analytics context for active Activity Log filters.
 * @param {Record<string, unknown> | null | undefined} filterState
 * @returns {{ id: string, label: string, keys: string[] } | null}
 */
export function detectFilterAnalyticsContext(filterState) {
    if (!filterState) return null;

    if (filterState.isolateActivityId) {
        return FILTER_ANALYTICS_CONTEXT_PROFILES.single_activity;
    }
    if (filterState.singleDayFilterYmd) {
        return FILTER_ANALYTICS_CONTEXT_PROFILES.single_day;
    }
    if (filterState.logDateRangeFilter?.startYmd && filterState.logDateRangeFilter?.endYmd) {
        return FILTER_ANALYTICS_CONTEXT_PROFILES.date_range;
    }
    if (filterState.longRideOnly) {
        return FILTER_ANALYTICS_CONTEXT_PROFILES.long_ride;
    }
    if (filterState.highLoadOnly || (filterState.minTss !== '' && filterState.minTss != null)) {
        return FILTER_ANALYTICS_CONTEXT_PROFILES.high_load;
    }
    if (filterState.withPowerOnly) {
        return FILTER_ANALYTICS_CONTEXT_PROFILES.with_power;
    }
    if (filterState.noPowerOnly) {
        return FILTER_ANALYTICS_CONTEXT_PROFILES.no_power;
    }
    if (filterState.missingHrOnly) {
        return FILTER_ANALYTICS_CONTEXT_PROFILES.missing_hr;
    }
    if (filterState.metricRangeActive) {
        const elevActive = hasPositiveRangeBound(filterState.filterElevMin)
            || hasPositiveRangeBound(filterState.filterElevMax);
        if (elevActive) {
            return FILTER_ANALYTICS_CONTEXT_PROFILES.climb_focus;
        }
        return FILTER_ANALYTICS_CONTEXT_PROFILES.metric_ranges;
    }
    if (filterState.thisWeekOnly || filterState.rollingDays === 7
        || filterState.rollingDays === 14 || filterState.rollingDays === 30) {
        return FILTER_ANALYTICS_CONTEXT_PROFILES.recent_volume;
    }

    const sportTypes = filterState.activeSportTypes || [];
    if (sportTypes.includes('GravelRide')) {
        return FILTER_ANALYTICS_CONTEXT_PROFILES.gravel;
    }
    if (sportTypes.includes('MountainBikeRide')) {
        return FILTER_ANALYTICS_CONTEXT_PROFILES.mtb;
    }
    if (sportTypes.length === 1 && sportTypes[0] === 'VirtualRide') {
        return FILTER_ANALYTICS_CONTEXT_PROFILES.virtual;
    }
    if (filterState.indoorFilter === 'indoor' && sportTypes.length === 0) {
        return FILTER_ANALYTICS_CONTEXT_PROFILES.virtual;
    }

    return null;
}

/**
 * @param {unknown} value
 */
function hasPositiveRangeBound(value) {
    if (value === '' || value == null) return false;
    const n = Number(value);
    return Number.isFinite(n);
}

/**
 * Resolve which metric keys to show in the bar.
 * Context suggestions apply automatically unless the user manually overrides.
 *
 * @param {{
 *   storedKeys: string[],
 *   activePreset: string | null,
 *   contextProfile: { keys: string[] } | null,
 *   manualOverride: boolean,
 * }} params
 * @returns {string[]}
 */
export function resolveEffectiveMetricKeys({
    storedKeys,
    activePreset,
    contextProfile,
    manualOverride,
}) {
    const stored = normalizeVisibleMetricKeys(storedKeys);
    if (!contextProfile || manualOverride) return stored;

    if (activePreset === 'essential' || activePreset == null) {
        return normalizeVisibleMetricKeys(contextProfile.keys);
    }

    const merged = [...stored];
    for (const key of contextProfile.keys) {
        if (!merged.includes(key)) merged.push(key);
    }
    return normalizeVisibleMetricKeys(merged);
}

/**
 * Stable id for detecting context changes (resets manual override).
 * @param {Record<string, unknown> | null | undefined} filterState
 */
export function filterAnalyticsContextSignature(filterState) {
    const profile = detectFilterAnalyticsContext(filterState);
    if (profile) return profile.id;

    const sportTypes = (filterState?.activeSportTypes || []).slice().sort().join(',');
    return [
        filterState?.search || '',
        filterState?.indoorFilter || 'all',
        sportTypes,
        filterState?.filterGearId || '',
    ].join('|') || 'none';
}
