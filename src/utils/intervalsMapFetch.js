/**
 * Fetch Intervals.icu route polyline and encode as Google summary polyline (strava_map compatible).
 */

import { fetchWithTimeout } from './fetchWithTimeout.js';
import { devLog } from './safeLog.js';
import { MAP_BACKFILL_CODE } from './intervalsMapBackfillCodes.js';

function encodeSigned(num) {
    let s = num << 1;
    if (num < 0) s = ~s;
    let out = '';
    while (s >= 0x20) {
        out += String.fromCharCode((0x20 | (s & 0x1f)) + 63);
        s >>= 5;
    }
    out += String.fromCharCode(s + 63);
    return out;
}

/**
 * @param {Array<[number, number]>|Array<{lat:number,lng:number}>} latLngs
 * @returns {string|null}
 */
export function encodeGooglePolyline(latLngs) {
    if (!latLngs?.length) return null;
    let lastLat = 0;
    let lastLon = 0;
    let result = '';
    for (const pt of latLngs) {
        const lat = Array.isArray(pt) ? Number(pt[0]) : Number(pt.lat);
        const lon = Array.isArray(pt) ? Number(pt[1]) : Number(pt.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
        const latE5 = Math.round(lat * 1e5);
        const lonE5 = Math.round(lon * 1e5);
        result += encodeSigned(latE5 - lastLat);
        result += encodeSigned(lonE5 - lastLon);
        lastLat = latE5;
        lastLon = lonE5;
    }
    return result || null;
}

/**
 * Flatten Intervals map latlngs (may contain null segment gaps) into [lat, lng] pairs.
 * @param {unknown} latlngs
 * @returns {Array<[number, number]> | null}
 */
export function flattenLatLngPoints(latlngs) {
    if (!Array.isArray(latlngs) || latlngs.length === 0) return null;
    /** @type {Array<[number, number]>} */
    const pairs = [];
    for (const pt of latlngs) {
        if (pt == null) continue;
        if (Array.isArray(pt) && pt.length >= 2) {
            const lat = Number(pt[0]);
            const lon = Number(pt[1]);
            if (Number.isFinite(lat) && Number.isFinite(lon)) pairs.push([lat, lon]);
            continue;
        }
        if (typeof pt === 'object') {
            const lat = Number(pt.lat);
            const lon = Number(pt.lng ?? pt.lon);
            if (Number.isFinite(lat) && Number.isFinite(lon)) pairs.push([lat, lon]);
        }
    }
    return pairs.length > 0 ? pairs : null;
}

/**
 * Intervals stream type `latlng` stores latitude in `data` and longitude in `data2` (parallel arrays).
 * @param {object | null | undefined} stream
 * @returns {Array<[number, number]> | null}
 */
export function latLngPairsFromIntervalsStream(stream) {
    if (!stream || typeof stream !== 'object') return null;

    const pairCandidates = flattenLatLngPoints(stream.data);
    if (pairCandidates && pairCandidates.length >= 2) {
        return pairCandidates;
    }

    const lats = stream.data;
    const lngs = stream.data2;
    if (Array.isArray(lats) && Array.isArray(lngs) && lats.length > 0 && lngs.length > 0) {
        const pairs = [];
        const n = Math.min(lats.length, lngs.length);
        for (let i = 0; i < n; i += 1) {
            const lat = Number(lats[i]);
            const lon = Number(lngs[i]);
            if (Number.isFinite(lat) && Number.isFinite(lon)) pairs.push([lat, lon]);
        }
        if (pairs.length >= 2) return pairs;
    }

    return flattenLatLngPoints(stream.latlng ?? stream.latlngs ?? stream);
}

function normalizeLatLngPayload(json) {
    if (!json) return null;
    if (Array.isArray(json)) {
        if (!json.length) return null;
        const first = json[0];
        if (first != null && Array.isArray(first)) {
            return flattenLatLngPoints(json);
        }
        if (first != null && typeof first === 'object' && first.lat != null && first.lng != null) {
            return flattenLatLngPoints(json);
        }
        if (typeof first === 'number' && json.length >= 4 && json.length % 2 === 0) {
            const pairs = [];
            for (let i = 0; i < json.length; i += 2) {
                const lat = Number(json[i]);
                const lon = Number(json[i + 1]);
                if (Number.isFinite(lat) && Number.isFinite(lon)) pairs.push([lat, lon]);
            }
            return pairs.length > 0 ? pairs : null;
        }
    }
    if (typeof json === 'object' && json.data != null && json.data2 != null) {
        return latLngPairsFromIntervalsStream(json);
    }
    const latlngs = json.latlngs || json.latlng || json.data;
    return flattenLatLngPoints(latlngs);
}

/**
 * @typedef {{ polyline: string | null, code: string, httpStatus?: number }} IntervalsMapFetchResult
 */

function httpCodeToBackfillCode(status) {
    if (status === 404) return MAP_BACKFILL_CODE.INTERVALS_NOT_FOUND;
    if (status === 403 || status === 401) return MAP_BACKFILL_CODE.INTERVALS_FORBIDDEN;
    return MAP_BACKFILL_CODE.INTERVALS_HTTP_ERROR;
}

/**
 * @param {unknown} err
 * @returns {{ code: string, networkDetail?: 'timeout' | 'offline' }}
 */
function classifyIntervalsFetchError(err) {
    const name = err && typeof err === 'object' ? err.name : '';
    const message = err && typeof err === 'object' && err.message ? String(err.message) : String(err || '');
    if (name === 'AbortError' || /aborted|timeout/i.test(message)) {
        return { code: MAP_BACKFILL_CODE.NETWORK_ERROR, networkDetail: 'timeout' };
    }
    if (/failed to fetch|networkerror|load failed/i.test(message)) {
        return { code: MAP_BACKFILL_CODE.NETWORK_ERROR, networkDetail: 'offline' };
    }
    return { code: MAP_BACKFILL_CODE.NETWORK_ERROR };
}

/**
 * @param {string} activityId — Intervals activity id (incl. leading i)
 * @param {{ apiKey?: string }} intervalsConfig
 * @returns {Promise<IntervalsMapFetchResult>}
 */
export async function fetchIntervalsActivityMapPolylineDetailed(activityId, intervalsConfig) {
    const id = String(activityId || '').trim();
    if (!id || !intervalsConfig?.apiKey) {
        return { polyline: null, code: MAP_BACKFILL_CODE.MISSING_API_KEY };
    }

    const authString = btoa(`API_KEY:${intervalsConfig.apiKey}`);
    const headers = {
        Authorization: `Basic ${authString}`,
        Accept: 'application/json',
    };

    let lastHttpStatus;

    const mapUrl = `https://intervals.icu/api/v1/activity/${encodeURIComponent(id)}/map`;
    let mapNetworkDetail;
    try {
        const resp = await fetchWithTimeout(mapUrl, { method: 'GET', headers });
        lastHttpStatus = resp.status;
        if (resp.ok) {
            const json = await resp.json();
            const latlngs = normalizeLatLngPayload(json);
            const encoded = encodeGooglePolyline(latlngs);
            if (encoded) {
                return { polyline: encoded, code: MAP_BACKFILL_CODE.ADDED };
            }
        } else {
            devLog(`[Intervals map] ${id}: HTTP ${resp.status}`);
        }
    } catch (err) {
        devLog(`[Intervals map] ${id}: ${err?.message || err}`);
        mapNetworkDetail = classifyIntervalsFetchError(err).networkDetail;
        // Fall through to /streams — /map often fails on older rides while streams still work.
    }

    const streamUrl = `https://intervals.icu/api/v1/activity/${encodeURIComponent(id)}/streams?types=latlng`;
    try {
        const resp = await fetchWithTimeout(streamUrl, { method: 'GET', headers });
        lastHttpStatus = resp.status;
        if (!resp.ok) {
            return {
                polyline: null,
                code: httpCodeToBackfillCode(resp.status),
                httpStatus: resp.status,
            };
        }
        const json = await resp.json();
        let latlngs = null;
        if (Array.isArray(json)) {
            const stream = json.find((s) => String(s?.type || '').toLowerCase() === 'latlng');
            latlngs = latLngPairsFromIntervalsStream(stream);
        } else {
            latlngs = latLngPairsFromIntervalsStream(json?.latlng) || normalizeLatLngPayload(json);
        }
        const encoded = encodeGooglePolyline(latlngs);
        if (encoded) {
            return { polyline: encoded, code: MAP_BACKFILL_CODE.ADDED };
        }
        if (lastHttpStatus && lastHttpStatus !== 200) {
            return {
                polyline: null,
                code: httpCodeToBackfillCode(lastHttpStatus),
                httpStatus: lastHttpStatus,
            };
        }
        return { polyline: null, code: MAP_BACKFILL_CODE.NO_GPS_DATA };
    } catch (err) {
        devLog(`[Intervals map streams] ${id}: ${err?.message || err}`);
        const classified = classifyIntervalsFetchError(err);
        return {
            polyline: null,
            code: classified.code,
            networkDetail: classified.networkDetail || mapNetworkDetail,
        };
    }
}

/**
 * @param {string} activityId
 * @param {{ apiKey?: string }} intervalsConfig
 * @returns {Promise<string|null>} encoded polyline
 */
export async function fetchIntervalsActivityMapPolyline(activityId, intervalsConfig) {
    const result = await fetchIntervalsActivityMapPolylineDetailed(activityId, intervalsConfig);
    return result.polyline;
}
