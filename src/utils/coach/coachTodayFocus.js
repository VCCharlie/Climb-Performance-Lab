/**
 * Today's date, planned session, and logged rides for coach Q&A.
 */

import { normalizeDate } from '../formatters';
import {
    activityIF,
    filterActivitiesInRange,
    movingTimeSec,
    todayYmd,
} from './coachHelpers';
import { classifyActivityStimulus } from './coachSessionMatcher';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function dayNameFromYmd(ymd) {
    const [y, m, d] = ymd.split('-').map(Number);
    return DAY_NAMES[new Date(y, m - 1, d).getDay()];
}

function formatDuration(sec) {
    if (!sec) return '0 min';
    const mins = Math.round(sec / 60);
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

/**
 * @param {object} activity
 * @param {number} ftp
 */
export function summarizeRideForCoach(activity, ftp) {
    const ifVal = activityIF(activity, ftp);
    const stimulus = classifyActivityStimulus(activity, ftp);
    return {
        id: activity.id,
        title: activity.title || activity.type || 'Ride',
        date: normalizeDate(activity.date),
        type: activity.type,
        load: Math.round(Number(activity.load) || 0),
        normPower: Math.round(Number(activity.norm_power) || 0),
        avgPower: Math.round(Number(activity.avg_power) || 0),
        distanceKm: Math.round((Number(activity.distance) || 0) * 10) / 10,
        durationMin: Math.round(movingTimeSec(activity.moving_time) / 60),
        durationLabel: formatDuration(movingTimeSec(activity.moving_time)),
        intensityFactor: ifVal != null ? Math.round(ifVal * 1000) / 1000 : null,
        stimulus,
    };
}

/**
 * @param {object[]} activities
 * @param {number} ftp
 * @param {object} fluidWorkout
 * @param {string} [referenceYmd]
 */
export function buildTodayFocus(activities, ftp, fluidWorkout, referenceYmd = todayYmd()) {
    const rides = filterActivitiesInRange(activities, referenceYmd, referenceYmd)
        .filter((a) => {
            const t = String(a.type || '').toLowerCase();
            return t.includes('ride') || t.includes('virtual') || t.includes('run');
        })
        .map((a) => summarizeRideForCoach(a, ftp));

    const totalTss = rides.reduce((sum, r) => sum + r.load, 0);

    return {
        date: referenceYmd,
        dayName: dayNameFromYmd(referenceYmd),
        plannedStimulus: fluidWorkout?.stimulus || null,
        plannedWorkout: fluidWorkout?.name || null,
        plannedLabel: fluidWorkout?.stimulusLabel || fluidWorkout?.stimulus || null,
        targetWatts: fluidWorkout?.mainSet?.blocks?.[0]?.wattRange || null,
        loggedRides: rides,
        hasLoggedRide: rides.length > 0,
        totalTssToday: totalTss,
    };
}

/**
 * @param {object} todayFocus
 * @param {object} weekPlanSummary
 */
export function rateTodayRideAnswer(todayFocus, weekPlanSummary, fitness) {
    const { date, dayName, plannedLabel, plannedStimulus, targetWatts } = todayFocus;

    if (!todayFocus.hasLoggedRide) {
        const todaySession = weekPlanSummary?.sessions?.find((s) => s.isToday);
        const planLine = todaySession
            ? `Today's plan: ${todaySession.stimulus} (${todaySession.workoutName || todaySession.stimulus}).`
            : `Today's plan: ${plannedLabel || plannedStimulus || 'see week plan'}.`;
        return `I don't see a ride logged for today yet (${dayName} ${date}).\n\n`
            + `${planLine}\n\n`
            + 'After you upload or sync today\'s ride, ask again and I can rate it against the plan.';
    }

    const ride = todayFocus.loggedRides[0];
    const allRides = todayFocus.loggedRides;
    const lines = [];

    if (allRides.length > 1) {
        lines.push(`You logged ${allRides.length} activities today (${todayFocus.totalTssToday} TSS total). Rating the main ride:`);
    }

    lines.push(`**${ride.title}** — ${ride.durationLabel}, ${ride.load} TSS`
        + (ride.normPower ? `, NP ${ride.normPower}W` : '')
        + (ride.intensityFactor != null ? ` (IF ${ride.intensityFactor})` : ''));

    const todaySession = weekPlanSummary?.sessions?.find((s) => s.isToday);
    const expectedStimulus = todaySession?.stimulus && todaySession.stimulus !== 'rest'
        ? todaySession.stimulus
        : plannedStimulus;

    if (expectedStimulus && expectedStimulus !== 'rest' && expectedStimulus !== 'completed') {
        lines.push(`\nPlan for today: **${todaySession?.workoutName || plannedLabel || expectedStimulus}** (${expectedStimulus}).`);
        if (targetWatts) {
            lines.push(`Target range: ${targetWatts}.`);
        }
    } else if (todaySession?.movedFromDate) {
        lines.push('\nYou moved a session to today — good flexibility.');
    } else {
        lines.push('\nToday was scheduled as rest or open in your fluid week plan.');
    }

    if (ride.stimulus === 'recovery' || ride.stimulus === 'endurance') {
        if (['recovery', 'endurance', 'rest'].includes(expectedStimulus) || !expectedStimulus) {
            lines.push('\n**Verdict:** Well executed — intensity matches the easy/endurance intent.');
        } else if (['sweetspot', 'threshold', 'vo2'].includes(expectedStimulus)) {
            lines.push('\n**Verdict:** You rode easier than planned quality work. Fine if fatigued; otherwise consider the planned session on the next available day.');
        } else {
            lines.push('\n**Verdict:** Easy ride — appropriate for absorbing load.');
        }
    } else if (['sweetspot', 'threshold', 'vo2'].includes(ride.stimulus)) {
        if (fitness?.tsb < -10) {
            lines.push('\n**Verdict:** Harder than ideal for your current fatigue (TSB '
                + `${fitness.tsb}). Quality is fine, but watch cumulative load.`);
        } else {
            lines.push('\n**Verdict:** Solid quality work — stimulus matches or exceeds the plan.');
        }
    } else {
        lines.push(`\n**Verdict:** Ride classified as ${ride.stimulus || 'unknown'} — compare to today's plan above.`);
    }

    if (weekPlanSummary?.compliancePct > 115) {
        lines.push(`\nContext: ${weekPlanSummary.actualTss}/${weekPlanSummary.targetTss} TSS this week (${weekPlanSummary.compliancePct}%) — volume is high; easy days matter.`);
    }

    return lines.join('\n');
}
