/**
 * Multi-week fluid plan horizon toward an active event goal.
 */

import { addDaysToYmd } from '../dashboardVolumeTotals';
import { todayYmd } from './coachHelpers';
import { buildFluidWeekPlan } from './coachWeekPlan';
import { projectWeekEndTsb } from './coachFitnessForecast';

const DEFAULT_MAX_WEEKS = 12;

/**
 * @param {object} params
 * @param {object[]} params.activities
 * @param {object} params.userSettings
 * @param {object} params.coachContext
 * @param {object} params.week1Plan — current week fluid plan
 * @param {string} [params.referenceYmd]
 * @param {number} [params.maxWeeks]
 * @returns {{
 *   horizonWeeks: object[],
 *   eventHorizonActive: boolean,
 *   horizonWeekCount: number,
 *   goalWeeksRemaining: number,
 * }}
 */
export function buildEventHorizonFluidPlans({
    activities,
    userSettings,
    coachContext,
    week1Plan,
    referenceYmd = todayYmd(),
    maxWeeks = DEFAULT_MAX_WEEKS,
}) {
    if (!week1Plan?.sessions?.length) {
        return {
            horizonWeeks: [],
            eventHorizonActive: false,
            horizonWeekCount: 0,
            goalWeeksRemaining: 0,
        };
    }

    const goal = week1Plan.trainingGoal;
    const eventActive = week1Plan.targetTssSource === 'event-goal' && goal?.weeks?.length;

    if (!eventActive) {
        return {
            horizonWeeks: [week1Plan],
            eventHorizonActive: false,
            horizonWeekCount: 1,
            goalWeeksRemaining: 0,
        };
    }

    const currentWeekNum = goal.currentWeekNum || 1;
    const remainingPlanWeeks = goal.weeks.filter((w) => w.weekNum >= currentWeekNum);
    const weeksToBuild = remainingPlanWeeks.slice(0, maxWeeks);
    const horizonWeeks = [{ ...week1Plan, planWeekNum: currentWeekNum }];

    let prevPlan = week1Plan;
    let rollingContext = coachContext;

    for (let i = 1; i < weeksToBuild.length; i += 1) {
        const meta = weeksToBuild[i];
        const nextMonday = addDaysToYmd(prevPlan.mondayYmd, 7);
        const weeklyHours = Number(prevPlan.weeklyHours) || Number(userSettings?.weeklyHoursTarget) || 5;

        const projectedEndTsb = projectWeekEndTsb({
            activities,
            sessions: prevPlan.sessions,
            weeklyHours,
            referenceYmd,
        });

        rollingContext = {
            ...rollingContext,
            fitness: {
                ...rollingContext?.fitness,
                tsb: projectedEndTsb,
            },
        };

        const plan = buildFluidWeekPlan({
            activities,
            userSettings,
            coachContext: rollingContext,
            referenceYmd: nextMonday,
            calendarYmd: referenceYmd,
        });

        horizonWeeks.push({
            ...plan,
            planWeekNum: meta.weekNum ?? plan.trainingGoal?.currentWeekNum ?? currentWeekNum + i,
            planPhaseLabel: meta.phaseLabel || plan.phaseLabel,
            isHorizonPreview: !isDateInWeek(referenceYmd, plan.mondayYmd, plan.sundayYmd),
        });

        prevPlan = plan;
    }

    return {
        horizonWeeks,
        eventHorizonActive: true,
        horizonWeekCount: horizonWeeks.length,
        goalWeeksRemaining: remainingPlanWeeks.length,
    };
}

/**
 * @param {string} ymd
 * @param {string} mondayYmd
 * @param {string} sundayYmd
 */
export function isDateInWeek(ymd, mondayYmd, sundayYmd) {
    return ymd >= mondayYmd && ymd <= sundayYmd;
}

/**
 * @param {object} weekPlan
 * @param {string} todayYmdStr
 * @returns {string}
 */
export function horizonWeekPanelTitle(weekPlan, todayYmdStr) {
    const weekNum = weekPlan.planWeekNum ?? weekPlan.trainingGoal?.currentWeekNum;
    const phase = weekPlan.planPhaseLabel || weekPlan.phaseLabel;
    const inCurrentWeek = weekPlan.mondayYmd && weekPlan.sundayYmd
        && isDateInWeek(todayYmdStr, weekPlan.mondayYmd, weekPlan.sundayYmd);

    if (inCurrentWeek) {
        return phase ? `This week · ${phase}` : 'This week';
    }

    if (weekNum) {
        return phase ? `Week ${weekNum} · ${phase}` : `Week ${weekNum}`;
    }

    return 'Upcoming week';
}
