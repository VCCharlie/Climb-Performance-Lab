/**
 * Build climb profiler chart points from a stored route polyline (Strava or Intervals).
 */

import { haversineDistance } from './calculations.js';
import { decodePolyline } from './strava.js';
import {
    getActivityRoutePolyline,
    getActivityRoutePolylineSource,
} from './activityRouteMapCoverage.js';

const DEFAULT_MAX_POINTS = 120;

/**
 * @param {[number, number][]} coords [lat, lng]
 * @param {number} maxPoints
 * @returns {[number, number][]}
 */
export function downsampleLatLngCoords(coords, maxPoints = DEFAULT_MAX_POINTS) {
    if (!coords?.length || coords.length <= maxPoints) return coords || [];
    const step = coords.length / maxPoints;
    const out = [];
    for (let i = 0; i < maxPoints; i += 1) {
        const idx = Math.min(coords.length - 1, Math.floor(i * step));
        out.push(coords[idx]);
    }
    if (out[out.length - 1] !== coords[coords.length - 1]) {
        out.push(coords[coords.length - 1]);
    }
    return out;
}

/**
 * @param {string} encoded
 * @param {{ climbingM?: number, maxPoints?: number }} [options]
 * @returns {{ distance: number, elevation: number, gradient: number, progress: number }[] | null}
 */
export function buildProfilePointsFromEncodedPolyline(encoded, options = {}) {
    const coords = decodePolyline(encoded);
    if (!coords.length || coords.length < 2) return null;

    const sampled = downsampleLatLngCoords(coords, options.maxPoints ?? DEFAULT_MAX_POINTS);
    const segmentKm = [];
    let totalKm = 0;
    for (let i = 1; i < sampled.length; i += 1) {
        const [lat0, lon0] = sampled[i - 1];
        const [lat1, lon1] = sampled[i];
        const d = haversineDistance(lat0, lon0, lat1, lon1);
        segmentKm.push(d);
        totalKm += d;
    }
    if (totalKm <= 0) return null;

    const targetClimbingM = Math.max(0, Number(options.climbingM) || 0);
    let cumulativeKm = 0;
    let cumulativeEle = 0;
    /** @type {{ distance: number, elevation: number, gradient: number, progress: number }[]} */
    const profile = [];

    profile.push({
        distance: 0,
        elevation: 0,
        gradient: 0,
        progress: 0,
    });

    for (let i = 1; i < sampled.length; i += 1) {
        const distKm = segmentKm[i - 1];
        cumulativeKm += distKm;
        const elevGain = targetClimbingM > 0 ? (targetClimbingM * (distKm / totalKm)) : 0;
        cumulativeEle += elevGain;
        const gradient = distKm > 0.001
            ? (elevGain / (distKm * 1000)) * 100
            : 0;
        profile.push({
            distance: cumulativeKm,
            elevation: cumulativeEle,
            gradient: Math.max(-25, Math.min(25, gradient)),
            progress: (cumulativeKm / totalKm) * 100,
        });
    }

    return profile;
}

/**
 * @param {object | null | undefined} activity
 * @returns {{ points: object[], source: 'strava' | 'intervals', activityId: string } | null}
 */
export function resolveActivityRouteProfile(activity) {
    if (!activity?.id) return null;
    const encoded = getActivityRoutePolyline(activity);
    if (!encoded) return null;
    const source = getActivityRoutePolylineSource(activity);
    if (!source) return null;

    const points = buildProfilePointsFromEncodedPolyline(encoded, {
        climbingM: activity.climbing,
    });
    if (!points || points.length < 2) return null;

    return {
        points,
        source,
        activityId: String(activity.id),
    };
}

/**
 * @param {object} activity
 * @param {object[]} profilePoints
 * @param {object | null | undefined} matchedClimb
 * @returns {object}
 */
export function buildClimbSelectionForActivityRoute(activity, profilePoints, matchedClimb) {
    if (matchedClimb?.id) return matchedClimb;

    const last = profilePoints[profilePoints.length - 1];
    const lengthKm = Number(last?.distance) > 0
        ? Number(last.distance)
        : Math.max(0.1, Number(activity.distance) || 0.1);
    const elevation = Math.round(
        Math.max(0, Number(activity.climbing) || 0)
        || (last?.elevation ?? 0),
    );
    const avgGrade = lengthKm > 0
        ? Math.min(25, (elevation / (lengthKm * 10)))
        : 0;

    return {
        id: `activity_route_${String(activity.id)}`,
        name: (activity.title && String(activity.title).trim()) || 'Activity route',
        country: 'ACTIVITY',
        lengthKm,
        elevation,
        avgGrade,
        flag: '🚴',
    };
}

/**
 * @param {object | null | undefined} activity
 * @param {boolean} [hasClimbMatch]
 * @returns {string}
 */
export function describeActivityProfilerRouteTooltip(activity, hasClimbMatch = false) {
    if (hasClimbMatch) return 'Open in Climb Profiler';
    const source = getActivityRoutePolylineSource(activity);
    if (source === 'strava') {
        return 'Open in Climb Profiler (approximation — route from Strava)';
    }
    if (source === 'intervals') {
        return 'Open in Climb Profiler (approximation — route from Intervals.icu)';
    }
    return 'Open in Climb Profiler (default climb — no route in data; pick climb in tab)';
}
