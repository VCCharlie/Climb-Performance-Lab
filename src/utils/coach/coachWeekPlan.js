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
import { matchSessionsToActivities } from './coachSessionMatcher';

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
 * Apply manual session moves: fromDate's workout appears on toDate; fromDate becomes open.
 * @param {Map<string, object>} basePlan
 * @param {Record<string, string>} moves
 */
export function applySessionMoves(basePlan, moves) {
    const movedTo = new Map();
    const vacatedDates = new Set();

    for (const [fromDate, toDate] of Object.entries(moves || {})) {
        const fromSession = basePlan.get(fromDate);
        if (!fromSession || fromSession.plannedStimulus === 'rest') continue;

        movedTo.set(toDate, {
            ...fromSession,
            movedFromDate: fromDate,
        });
        vacatedDates.add(fromDate);
    }

    return { movedTo, vacatedDates };
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
    const originalStimulusByDate = new Map(skeleton.map((s) => [s.date, s.stimulus]));
    const skeletonForRebalance = skeleton.map((s) => ({ ...s }));
    const currentTsb = coachContext?.fitness?.tsb ?? 0;

    const rebalanced = rebalanceWeek(
        { targetTss, sessions: skeletonForRebalance },
        {
            tssThisWeek: actuals.tssThisWeek,
            hardSessionsThisWeek: actuals.hardSessionsThisWeek,
            currentTsb,
        },
        referenceYmd,
    );

    const rebalanceMap = new Map(rebalanced.map((s) => [s.date, s]));

    const basePlan = new Map();
    for (const row of skeleton) {
        const reb = rebalanceMap.get(row.date);
        let plannedStimulus = reb?.stimulus || row.stimulus;
        let note = reb?.note || null;

        // Keep rest days with logged rides open for cross-day stimulus matching.
        if (originalStimulusByDate.get(row.date) === 'rest' && actuals.activityDates.has(row.date)) {
            plannedStimulus = 'rest';
            note = null;
        }

        basePlan.set(row.date, {
            ...row,
            plannedStimulus,
            originalStimulus: originalStimulusByDate.get(row.date) || row.stimulus,
            note,
        });
    }

    const { movedTo, vacatedDates } = applySessionMoves(basePlan, weekState.moves);

    const preliminary = skeleton.map((row) => {
        const base = basePlan.get(row.date);
        let plannedStimulus = base.plannedStimulus;
        let movedFromDate = null;
        let movedToDate = null;
        let note = base.note;

        if (vacatedDates.has(row.date)) {
            movedToDate = weekState.moves[row.date];
            plannedStimulus = 'rest';
            note = null;
        }

        if (movedTo.has(row.date)) {
            const incoming = movedTo.get(row.date);
            plannedStimulus = incoming.plannedStimulus;
            movedFromDate = incoming.movedFromDate;
            note = incoming.note;
        }

        const overrideStimulus = weekState.overrides[row.date];
        const activeStimulus = overrideStimulus || plannedStimulus;

        const sameDayComplete = weekState.completedDates.includes(row.date)
            || actuals.activityDates.has(row.date);

        return {
            ...row,
            plannedStimulus,
            originalStimulus: base.originalStimulus,
            stimulus: activeStimulus,
            note,
            movedFromDate,
            movedToDate,
            sameDayComplete,
            isToday: row.date === referenceYmd,
            isPast: row.date < referenceYmd,
        };
    });

    const crossDayMatches = matchSessionsToActivities(
        preliminary,
        filterActivitiesInRange(activities, mondayYmd, sundayYmd),
        ftp,
    );

    const sessions = preliminary.map((row) => {
        const match = crossDayMatches.get(row.date);
        const crossDayComplete = Boolean(match);
        const completed = row.sameDayComplete || crossDayComplete;

        let stimulus = row.stimulus;
        if (completed && stimulus !== 'rest') {
            stimulus = 'completed';
        }

        const fluidWorkout = stimulus && !['rest', 'completed'].includes(stimulus)
            ? buildFluidWorkout(stimulus, { ftp })
            : null;

        let flexNote = null;
        if (row.movedFromDate) {
            const fromDay = basePlan.get(row.movedFromDate)?.day || 'another day';
            flexNote = `Moved from ${fromDay} — do this session today instead.`;
        } else if (row.movedToDate) {
            const toDay = basePlan.get(row.movedToDate)?.day || 'another day';
            flexNote = `Moved to ${toDay}.`;
        } else if (crossDayComplete && match) {
            const matchDay = preliminary.find((s) => s.date === match.activityDate)?.day || match.activityDate;
            flexNote = `Completed via ${matchDay} ride (${match.matchedStimulus} detected).`;
        }

        return {
            ...row,
            stimulus,
            completed,
            matchedOnDate: match?.activityDate || null,
            matchedStimulus: match?.matchedStimulus || null,
            flexNote,
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

    const hasMoves = Object.keys(weekState.moves || {}).length > 0;

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
        flexWeekNote: 'Sessions can shift across days — ride ahead and we match by intensity, or use Move to today.',
        hasMoves,
        sessions,
    };
}
