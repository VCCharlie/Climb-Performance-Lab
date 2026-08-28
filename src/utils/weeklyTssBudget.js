/**
 * Weekly TSS budget vs actual — lightweight coach summary.
 */
import { buildWeeklyLoadSnapshot, computeWeeklyTssOptimalBand } from './trainingStatusOverview';

/**
 * @param {object} params
 * @param {object[]} params.activities
 * @param {object} [params.userSettings]
 * @param {string} [params.referenceYmd]
 */
export function buildWeeklyTssBudgetSummary({
    activities,
    userSettings,
    referenceYmd,
}) {
    const snapshot = buildWeeklyLoadSnapshot({ activities, userSettings, referenceYmd });
    const band = computeWeeklyTssOptimalBand(snapshot.targetTss);
    const remaining = Math.max(0, snapshot.targetTss - snapshot.actualTss);
    const overBy = Math.max(0, snapshot.actualTss - snapshot.targetTss);

    let status = 'on-track';
    if (snapshot.targetTss <= 0) {
        status = 'no-target';
    } else if (snapshot.actualTss > band.max) {
        status = 'over';
    } else if (snapshot.actualTss < band.min) {
        status = 'under';
    }

    return {
        ...snapshot,
        optimalBand: band,
        remainingTss: remaining,
        overByTss: overBy,
        status,
    };
}
