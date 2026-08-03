/**
 * Builds a rebalanced fluid week plan from activities + coach context.
 */

import { normalizeDate } from '../formatters';
import { addDaysToYmd } from '../dashboardVolumeTotals';
import { buildWeekSkeleton, rebalanceWeek } from './coachRebalancer';
import { buildFluidWorkout } from './fluidWorkoutTemplates';
import { weeklyTssTarget } from './coachHelpers';
import { activityIF, filterActivitiesInRange, sumTss, todayYmd } from './coachHelpers';
import { readCoachWeekState } from './coachWeekState';

/**
 * Monday (ISO) of the week containing referenceYmd.
 * @param {string} [referenceYmd]
 */
export function getMondayYmd(referenceYmd = todayYmd()) {
    const [y, m, d] = referenceYmd.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const day = dt.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    dt.setDate(dt.getDate() + diff);
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
}

/**
 * @param {object[]} activities
 * @param {string} mondayYmd
 * @param {number} ftp
 */
export function computeWeekActuals(activities, mondayYmd, ftp) {
    const sundayYmd = addDaysToYmd(mondayYmd, 6);
    const weekActs = filterActivitiesInRange(activities, mondayYmd, sundayYmd);

    let hardSessions = 0;
    const activityDates = new Set();
    for (const a of weekActs) {
        const ymd = normalizeDate(a.date);
        if (ymd) activityDates.add(ymd);
        const ifVal = activityIF(a, ftp);
        if (ifVal != null && ifVal > 0.90) hardSessions += 1;
    }

    return {
        tssThisWeek: Math.round(sumTss(weekActs)),
        hardSessionsThisWeek: hardSessions,
        activityDates,
        rideCount: weekActs.length,
    };
}

/**
 * @param {object} params
 * @param {object[]} params.activities
 * @param {object} params.userSettings
 * @param {object} params.coachContext
 * @param {string} [params.referenceYmd]
 */
export function buildFluidWeekPlan({ activities, userSettings, coachContext, referenceYmd = todayYmd() }) {
    const weeklyHours = Number(userSettings?.weeklyHoursTarget) || 5;
    const ftp = coachContext?.athlete?.ftp || Number(userSettings?.ftp) || 0;
    const mondayYmd = getMondayYmd(referenceYmd);
    const sundayYmd = addDaysToYmd(mondayYmd, 6);
    const targetTss = weeklyTssTarget(weeklyHours);
    const actuals = computeWeekActuals(activities, mondayYmd, ftp);
    const weekState = readCoachWeekState(mondayYmd);

    const skeleton = buildWeekSkeleton(weeklyHours, mondayYmd);
    const currentTsb = coachContext?.fitness?.tsb ?? 0;

    const rebalanced = rebalanceWeek(
        { targetTss, sessions: skeleton },
        {
            tssThisWeek: actuals.tssThisWeek,
            hardSessionsThisWeek: actuals.hardSessionsThisWeek,
            currentTsb,
        },
        referenceYmd,
    );

    const rebalanceMap = new Map(rebalanced.map((s) => [s.date, s]));

    const sessions = skeleton.map((row) => {
        const reb = rebalanceMap.get(row.date);
        const overrideStimulus = weekState.overrides[row.date];
        const completed = weekState.completedDates.includes(row.date)
            || actuals.activityDates.has(row.date);

        let stimulus = overrideStimulus || reb?.stimulus || row.stimulus;
        if (completed && stimulus !== 'rest') {
            stimulus = 'completed';
        }

        const fluidWorkout = stimulus && !['rest', 'completed'].includes(stimulus)
            ? buildFluidWorkout(stimulus, { ftp })
            : null;

        return {
            ...row,
            stimulus,
            originalStimulus: row.stimulus,
            note: reb?.note || null,
            completed,
            isToday: row.date === referenceYmd,
            isPast: row.date < referenceYmd,
            fluidWorkout,
            workoutName: fluidWorkout?.name || (stimulus === 'rest' ? 'Rest' : stimulus === 'completed' ? 'Done' : row.session),
        };
    });

    const compliancePct = targetTss > 0
        ? Math.round((actuals.tssThisWeek / targetTss) * 100)
        : 0;

    let rebalanceNote = null;
    if (actuals.tssThisWeek > targetTss * 1.15) {
        rebalanceNote = 'High load this week — remaining sessions were eased automatically.';
    } else if (actuals.hardSessionsThisWeek >= 2) {
        rebalanceNote = 'Quality already banked — extra intensity sessions shifted to endurance.';
    } else if (actuals.tssThisWeek < targetTss * 0.7 && currentTsb > -10) {
        rebalanceNote = 'Below weekly TSS target — room for an extra easy ride if you feel good.';
    }

    return {
        mondayYmd,
        sundayYmd,
        weeklyHours,
        targetTss,
        actualTss: actuals.tssThisWeek,
        compliancePct,
        hardSessions: actuals.hardSessionsThisWeek,
        rideCount: actuals.rideCount,
        rebalanceNote,
        sessions,
    };
}
