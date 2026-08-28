/**
 * Configurable coach SWOT and recovery advisor thresholds (stored in userSettings).
 */

export const DEFAULT_COACH_THRESHOLDS = {
    /** Weekly TSS above which base fitness is flagged as strong. */
    highWeeklyLoadTss: 400,
    /** Weekly TSS below which volume increase is suggested. */
    lowWeeklyLoadTss: 100,
    /** Per 30-day reference: rides count for "high consistency" (>3×/week scaled). */
    consistencyHighPer30Days: 12,
    /** Per 30-day reference: rides count for "low frequency". */
    consistencyLowPer30Days: 4,
    /** Per 30-day reference: hard sessions (>90% FTP) for overload warning. */
    intensityHighPer30Days: 8,
    /** Per 30-day reference: minimum hard sessions before "lack of intensity". */
    intensityLowPer30Days: 2,
};

export const DEFAULT_RECOVERY_THRESHOLDS = {
    /** TSB below this triggers critical overtraining warning. */
    tsbCritical: -30,
    /** TSB below this triggers elevated fatigue caution. */
    tsbFatigue: -10,
    /** Lower bound of ideal race-day form band. */
    tsbRaceMin: 5,
    /** Upper bound of ideal race-day form band. */
    tsbRaceMax: 25,
    /** TSB above this suggests too much recovery / fitness loss risk. */
    tsbOverRecovered: 25,
    /** CTL weekly rise (points) flagged as positive progress. */
    ctlTrendUp: 5,
    /** CTL weekly drop (points) flagged as fitness loss. */
    ctlTrendDown: -5,
    /** Training monotony index above this triggers caution. */
    monotonyHigh: 2.5,
};

/**
 * @param {Record<string, unknown> | null | undefined} saved
 */
export function mergeCoachThresholds(saved) {
    return { ...DEFAULT_COACH_THRESHOLDS, ...(saved && typeof saved === 'object' ? saved : {}) };
}

/**
 * @param {Record<string, unknown> | null | undefined} saved
 */
export function mergeRecoveryThresholds(saved) {
    return { ...DEFAULT_RECOVERY_THRESHOLDS, ...(saved && typeof saved === 'object' ? saved : {}) };
}

/**
 * @param {Record<string, unknown> | null | undefined} userSettings
 */
export function resolveCoachThresholds(userSettings) {
    return mergeCoachThresholds(userSettings?.coachThresholds);
}

/**
 * @param {Record<string, unknown> | null | undefined} userSettings
 */
export function resolveRecoveryThresholds(userSettings) {
    return mergeRecoveryThresholds(userSettings?.recoveryThresholds);
}

/**
 * Scale per-30-day coach thresholds to the selected analysis period length.
 * @param {typeof DEFAULT_COACH_THRESHOLDS} thresholds
 * @param {number} periodDays
 */
export function scaleCoachPeriodThresholds(thresholds, periodDays) {
    const scale = Math.max(1, periodDays) / 30;
    return {
        consistencyHigh: Math.round(thresholds.consistencyHighPer30Days * scale),
        consistencyLow: Math.round(thresholds.consistencyLowPer30Days * scale),
        intensityHigh: Math.round(thresholds.intensityHighPer30Days * scale),
        intensityLow: Math.round(thresholds.intensityLowPer30Days * scale),
    };
}
