/**
 * Route source for server-side climb logbook (polyline) matching.
 */

/** @typedef {'cpl' | 'intervals' | 'strava'} ClimbLogbookRouteSource */

export const CLIMB_LOGBOOK_ROUTE_SOURCES = /** @type {const} */ ([
    'cpl',
    'intervals',
    'strava',
]);

/**
 * @param {unknown} value
 * @returns {ClimbLogbookRouteSource | null}
 */
export function normalizeClimbLogbookRouteSource(value) {
    const v = String(value || '').trim().toLowerCase();
    if (v === 'cpl' || v === 'intervals' || v === 'strava') return v;
    return null;
}

/**
 * @param {ClimbLogbookRouteSource} source
 * @returns {string}
 */
export function labelClimbLogbookRouteSource(source) {
    switch (source) {
        case 'cpl':
            return 'CPL stored routes';
        case 'intervals':
            return 'Intervals map';
        case 'strava':
            return 'Strava map';
        default:
            return String(source);
    }
}

/**
 * @param {ClimbLogbookRouteSource} source
 * @returns {string}
 */
export function describeClimbLogbookRouteSource(source) {
    switch (source) {
        case 'cpl':
            return 'Uses polylines already saved in your activity log (Strava map first, then Intervals map).';
        case 'intervals':
            return 'Uses only Intervals-encoded route maps (intervals_map). Server may fetch missing maps from Intervals.icu.';
        case 'strava':
            return 'Uses only Strava summary polylines (strava_map). Server may enrich from Strava when missing.';
        default:
            return '';
    }
}
