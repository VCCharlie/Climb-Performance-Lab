/**
 * Linear year-end projection from YTD volume (Strava Year Review style).
 * Projects each metric as: currentYtd / elapsedFractionOfYear.
 */

import { calendarElapsedRatio } from './volumeGoals.js';

const MIN_ELAPSED = 0.02;

/**
 * @param {{ distanceKm: number, movingTimeSec: number, elevationM: number }} currentYtd
 * @param {{ startYmd: string, endYmd: string }} yearRange
 * @param {Date} [ref]
 * @returns {{
 *   distanceKm: number,
 *   movingTimeHours: number,
 *   elevationM: number,
 *   elapsedRatio: number,
 * } | null}
 */
export function projectYearEndVolume(currentYtd, yearRange, ref = new Date()) {
    if (!currentYtd || !yearRange?.startYmd || !yearRange?.endYmd) return null;

    const elapsedRatio = calendarElapsedRatio(yearRange, ref);
    if (elapsedRatio < MIN_ELAPSED) return null;

    const distanceKm = Number(currentYtd.distanceKm) || 0;
    const movingTimeSec = Number(currentYtd.movingTimeSec) || 0;
    const elevationM = Number(currentYtd.elevationM) || 0;

    if (distanceKm <= 0 && movingTimeSec <= 0 && elevationM <= 0) return null;

    return {
        distanceKm: distanceKm / elapsedRatio,
        movingTimeHours: movingTimeSec / 3600 / elapsedRatio,
        elevationM: elevationM / elapsedRatio,
        elapsedRatio,
    };
}

/**
 * @param {number} projected
 * @param {number} target
 * @returns {'above' | 'below' | 'on_track' | null}
 */
export function projectionVsTargetStatus(projected, target) {
    const t = Number(target) || 0;
    const p = Number(projected) || 0;
    if (t <= 0 || p <= 0) return null;
    const ratio = p / t;
    if (ratio >= 1.05) return 'above';
    if (ratio <= 0.95) return 'below';
    return 'on_track';
}
