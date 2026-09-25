/**
 * Shared power-duration presets for dashboard views and activity peak fields.
 *
 * The full interpolation grid (5s … 3h) lives in powerDurationTable.POWER_DURATION_ROWS.
 * Surfaces pick a subset via the presets below so labels and seconds stay aligned.
 */

/** @typedef {{ sec: number, label: string, minAnchorSec?: number }} PowerDurationDef */

/** Stored Intervals / activity fields (also used in Activity Log columns). */
export const STORED_BEST_POWER_DURATIONS = [
    { sec: 60, label: '1 min', field: 'best_1min' },
    { sec: 300, label: '5 min', field: 'best_5min' },
    { sec: 600, label: '10 min', field: 'best_10min' },
    { sec: 1200, label: '20 min', field: 'best_20min' },
    { sec: 3600, label: '60 min', field: 'best_60min' },
    { sec: 5400, label: '90 min', field: 'best_90min' },
    { sec: 7200, label: '120 min', field: 'best_120min' },
    { sec: 9000, label: '150 min', field: 'best_150min' },
    { sec: 10800, label: '180 min', field: 'best_180min' },
];

/** Dashboard → Power → Top 10 by duration (interpolated power at fixed seconds). */
export const TOP_TEN_POWER_DURATIONS = [
    { sec: 30, label: '30 sec' },
    { sec: 60, label: '1 min' },
    { sec: 300, label: '5 min' },
    { sec: 600, label: '10 min' },
    { sec: 1200, label: '20 min' },
    { sec: 3600, label: '60 min' },
    { sec: 7200, label: '120 min', minAnchorSec: 7200 },
    { sec: 9000, label: '150 min', minAnchorSec: 9000 },
    { sec: 10800, label: '180 min', minAnchorSec: 10800 },
];

/** Dashboard peak leaderboard bar chart duration picker. */
export const PEAK_BAR_POWER_DURATIONS = [
    { sec: 5, label: '5s' },
    { sec: 10, label: '10s' },
    { sec: 20, label: '20s' },
    { sec: 30, label: '30s' },
    { sec: 60, label: '1m' },
    { sec: 300, label: '5m' },
    { sec: 1200, label: '20m' },
    { sec: 3600, label: '60m' },
    { sec: 7200, label: '120m' },
    { sec: 9000, label: '150m' },
    { sec: 10800, label: '180m' },
];

/** Radar / category profile peaks (period bests). */
export const RADAR_POWER_PEAK_DURATIONS = [
    { sec: 15, label: '15 s', interpolatedSec: 15 },
    { sec: 60, label: '1 min', field: 'best_1min' },
    { sec: 300, label: '5 min', field: 'best_5min' },
    { sec: 600, label: '10 min', field: 'best_10min' },
    { sec: 1200, label: '20 min', field: 'best_20min' },
    { sec: 3600, label: '60 min', field: 'best_60min' },
    { sec: 5400, label: '90 min', field: 'best_90min' },
    { sec: 7200, label: '120 min', field: 'best_120min' },
    { sec: 9000, label: '150 min', field: 'best_150min' },
    { sec: 10800, label: '180 min', field: 'best_180min' },
];

/**
 * @param {PowerDurationDef} def
 * @returns {{ requireAnchorBeyondSec?: number }}
 */
export function topTenInterpolatedOpts(def) {
    const minAnchor = def.minAnchorSec ?? (def.sec >= 7200 ? def.sec : null);
    if (minAnchor != null && minAnchor > 0) {
        return { requireAnchorBeyondSec: minAnchor };
    }
    return {};
}

/**
 * @param {PowerDurationDef} def
 * @returns {string|null}
 */
export function topTenDurationFootnote(def) {
    const minAnchor = def.minAnchorSec ?? (def.sec >= 7200 ? def.sec : null);
    if (!minAnchor) return null;
    const min = minAnchor / 60;
    return (
        `Only rides with power data extending to at least ${min} min `
        + '(longest anchor: 90/120/150/180 min from the API, or ride duration with average power). '
        + 'Short rides without a long-duration reading are excluded.'
    );
}
