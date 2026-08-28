/**
 * Week-level TSS projection and planned hours for the fluid coach plan.
 */
import { buildActualTssByDate } from './coachWeekCalendarTss';
import { estimateSessionTss } from './coachSessionTss';

/** @param {object} session */
export function isSessionMissed(session) {
    if (!session) return false;
    return session.isPast
        && !session.completed
        && session.plannedStimulus !== 'rest'
        && !session.movedToDate
        && !session.isUnavailable;
}

/** @param {object} session */
export function isSessionBlocked(session) {
    return Boolean(session?.isUnavailable);
}

/** @param {object} session */
export function isSessionRest(session) {
    return session?.plannedStimulus === 'rest' && !session?.sameDayComplete;
}

/**
 * Sessions counted toward projected TSS / planned hours.
 * Excludes missed, blocked, and plain rest days.
 * @param {object} session
 */
export function shouldIncludeInProjection(session) {
    if (!session || isSessionRest(session)) return false;
    if (isSessionBlocked(session)) return false;
    if (isSessionMissed(session)) return false;
    return true;
}

/**
 * @param {object} session
 * @param {number} [weeklyHours]
 * @param {Record<string, number>} [actualTssByDate]
 * @returns {number}
 */
export function resolveSessionTssForProjection(session, weeklyHours = 5, actualTssByDate = {}) {
    if (!shouldIncludeInProjection(session)) return 0;

    const date = session?.date;
    if (date && actualTssByDate[date] != null) {
        return actualTssByDate[date];
    }

    if (session.completed) {
        const stimulus = session.plannedStimulus || session.stimulus;
        return estimateSessionTss(stimulus, weeklyHours);
    }

    const stimulus = session.plannedStimulus || session.stimulus;
    return estimateSessionTss(stimulus, weeklyHours);
}

/**
 * Planned moving time in minutes — template duration when available, else stimulus defaults.
 * @param {object} session
 * @param {number} [weeklyHours]
 * @returns {number}
 */
export function estimateSessionDurationMinutes(session, weeklyHours = 5) {
    if (!shouldIncludeInProjection(session)) return 0;

    const workout = session?.fluidWorkout;
    const totalMinutes = workout?.totalMinutes;
    if (totalMinutes != null) {
        if (typeof totalMinutes === 'number') return totalMinutes;
        const min = Number(totalMinutes.min) || 0;
        const max = Number(totalMinutes.max) || min;
        if (min > 0 || max > 0) return Math.round((min + max) / 2);
    }

    const stimulus = session.plannedStimulus || session.stimulus;
    const byStimulus = {
        recovery: 52,
        endurance: weeklyHours <= 4 ? 75 : weeklyHours <= 5 ? 90 : 105,
        sweetspot: 90,
        threshold: 85,
        vo2: 68,
        completed: 0,
    };

    return byStimulus[stimulus] ?? 60;
}

/**
 * @param {{ sessions?: object[] }} weekPlan
 * @param {object[]} activities
 * @param {number} [weeklyHours]
 * @returns {{
 *   loggedTss: number,
 *   projectedTss: number,
 *   targetTss: number,
 *   includedSessionCount: number,
 *   excludedMissedCount: number,
 *   excludedBlockedCount: number,
 * }}
 */
export function computeWeekTssProjection(weekPlan, activities = [], weeklyHours = 5) {
    const actualTssByDate = buildActualTssByDate(activities);
    const sessions = weekPlan?.sessions || [];
    const targetTss = Number(weekPlan?.targetTss) || 0;
    const loggedTss = Number(weekPlan?.actualTss) || 0;

    let projectedTss = 0;
    let includedSessionCount = 0;
    let excludedMissedCount = 0;
    let excludedBlockedCount = 0;

    for (const session of sessions) {
        if (isSessionMissed(session)) {
            excludedMissedCount += 1;
            continue;
        }
        if (isSessionBlocked(session) || isSessionRest(session)) {
            if (isSessionBlocked(session)) excludedBlockedCount += 1;
            continue;
        }

        const tss = resolveSessionTssForProjection(session, weeklyHours, actualTssByDate);
        if (tss > 0) {
            projectedTss += tss;
            includedSessionCount += 1;
        }
    }

    return {
        loggedTss,
        projectedTss: Math.round(projectedTss),
        targetTss,
        includedSessionCount,
        excludedMissedCount,
        excludedBlockedCount,
    };
}

/**
 * @param {{ sessions?: object[] }} weekPlan
 * @param {number} [weeklyHours]
 * @returns {{ plannedMinutes: number, plannedHours: number, sessionCount: number }}
 */
export function computeWeekPlannedHours(weekPlan, weeklyHours = 5) {
    const sessions = weekPlan?.sessions || [];
    let plannedMinutes = 0;
    let sessionCount = 0;

    for (const session of sessions) {
        if (!shouldIncludeInProjection(session)) continue;
        const minutes = estimateSessionDurationMinutes(session, weeklyHours);
        if (minutes > 0) {
            plannedMinutes += minutes;
            sessionCount += 1;
        }
    }

    return {
        plannedMinutes,
        plannedHours: Math.round((plannedMinutes / 60) * 10) / 10,
        sessionCount,
    };
}

/**
 * @param {number} plannedHours
 * @param {number} weeklyHoursBudget
 * @returns {boolean}
 */
export function planHoursExceedBudget(plannedHours, weeklyHoursBudget) {
    const budget = Number(weeklyHoursBudget) || 0;
    const planned = Number(plannedHours) || 0;
    if (budget <= 0 || planned <= 0) return false;
    return planned > budget + 0.05;
}
