/**
 * Match uploaded rides to planned week sessions by stimulus type (not only calendar date).
 */

import { normalizeDate } from '../formatters';
import { activityIF } from './coachHelpers';

const STIMULUS_RANK = {
    recovery: 0,
    endurance: 1,
    sweetspot: 2,
    threshold: 3,
    vo2: 4,
};

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
 * Link unfulfilled plan slots to rides on other days in the same week.
 * @param {object[]} sessions — built session rows (with date, stimulus, originalStimulus, completed)
 * @param {object[]} activities
 * @param {number} ftp
 * @returns {Map<string, { activityDate: string, matchedStimulus: string }>}
 */
export function matchSessionsToActivities(sessions, activities, ftp) {
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
            return planned && planned !== 'rest' && !s.sameDayComplete;
        })
        .sort((a, b) => {
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
        const candidate = weekActivities.find((a) => {
            if (usedActivityIds.has(a.id)) return false;
            if (a.ymd === session.date) return false;
            return stimulusMatches(planned, a.stimulus);
        });
        if (candidate) {
            usedActivityIds.add(candidate.id);
            matches.set(session.date, {
                activityDate: candidate.ymd,
                matchedStimulus: candidate.stimulus,
            });
        }
    }

    return matches;
}
