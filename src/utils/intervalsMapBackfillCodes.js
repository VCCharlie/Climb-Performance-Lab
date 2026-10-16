/** Shared outcome codes for Intervals route map backfill (no imports). */

export const MAP_BACKFILL_CODE = {
    ADDED: 'added',
    NOT_INTERVALS_ACTIVITY: 'not_intervals_activity',
    NO_GPS_DATA: 'no_gps_data',
    INTERVALS_NOT_FOUND: 'intervals_not_found',
    INTERVALS_FORBIDDEN: 'intervals_forbidden',
    INTERVALS_HTTP_ERROR: 'intervals_http_error',
    NETWORK_ERROR: 'network_error',
    MISSING_API_KEY: 'missing_api_key',
};

/**
 * @param {string} code
 * @param {{ httpStatus?: number }} [ctx]
 * @returns {string}
 */
export function messageForMapBackfillCode(code, ctx = {}) {
    switch (code) {
        case MAP_BACKFILL_CODE.ADDED:
            return 'Route map saved from Intervals.icu';
        case MAP_BACKFILL_CODE.NOT_INTERVALS_ACTIVITY:
            return 'Not an Intervals.icu activity (manual entry or CSV id) — cannot fetch a map from Intervals';
        case MAP_BACKFILL_CODE.NO_GPS_DATA:
            return 'Intervals.icu has no GPS track for this ride (no map to download)';
        case MAP_BACKFILL_CODE.INTERVALS_NOT_FOUND:
            return 'Activity not found on Intervals.icu (wrong id or deleted)';
        case MAP_BACKFILL_CODE.INTERVALS_FORBIDDEN:
            return 'Intervals.icu denied access (check API key permissions)';
        case MAP_BACKFILL_CODE.INTERVALS_HTTP_ERROR:
            return ctx.httpStatus
                ? `Intervals.icu returned HTTP ${ctx.httpStatus}`
                : 'Intervals.icu could not return map data';
        case MAP_BACKFILL_CODE.NETWORK_ERROR:
            return 'Network error while calling Intervals.icu';
        case MAP_BACKFILL_CODE.MISSING_API_KEY:
            return 'Intervals API key is not configured';
        default:
            return 'Could not fetch route map';
    }
}
