/**
 * Match uploaded rides to planned week sessions by stimulus type (not only calendar date).
 */

import { normalizeDate } from '../formatters';
import { activityIF } from './coachHelpers';

/** Max calendar days between a ride and a planned session for cross-day matching. */
export const CROSS_DAY_MATCH_WINDOW_DAYS = 3;

const STIMULUS_RANK = {
    recovery: 0,
    endurance: 1,
    sweetspot: 2,
    threshold: 3,
    vo2: 4,
};

/**
 * Absolute calendar-day distance between two YYYY-MM-DD strings.
 * @param {string} ymdA
 * @param {string} ymdB
 */
export function daysApartYmd(ymdA, ymdB) {
    const [y1, m1, d1] = ymdA.split('-').map(Number);
    const [y2, m2, d2] = ymdB.split('-').map(Number);
    const t1 = Date.UTC(y1, m1 - 1, d1);
    const t2 = Date.UTC(y2, m2 - 1, d2);
    return Math.round(Math.abs(t2 - t1) / 86400000);
}

/**
 * Classify a ride into a training stimulus bucket from NP/FTP.
 * @param {object} activity
 * @param {number} ftp
 * @returns {'recovery'|'endurance'|'sweetspot'|'threshold'|'vo2'|null}
 */
export function classifyActivityStimulus(activity, ftp) {
    const ifVal = activityIF(activity, ftp);
    if (ifVal == null) return null;
    if (ifVal < 0.55) return 'recovery';
    if (ifVal < 0.88) return 'endurance';
    if (ifVal < 0.95) return 'sweetspot';
    if (ifVal <= 1.05) return 'threshold';
    return 'vo2';
}

/**
 * Can this ride fulfill a planned session stimulus?
 * Threshold ride can fulfill sweetspot (harder OK), not the reverse.
 */
export function stimulusMatches(planned, actual) {
    if (!planned || !actual || planned === 'rest' || planned === 'completed') return false;
    if (planned === actual) return true;
    const pRank = STIMULUS_RANK[planned] ?? 0;
    const aRank = STIMULUS_RANK[actual] ?? 0;
    return aRank >= pRank && aRank - pRank <= 1;
}

/**
 * Link unfulfilled plan slots to nearby rides (±windowDays) in the same week.
 * @param {object[]} sessions — built session rows (with date, stimulus, originalStimulus, completed)
 * @param {object[]} activities — should already be limited to the current plan week
 * @param {number} ftp
 * @param {{ windowDays?: number, referenceYmd?: string }} [options]
 *   referenceYmd — calendar today; sessions on this date only complete via same-day rides (not cross-day).
 * @returns {Map<string, { activityDate: string, matchedStimulus: string }>}
 */
export function matchSessionsToActivities(sessions, activities, ftp, options = {}) {
    const windowDays = options.windowDays ?? CROSS_DAY_MATCH_WINDOW_DAYS;
    const referenceYmd = options.referenceYmd || null;
    const matches = new Map();
    const usedActivityIds = new Set();

    // Pass 1: same-day completions for real workouts — reserve those activities.
    // Rides on rest days stay available for cross-day matching.
    for (const s of sessions) {
        if (!s.sameDayComplete) continue;
        const planned = s.plannedStimulus || s.originalStimulus;
        if (!planned || planned === 'rest') continue;

        const act = activities.find((a) => normalizeDate(a.date) === s.date);
        if (act?.id) usedActivityIds.add(act.id);
    }

    const pending = sessions
        .filter((s) => {
            const planned = s.plannedStimulus || s.originalStimulus;
            if (!planned || planned === 'rest' || s.sameDayComplete) return false;
            if (s.isUnavailable) return false;
            // Future workouts stay open — a ride earlier in the week must not mark them done yet.
            if (referenceYmd && s.date > referenceYmd) return false;
            // Today stays open until you ride today or mark it done — no backfill from yesterday.
            if (referenceYmd && s.date === referenceYmd) return false;
            return true;
        })
        .sort((a, b) => {
            const aRelocated = a.relocatedFromDate ? 1 : 0;
            const bRelocated = b.relocatedFromDate ? 1 : 0;
            if (bRelocated !== aRelocated) return bRelocated - aRelocated;
            const pa = STIMULUS_RANK[a.plannedStimulus || a.originalStimulus] ?? 0;
            const pb = STIMULUS_RANK[b.plannedStimulus || b.originalStimulus] ?? 0;
            if (pb !== pa) return pb - pa;
            return a.date.localeCompare(b.date);
        });

    const weekActivities = activities
        .map((a) => ({
            ...a,
            ymd: normalizeDate(a.date),
            stimulus: classifyActivityStimulus(a, ftp),
        }))
        .filter((a) => a.ymd && a.stimulus)
        .sort((a, b) => a.ymd.localeCompare(b.ymd));

    for (const session of pending) {
        const planned = session.plannedStimulus || session.originalStimulus;

        const candidates = weekActivities
            .filter((a) => {
                if (usedActivityIds.has(a.id)) return false;
                if (a.ymd === session.date) return false;
                if (daysApartYmd(a.ymd, session.date) > windowDays) return false;
                return stimulusMatches(planned, a.stimulus);
            })
            .sort((a, b) => {
                const distA = daysApartYmd(a.ymd, session.date);
                const distB = daysApartYmd(b.ymd, session.date);
                if (distA !== distB) return distA - distB;
                return a.ymd.localeCompare(b.ymd);
            });

        const candidate = candidates[0];
        if (candidate) {
            usedActivityIds.add(candidate.id);
            matches.set(session.date, {
                activityId: candidate.id || null,
                activityDate: candidate.ymd,
                matchedStimulus: candidate.stimulus,
            });
        }
    }

    return matches;
}
