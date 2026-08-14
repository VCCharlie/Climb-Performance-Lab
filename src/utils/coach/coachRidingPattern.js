/**
 * Recent riding pattern from activity log — drives TSS-realistic week skeletons.
 */

import { normalizeDate } from '../formatters';
import { addDaysToYmd } from '../dashboardVolumeTotals';
import { filterActivitiesInRange, sumTss } from './coachHelpers';

const RIDE_TYPES = new Set(['Ride', 'VirtualRide', 'GravelRide', 'MountainBikeRide', 'EBikeRide']);

/**
 * @param {object} activity
 * @returns {boolean}
 */
export function isRideActivity(activity) {
    const type = (activity?.type || '').trim();
    if (RIDE_TYPES.has(type)) return true;
    if (!type && (Number(activity?.load) > 0 || Number(activity?.distance) > 0)) return true;
    return false;
}

/**
 * Analyze riding load over a rolling window before referenceYmd.
 * @param {object[]} activities
 * @param {string} [referenceYmd]
 * @param {number} [windowWeeks]
 * @returns {{
 *   avgTssPerRide: number | null,
 *   ridesPerWeek: number,
 *   avgWeeklyTss: number,
 *   totalRides: number,
 *   intensityBias: 'volume' | 'mixed' | 'intensity',
 *   windowWeeks: number,
 * }}
 */
export function analyzeRidingPattern(activities, referenceYmd, windowWeeks = 8) {
    const endYmd = referenceYmd || new Date().toISOString().slice(0, 10);
    const startYmd = addDaysToYmd(endYmd, -(windowWeeks * 7 - 1));

    const rides = filterActivitiesInRange(activities || [], startYmd, endYmd)
        .filter(isRideActivity)
        .filter((a) => (Number(a.load) || 0) > 0);

    const totalRides = rides.length;
    const totalTss = sumTss(rides);
    const avgWeeklyTss = windowWeeks > 0 ? totalTss / windowWeeks : 0;
    const ridesPerWeek = windowWeeks > 0 ? totalRides / windowWeeks : 0;
    const avgTssPerRide = totalRides > 0 ? totalTss / totalRides : null;

    let intensityBias = 'volume';
    if (avgTssPerRide != null) {
        if (avgTssPerRide >= 95) intensityBias = 'intensity';
        else if (avgTssPerRide >= 70) intensityBias = 'mixed';
    }

    return {
        avgTssPerRide: avgTssPerRide != null ? Math.round(avgTssPerRide) : null,
        ridesPerWeek: Math.round(ridesPerWeek * 10) / 10,
        avgWeeklyTss: Math.round(avgWeeklyTss),
        totalRides,
        intensityBias,
        windowWeeks,
    };
}

/**
 * Pick how many sessions to schedule for a weekly TSS target.
 * @param {number} targetTss
 * @param {ReturnType<typeof analyzeRidingPattern>} pattern
 * @param {number} weeklyHours
 * @returns {number}
 */
export function sessionCountForTarget(targetTss, pattern, weeklyHours) {
    const fallbackPerRide = weeklyHours <= 4 ? 85 : weeklyHours <= 6 ? 110 : 125;
    const perRide = pattern.avgTssPerRide || fallbackPerRide;
    const fromTarget = Math.round(targetTss / perRide);
    const fromHabit = pattern.ridesPerWeek > 0
        ? Math.round(pattern.ridesPerWeek)
        : fromTarget;

    const blended = pattern.totalRides >= 4
        ? Math.round((fromTarget + fromHabit) / 2)
        : fromTarget;

    return Math.min(6, Math.max(3, blended));
}
