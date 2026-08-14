/**
 * Build week skeletons that can realistically hit a weekly TSS target,
 * using the athlete's recent riding pattern (few hard rides vs many Z2 rides).
 */

import { addDaysToYmd } from '../dashboardVolumeTotals';
import { estimateSessionTss } from './coachSessionTss';
import { analyzeRidingPattern, sessionCountForTarget } from './coachRidingPattern';

const DAY_SLOTS = {
    3: ['Tuesday', 'Thursday', 'Saturday'],
    4: ['Tuesday', 'Thursday', 'Saturday', 'Sunday'],
    5: ['Tuesday', 'Wednesday', 'Friday', 'Saturday', 'Sunday'],
    6: ['Monday', 'Tuesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
};

const SESSION_LABELS = {
    endurance: 'Z2 base',
    sweetspot: 'Sweetspot quality',
    threshold: 'Threshold work',
    vo2: 'VO2 intervals',
    recovery: 'Recovery spin',
    rest: 'Rest',
};

/**
 * TSS estimates tuned for intensity-biased riders (fewer, harder rides).
 * @param {string} stimulus
 * @returns {number}
 */
export function intensityBiasedSessionTss(stimulus) {
    const map = {
        recovery: 40,
        endurance: 75,
        sweetspot: 105,
        threshold: 125,
        vo2: 110,
    };
    return map[stimulus] ?? 80;
}

/**
 * @param {object[]} sessions — 7-day skeleton rows with stimulus
 * @param {number} weeklyHours
 * @param {'volume' | 'mixed' | 'intensity'} [intensityBias]
 * @returns {number}
 */
export function sumSkeletonPlannedTss(sessions, weeklyHours, intensityBias = 'volume') {
    return (sessions || [])
        .filter((s) => s.stimulus && s.stimulus !== 'rest')
        .reduce((sum, s) => {
            const est = intensityBias === 'intensity'
                ? intensityBiasedSessionTss(s.stimulus)
                : estimateSessionTss(s.stimulus, weeklyHours);
            return sum + est;
        }, 0);
}

/**
 * Greedy stimulus mix for a weekly TSS target.
 * @param {number} count
 * @param {number} targetTss
 * @param {string | null} phaseKey
 * @param {'volume' | 'mixed' | 'intensity'} intensityBias
 * @returns {string[]}
 */
export function allocateStimuliForTarget(count, targetTss, phaseKey, intensityBias) {
    const perSession = targetTss / Math.max(1, count);
    const useIntensity = intensityBias === 'intensity' || perSession >= 92;

    const pool = useIntensity
        ? ['threshold', 'sweetspot', 'sweetspot', 'endurance', 'vo2', 'recovery']
        : ['sweetspot', 'endurance', 'endurance', 'recovery', 'threshold', 'vo2'];

    if (phaseKey === 'taper') {
        return Array.from({ length: count }, (_, i) => (i === 0 ? 'sweetspot' : 'endurance')).slice(0, count);
    }
    if (phaseKey === 'base') {
        const basePool = useIntensity
            ? ['sweetspot', 'endurance', 'sweetspot', 'endurance', 'recovery']
            : ['endurance', 'sweetspot', 'endurance', 'recovery', 'endurance'];
        return pickGreedy(basePool, count, targetTss, true);
    }

    return pickGreedy(pool, count, targetTss, useIntensity);
}

function pickGreedy(pool, count, targetTss, useIntensityEstimates) {
    const chosen = [];
    let remaining = targetTss;

    for (let i = 0; i < count; i++) {
        const slotsLeft = count - i;
        const ideal = remaining / slotsLeft;
        let best = pool[i % pool.length];
        let bestDiff = Infinity;

        for (const stimulus of pool) {
            const est = useIntensityEstimates
                ? intensityBiasedSessionTss(stimulus)
                : estimateSessionTss(stimulus, 6);
            const diff = Math.abs(est - ideal);
            if (diff < bestDiff) {
                bestDiff = diff;
                best = stimulus;
            }
        }

        chosen.push(best);
        remaining -= useIntensityEstimates
            ? intensityBiasedSessionTss(best)
            : estimateSessionTss(best, 6);
    }

    return chosen;
}

function addDay(ymd, days) {
    return addDaysToYmd(ymd, days);
}

function dayIndex(dayName) {
    const names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return names.indexOf(dayName);
}

/**
 * @param {object} params
 * @param {number} params.weeklyHours
 * @param {string} params.startYmd — Monday
 * @param {number} params.targetTss
 * @param {object[]} [params.activities]
 * @param {string} [params.referenceYmd]
 * @param {string | null} [params.phaseKey]
 * @param {object[]} params.baseSkeleton — default hours-based skeleton
 * @returns {{ sessions: object[], pattern: object, plannedTss: number, targetAligned: boolean }}
 */
export function buildTargetAlignedSkeleton({
    weeklyHours,
    startYmd,
    targetTss,
    activities,
    referenceYmd,
    phaseKey,
    baseSkeleton,
}) {
    const pattern = analyzeRidingPattern(activities, referenceYmd || startYmd);
    const basePlanned = sumSkeletonPlannedTss(baseSkeleton, weeklyHours, pattern.intensityBias);

    if (!targetTss || targetTss <= basePlanned * 1.12) {
        return {
            sessions: baseSkeleton,
            pattern,
            plannedTss: basePlanned,
            targetAligned: false,
        };
    }

    const count = sessionCountForTarget(targetTss, pattern, weeklyHours);
    const perSession = targetTss / Math.max(1, count);
    const effectiveBias = pattern.intensityBias === 'intensity' || perSession >= 92
        ? 'intensity'
        : pattern.intensityBias;

    const dayNames = DAY_SLOTS[Math.min(6, Math.max(3, count))] || DAY_SLOTS[4];
    const stimuli = allocateStimuliForTarget(count, targetTss, phaseKey, effectiveBias);

    const workoutDays = new Map();
    dayNames.forEach((day, idx) => {
        const stimulus = stimuli[idx] || 'endurance';
        workoutDays.set(day, {
            stimulus,
            session: SESSION_LABELS[stimulus] || stimulus,
            targetNote: effectiveBias === 'intensity'
                ? 'Matched to your typical ride load (fewer, harder sessions).'
                : 'Scaled up to meet your weekly TSS goal.',
        });
    });

    const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const sessions = allDays.map((day, idx) => {
        const match = workoutDays.get(day);
        if (match) {
            return {
                day,
                date: addDay(startYmd, idx),
                stimulus: match.stimulus,
                session: match.session,
                skeletonNote: match.targetNote,
            };
        }
        return { day, date: addDay(startYmd, idx), stimulus: 'rest', session: 'Rest' };
    });

    const plannedTss = sumSkeletonPlannedTss(sessions, weeklyHours, effectiveBias);

    return {
        sessions,
        pattern: { ...pattern, effectiveBias },
        plannedTss,
        targetAligned: true,
    };
}
