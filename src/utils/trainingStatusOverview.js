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
 * Calendar-week TSS vs fluid week target (event goal or hours budget).
 * Shared by dashboard training status and coach "today's focus".
 *
 * @param {object} params
 * @param {object[]} params.activities
 * @param {object} [params.userSettings]
 * @param {string} [params.referenceYmd]
 * @returns {{
 *   actualTss: number,
 *   targetTss: number,
 *   compliancePct: number,
 *   targetSource: 'manual' | 'event-goal' | 'hours-budget',
 *   weekKey: string,
 *   weekLabel: string,
 *   weekStartYmd: string,
 *   weekEndYmd: string,
 * }}
 */
export function buildWeeklyLoadSnapshot({
    activities,
    userSettings,
    referenceYmd = todayYmd(),
}) {
    const week = currentWeekRange(new Date(`${referenceYmd}T12:00:00`));
    const weekActs = filterActivitiesInRange(activities, week.startYmd, week.endYmd);
    const actualTss = Math.round(sumTss(weekActs));

    const weekTarget = resolveFluidWeekTarget({ userSettings, referenceYmd });
    const targetTss = weekTarget.targetTss || 0;
    const compliancePct = weekTssPercentOfTarget(actualTss, targetTss) ?? 0;

    return {
        actualTss,
        targetTss,
        compliancePct,
        targetSource: weekTarget.source,
        weekKey: weekTarget.weekKey,
        weekLabel: week.label,
        weekStartYmd: week.startYmd,
        weekEndYmd: week.endYmd,
    };
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
    const weeklyLoad = buildWeeklyLoadSnapshot({ activities, userSettings, referenceYmd });
    const weekTss = weeklyLoad.actualTss;
    const targetTss = weeklyLoad.targetTss;
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
        targetSource: weeklyLoad.targetSource,
        optimalBand,
        readinessBadge: readiness.badge,
        readinessComposite: readiness.composite,
        weekLabel: weeklyLoad.weekLabel,
    };
}
