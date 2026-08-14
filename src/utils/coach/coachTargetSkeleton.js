/**
 * Week skeletons aligned with training strategy — development (Z2-first)
 * vs. default hours-based layout. Does NOT scale up to match habitual intensity.
 */

import { addDaysToYmd } from '../dashboardVolumeTotals';
import { estimateSessionTss } from './coachSessionTss';
import { analyzeRidingPattern } from './coachRidingPattern';
import { resolveDevelopmentStrategy } from './coachDevelopmentStrategy';

const SESSION_LABELS = {
    endurance: 'Z2 aerobic base',
    sweetspot: 'Sweetspot (quality day)',
    threshold: 'Threshold work',
    vo2: 'VO2 intervals',
    recovery: 'Recovery spin',
    rest: 'Rest',
};

function addDay(ymd, days) {
    return addDaysToYmd(ymd, days);
}

/**
 * Polarised / pyramidal week for FTP & endurance development.
 * @param {number} weeklyHours
 * @param {string} startYmd
 * @param {string | null} phaseKey
 * @param {number} maxHardSessions
 * @returns {object[]}
 */
export function buildAerobicDevelopmentSkeleton(weeklyHours, startYmd, phaseKey, maxHardSessions = 1) {
    const hardStimulus = phaseKey === 'build' && maxHardSessions >= 2 ? 'sweetspot' : 'sweetspot';
    const includeSundayRecovery = weeklyHours >= 5;

    const workoutRows = [
        { day: 'Tuesday', stimulus: 'endurance', session: 'Z2 aerobic base' },
        { day: 'Thursday', stimulus: hardStimulus, session: SESSION_LABELS[hardStimulus] },
        { day: 'Saturday', stimulus: 'endurance', session: 'Long Z2 ride' },
    ];

    if (weeklyHours >= 5) {
        workoutRows.push({
            day: 'Wednesday',
            stimulus: 'recovery',
            session: 'Easy spin or rest',
        });
    }

    if (includeSundayRecovery) {
        workoutRows.push({
            day: 'Sunday',
            stimulus: 'recovery',
            session: 'Optional recovery spin',
        });
    }

    const workoutDays = new Map(workoutRows.map((row) => [row.day, row]));
    const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    return allDays.map((day, idx) => {
        const match = workoutDays.get(day);
        if (match) {
            return {
                day,
                date: addDay(startYmd, idx),
                stimulus: match.stimulus,
                session: match.session,
                skeletonNote: 'Development week — more Z2, fewer hard days than your habit.',
            };
        }
        return { day, date: addDay(startYmd, idx), stimulus: 'rest', session: 'Rest' };
    });
}

/**
 * @param {object[]} sessions
 * @param {number} weeklyHours
 * @returns {number}
 */
export function sumSkeletonPlannedTss(sessions, weeklyHours) {
    return (sessions || [])
        .filter((s) => s.stimulus && s.stimulus !== 'rest')
        .reduce((sum, s) => sum + estimateSessionTss(s.stimulus, weeklyHours), 0);
}

/**
 * @param {object} params
 * @param {ReturnType<typeof resolveDevelopmentStrategy>} params.strategy
 * @param {number} params.weeklyHours
 * @param {string} params.startYmd
 * @param {string | null} [params.phaseKey]
 * @param {object[]} [params.activities]
 * @param {string} [params.referenceYmd]
 * @param {number} [params.recentWeeklyTss]
 * @param {object[]} params.baseSkeleton
 */
export function buildWeekSkeletonForStrategy({
    strategy,
    weeklyHours,
    startYmd,
    phaseKey,
    activities,
    referenceYmd,
    recentWeeklyTss,
    baseSkeleton,
}) {
    const pattern = analyzeRidingPattern(activities, referenceYmd || startYmd);
    const basePlanned = sumSkeletonPlannedTss(baseSkeleton, weeklyHours);

    if (strategy?.fluidSkeleton === 'aerobic-development') {
        const sessions = buildAerobicDevelopmentSkeleton(
            weeklyHours,
            startYmd,
            phaseKey,
            strategy.maxHardSessions,
        );
        return {
            sessions,
            pattern,
            plannedTss: sumSkeletonPlannedTss(sessions, weeklyHours),
            developmentMode: strategy.mode,
            developmentRationale: strategy.rationale,
            targetAligned: true,
        };
    }

    return {
        sessions: baseSkeleton,
        pattern,
        plannedTss: basePlanned,
        developmentMode: strategy?.mode || 'progress',
        developmentRationale: strategy?.rationale || null,
        targetAligned: false,
    };
}