/**
 * src/utils/strava.js
 * Strava API utility functions
 */

// Decode Google's Encoded Polyline Algorithm Format
// Used by Strava's map.summary_polyline field
export const decodePolyline = (encoded) => {
    if (!encoded) return [];
    let index = 0, lat = 0, lng = 0;
    const coords = [];
    while (index < encoded.length) {
        let shift = 0, result = 0, byte;
        do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
        lat += (result & 1) ? ~(result >> 1) : (result >> 1);
        shift = 0; result = 0;
        do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
        lng += (result & 1) ? ~(result >> 1) : (result >> 1);
        coords.push([lat / 1e5, lng / 1e5]);
    }
    return coords;
};

// Extract numeric Strava activity ID from Intervals.icu external_id field
// Intervals.icu stores it as e.g. "strava-12345678" or "strava:12345678"
export const extractStravaId = (externalId) => {
    if (!externalId) return null;
    const match = String(externalId).match(/strava[:-]?(\d+)/i);
    return match ? match[1] : null;
};

/**
 * Numeric Strava activity id for API URLs and matching (handles "123", "strava-123", whitespace).
 * @param {string | number} stravaId
 * @returns {string | null}
 */
export function normalizeStravaActivityId(stravaId) {
    if (stravaId == null || stravaId === '') return null;
    const s = String(stravaId).trim();
    const digits = s.replace(/\D/g, '');
    if (digits.length >= 6) return digits;
    const fromExt = extractStravaId(s);
    return fromExt || (digits || null);
}

/** @param {string | number | null | undefined} stravaId */
export function stravaActivityUrl(stravaId) {
    const id = normalizeStravaActivityId(stravaId);
    return id ? `https://www.strava.com/activities/${id}` : null;
}

/** @param {string | number | null | undefined} stravaId */
export function stravaFlybyUrl(stravaId) {
    const id = normalizeStravaActivityId(stravaId);
    return id ? `https://labs.strava.com/flyby/viewer/#${id}` : null;
}

/**
 * Open Strava segment in a new tab so the app stays loaded (no full reload after
 * a refresh/sync burst — avoids immediate 429 on Strava web when same-tab navigation
 * followed a heavy API session).
 * @param {string|number} segmentId
 */
export function navigateToStravaSegment(segmentId) {
    const id = segmentId != null ? String(segmentId).replace(/\D/g, '') : '';
    if (!id) return;
    const url = `https://www.strava.com/segments/${id}`;
    const w = window.open(url, '_blank', 'noopener,noreferrer');
    if (!w || w.closed) {
        window.alert('Could not open a new tab (popup blocked?). Allow popups for this site, or open the segment manually:\n' + url);
    }
}

// Format seconds to M:SS or H:MM:SS
export const formatSegmentTime = (seconds) => {
    if (!seconds || seconds <= 0) return '-';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
};
