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
 * Whether to prioritise FTP/endurance development over ramping habitual TSS.
 * Uses recent 4-week TSS even when the activity log is sparse (e.g. mobile Goals tab).
 *
 * @param {object} pattern
 * @param {number} recentWeeklyTss
 * @returns {boolean}
 */
export function shouldPrioritizeDevelopment(pattern, recentWeeklyTss) {
    const recent = Number(recentWeeklyTss) || 0;
    const avgPerRide = pattern?.avgTssPerRide ?? 0;
    const ridesPerWeek = pattern?.ridesPerWeek ?? 0;

    if (recent >= 340) return true;
    if (recent >= 300 && avgPerRide >= 80) return true;
    if (recent >= 280 && ridesPerWeek >= 3.5) return true;
    return isIntensityHeavyHabit(pattern);
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
    const intensityHeavy = shouldPrioritizeDevelopment(pattern, recentWeeklyTss);

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
            fluidSkeleton: 'aerobic-development',
            maxHardSessions: 0,
            rationale: null,
            showLowerTssNote: false,
        };
    }

    if (phaseKey === 'specific') {
        return {
            mode: 'event-prep',
            macroStartMultiplier: 0.88,
            macroPeakMultiplier: 0.95,
            fluidSkeleton: 'aerobic-development',
            maxHardSessions: 2,
            rationale:
                'Event-specific phase: race-pace touches while keeping overall load below your recent habit.',
            showLowerTssNote: false,
        };
    }

    const recentRounded = Math.round(Number(recentWeeklyTss) || 0);

    if (phaseKey === 'build') {
        const rationale = recentRounded >= 280
            ? `Build phase with ~${recentRounded} TSS/week in your log: one quality day plus longer Z2 blocks. This week's target stays below that habit so aerobic fitness can catch up before more intensity.`
            : 'Build phase: one quality day per week plus longer Z2 — weekly TSS stays below your recent habit so aerobic fitness can catch up.';
        return {
            mode: 'develop-aerobic',
            macroStartMultiplier: 0.82,
            macroPeakMultiplier: 0.90,
            fluidSkeleton: 'aerobic-development',
            maxHardSessions: 1,
            rationale,
            showLowerTssNote: true,
        };
    }

    const rationale = recentRounded >= 280
        ? `Your recent load averages ~${recentRounded} TSS/week — high for sustainable aerobic development. The plan shifts time into steady Z2 (60–90 min sessions) and caps hard days at one, so FTP and endurance can rise without stacking fatigue.`
        : 'Your recent weekly load is high. To raise FTP and endurance, the plan uses more Z2 volume and fewer hard rides — weekly TSS is intentionally lower than what you are used to.';

    return {
        mode: 'develop-aerobic',
        macroStartMultiplier: 0.78,
        macroPeakMultiplier: 0.88,
        fluidSkeleton: 'aerobic-development',
        maxHardSessions: 1,
        rationale,
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
