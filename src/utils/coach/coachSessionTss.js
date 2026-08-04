/**
 * Estimated TSS per planned session stimulus (for forecast charts).
 * Based on typical duration × intensity from fluid workout templates.
 */

/**
 * @param {string} stimulus
 * @param {number} [weeklyHours]
 * @returns {number}
 */
export function estimateSessionTss(stimulus, weeklyHours = 5) {
    if (!stimulus || stimulus === 'rest' || stimulus === 'completed') return 0;

    if (stimulus === 'recovery') return 35;

    if (stimulus === 'endurance') {
        if (weeklyHours <= 4) return 55;
        if (weeklyHours <= 5) return 70;
        if (weeklyHours <= 6) return 85;
        return 95;
    }

    const byStimulus = {
        sweetspot: 78,
        threshold: 88,
        vo2: 82,
    };

    return byStimulus[stimulus] ?? 50;
}

/**
 * @param {object} session — week plan session row
 * @param {number} weeklyHours
 * @param {object} [actualTssByDate] — map date → actual TSS when logged
 * @returns {number}
 */
export function resolveSessionTssForForecast(session, weeklyHours, actualTssByDate = {}) {
    const date = session?.date;
    if (date && actualTssByDate[date] != null) {
        return actualTssByDate[date];
    }
    if (session?.completed) return 0;
    const stimulus = session?.plannedStimulus || session?.stimulus;
    return estimateSessionTss(stimulus, weeklyHours);
}
