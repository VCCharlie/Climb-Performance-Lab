/**
 * Training philosophy: develop FTP/endurance vs. repeating habitual load patterns.
 * When recent riding is intense and frequent, we deliberately shift toward aerobic
 * base work — lower weekly TSS is OK if structure improves long-term fitness.
 */

/**
 * @param {import('./coachRidingPattern').analyzeRidingPattern extends Function ? ReturnType<import('./coachRidingPattern').analyzeRidingPattern> : object} pattern
 * @returns {boolean}
 */
export function isIntensityHeavyHabit(pattern) {
    if (!pattern || pattern.totalRides < 4) return false;
    return pattern.intensityBias === 'intensity'
        && pattern.ridesPerWeek >= 3
        && pattern.avgWeeklyTss >= 300
        && (pattern.avgTssPerRide ?? 0) >= 90;
}

/**
 * @param {object} pattern
 * @param {number} recentWeeklyTss — 4-week average from goal planner
 * @param {string | null | undefined} phaseKey — base | build | specific | taper
 * @returns {{
 *   mode: 'progress' | 'develop-aerobic' | 'event-prep',
 *   macroStartMultiplier: number,
 *   macroPeakMultiplier: number,
 *   fluidSkeleton: 'default' | 'aerobic-development',
 *   maxHardSessions: number,
 *   rationale: string | null,
 *   showLowerTssNote: boolean,
 * }}
 */
export function resolveDevelopmentStrategy(pattern, recentWeeklyTss, phaseKey) {
    const intensityHeavy = isIntensityHeavyHabit(pattern)
        || (recentWeeklyTss >= 350 && pattern?.intensityBias === 'intensity');

    if (!intensityHeavy) {
        return {
            mode: 'progress',
            macroStartMultiplier: 1,
            macroPeakMultiplier: 1.08,
            fluidSkeleton: 'default',
            maxHardSessions: 2,
            rationale: null,
            showLowerTssNote: false,
        };
    }

    if (phaseKey === 'taper') {
        return {
            mode: 'event-prep',
            macroStartMultiplier: 0.55,
            macroPeakMultiplier: 0.35,
            fluidSkeleton: 'default',
            maxHardSessions: 0,
            rationale: null,
            showLowerTssNote: false,
        };
    }

    if (phaseKey === 'specific') {
        return {
            mode: 'event-prep',
            macroStartMultiplier: 0.92,
            macroPeakMultiplier: 1,
            fluidSkeleton: 'default',
            maxHardSessions: 2,
            rationale:
                'Event-specific phase: some harder work is fine, but the plan avoids stacking more intense days than you already habitually ride.',
            showLowerTssNote: false,
        };
    }

    if (phaseKey === 'build') {
        return {
            mode: 'develop-aerobic',
            macroStartMultiplier: 0.85,
            macroPeakMultiplier: 0.92,
            fluidSkeleton: 'aerobic-development',
            maxHardSessions: 1,
            rationale:
                'Build phase: one quality day per week plus longer Z2 — weekly TSS stays below your recent habit so aerobic fitness can catch up.',
            showLowerTssNote: true,
        };
    }

    return {
        mode: 'develop-aerobic',
        macroStartMultiplier: 0.78,
        macroPeakMultiplier: 0.88,
        fluidSkeleton: 'aerobic-development',
        maxHardSessions: 1,
        rationale:
            'Your recent training is intense and frequent. To raise FTP and endurance, the plan uses more Z2 volume and fewer hard rides — weekly TSS is intentionally lower than what you are used to.',
        showLowerTssNote: true,
    };
}

/**
 * Apply development multipliers to macro weekly TSS targets.
 * @param {number} recentWeeklyTss
 * @param {ReturnType<typeof resolveDevelopmentStrategy>} strategy
 * @param {string | null} phaseKey
 * @param {number} weekIndex — 0-based
 * @param {number} buildWeeks
 * @returns {number}
 */
export function developmentAdjustedWeekTss(
    recentWeeklyTss,
    strategy,
    phaseKey,
    weekIndex,
    buildWeeks,
) {
    const start = Math.max(80, recentWeeklyTss || 120);

    if (strategy.mode === 'progress') {
        return null;
    }

    if (phaseKey === 'taper') {
        const devPeak = Math.round(start * (strategy.macroPeakMultiplier || 0.88));
        const taperIdx = weekIndex - buildWeeks;
        return taperIdx === 0
            ? Math.round(devPeak * 0.55)
            : Math.round(devPeak * 0.35);
    }

    const floor = Math.round(start * strategy.macroStartMultiplier);
    const peak = Math.round(start * strategy.macroPeakMultiplier);

    if (buildWeeks <= 1) return peak;

    const t = weekIndex / Math.max(1, buildWeeks - 1);
    return Math.round(floor + (peak - floor) * t);
}
