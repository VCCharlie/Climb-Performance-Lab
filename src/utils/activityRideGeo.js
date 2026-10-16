/**
 * Ride location hints from stored route polylines (country/region for climb matching).
 */

import { decodePolyline } from './strava.js';
import { isVirtualActivity } from './activityVenue.js';

/**
 * @param {string | null | undefined} encoded
 * @returns {{ lat: number, lon: number } | null}
 */
export function centroidFromEncodedPolyline(encoded) {
    const coords = decodePolyline(encoded);
    if (!coords?.length) return null;
    let latSum = 0;
    let lonSum = 0;
    let n = 0;
    for (const pt of coords) {
        const lat = Number(pt[0]);
        const lon = Number(pt[1]);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
        latSum += lat;
        lonSum += lon;
        n += 1;
    }
    if (n === 0) return null;
    return { lat: latSum / n, lon: lonSum / n };
}

/**
 * Client-side reverse geocode (no API key). Respect rate limits — use delays in bulk.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<{ ride_country?: string, ride_region?: string, ride_centroid_lat: number, ride_centroid_lon: number } | null>}
 */
export async function reverseGeocodeRideLocation(lat, lon, fetchImpl = fetch) {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&localityLanguage=en`;
    try {
        const resp = await fetchImpl(url);
        if (!resp.ok) return null;
        const json = await resp.json();
        const country = json?.countryCode ? String(json.countryCode).trim().toUpperCase() : '';
        const region = json?.principalSubdivision
            ? String(json.principalSubdivision).trim()
            : (json?.locality ? String(json.locality).trim() : '');
        if (!country) return null;
        return {
            ride_country: country,
            ride_region: region || undefined,
            ride_centroid_lat: lat,
            ride_centroid_lon: lon,
        };
    } catch {
        return null;
    }
}

/**
 * @param {object | null | undefined} activity
 * @param {string | null | undefined} encodedPolyline
 * @param {{ fetchImpl?: typeof fetch }} [opts]
 * @returns {Promise<Record<string, string | number> | null>}
 */
export async function buildRideGeoPatchFromPolyline(activity, encodedPolyline, opts = {}) {
    if (!encodedPolyline || String(encodedPolyline).trim() === '') return null;
    if (isVirtualActivity(activity)) return null;
    const centroid = centroidFromEncodedPolyline(encodedPolyline);
    if (!centroid) return null;
    const geo = await reverseGeocodeRideLocation(centroid.lat, centroid.lon, opts.fetchImpl);
    return geo || null;
}

/**
 * Prefer intervals_map, then strava_map.
 * @param {object | null | undefined} activity
 * @returns {string | null}
 */
export function storedRoutePolylineForActivity(activity) {
    if (!activity) return null;
    const strava = activity.strava_map != null ? String(activity.strava_map).trim() : '';
    if (strava) return strava;
    const intervals = activity.intervals_map != null ? String(activity.intervals_map).trim() : '';
    return intervals || null;
}
