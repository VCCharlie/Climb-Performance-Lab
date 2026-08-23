/**
 * Dashboard overview training status — CTL/ATL/TSB, weekly TSS vs target, climbing readiness badge.
 */

import { getFitnessAtDate } from './formTabMetrics';
import { computeClimbingReadiness } from './climbingReadiness';
import { currentWeekRange } from './volumeGoals';
import { resolveFluidWeekTarget } from './trainingGoalLink';
import { todayYmd, filterActivitiesInRange, sumTss } from './coach/coachHelpers';
import { normalizeTerrainProfile } from './climbingTerrainProfile';

/** Optimal weekly TSS band (matches coach period analysis). */
export const WEEK_TSS_OPTIMAL_BAND = {
    minRatio: 0.85,
    maxRatio: 1.15,
};

/**
 * @param {number} targetTss
 * @returns {{ min: number, max: number }}
 */
export function computeWeeklyTssOptimalBand(targetTss) {
    const target = Number(targetTss) || 0;
    if (target <= 0) return { min: 0, max: 0 };
    return {
        min: Math.round(target * WEEK_TSS_OPTIMAL_BAND.minRatio),
        max: Math.round(target * WEEK_TSS_OPTIMAL_BAND.maxRatio),
    };
}

/**
 * @param {number} weekTss
 * @param {number} targetTss
 * @returns {number | null} percent of target, rounded
 */
export function weekTssPercentOfTarget(weekTss, targetTss) {
    const target = Number(targetTss) || 0;
    const actual = Number(weekTss) || 0;
    if (target <= 0) return null;
    return Math.round((actual / target) * 100);
}

/**
 * @param {object} params
 * @param {object[]} params.activities
 * @param {object} [params.userSettings]
 * @param {number} [params.ftp]
 * @param {string} [params.referenceYmd]
 */
export function buildTrainingStatusOverview({
    activities,
    userSettings,
    ftp,
    referenceYmd = todayYmd(),
}) {
    if (!activities?.length) return null;

    const fitness = getFitnessAtDate(activities, referenceYmd);
    const week = currentWeekRange(new Date(`${referenceYmd}T12:00:00`));
    const weekActs = filterActivitiesInRange(activities, week.startYmd, week.endYmd);
    const weekTss = Math.round(sumTss(weekActs));

    const weekTarget = resolveFluidWeekTarget({
        userSettings,
        referenceYmd,
    });
    const targetTss = weekTarget.targetTss || 0;
    const weekTssPct = weekTssPercentOfTarget(weekTss, targetTss);
    const optimalBand = computeWeeklyTssOptimalBand(targetTss);

    const terrainProfile = normalizeTerrainProfile(userSettings?.terrainProfile);
    const readiness = computeClimbingReadiness({
        activities,
        ftp: ftp || Number(userSettings?.ftp) || 0,
        terrainProfile,
        referenceDate: new Date(`${referenceYmd}T12:00:00`),
    });

    return {
        referenceYmd,
        ctl: fitness?.ctl ?? null,
        atl: fitness?.atl ?? null,
        tsb: fitness?.tsb ?? null,
        weekTss,
        targetTss,
        weekTssPct,
        targetSource: weekTarget.source,
        optimalBand,
        readinessBadge: readiness.badge,
        readinessComposite: readiness.composite,
        weekLabel: week.label,
    };
}
