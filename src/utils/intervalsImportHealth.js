/**
 * Post-normalize health metrics for Intervals.icu import feedback.
 * Helps explain "sync succeeded but columns look empty" without field-level UI.
 */

const BEST_POWER_KEYS = [
    'best_1min',
    'best_5min',
    'best_10min',
    'best_20min',
    'best_60min',
    'best_90min',
    'best_120min',
    'best_150min',
    'best_180min',
];

function positiveNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0;
}

function isRideLikeActivity(activity) {
    const type = String(activity?.type || '').toLowerCase();
    if (!type) return true;
    return type.includes('ride') || type === 'workout' || type === 'indoorcycling';
}

/**
 * @param {object[]} activities normalized rows after sport + empty filters
 * @returns {{
 *   rideCount: number,
 *   missingNormPower: number,
 *   missingAvgPower: number,
 *   missingLoad: number,
 *   missingDistance: number,
 *   missingMovingTime: number,
 *   missingBestPowerCurve: number,
 * }}
 */
export function analyzeIntervalsImportHealth(activities) {
    const list = activities || [];
    let rideCount = 0;
    let missingNormPower = 0;
    let missingAvgPower = 0;
    let missingLoad = 0;
    let missingDistance = 0;
    let missingMovingTime = 0;
    let missingBestPowerCurve = 0;

    for (const act of list) {
        if (!isRideLikeActivity(act)) continue;
        rideCount += 1;

        const hasNp = positiveNumber(act.norm_power);
        const hasAvg = positiveNumber(act.avg_power);
        if (!hasNp && !hasAvg) {
            missingNormPower += 1;
            missingAvgPower += 1;
        } else if (!hasNp) {
            missingNormPower += 1;
        } else if (!hasAvg) {
            missingAvgPower += 1;
        }

        if (!positiveNumber(act.load)) missingLoad += 1;
        if (!positiveNumber(act.distance)) missingDistance += 1;
        if (!positiveNumber(act.moving_time)) missingMovingTime += 1;

        const hasAnyBest = BEST_POWER_KEYS.some((key) => positiveNumber(act[key]));
        if (!hasAnyBest) missingBestPowerCurve += 1;
    }

    return {
        rideCount,
        missingNormPower,
        missingAvgPower,
        missingLoad,
        missingDistance,
        missingMovingTime,
        missingBestPowerCurve,
    };
}

/**
 * @param {ReturnType<typeof analyzeIntervalsImportHealth> | null | undefined} health
 * @returns {string[]}
 */
export function formatIntervalsImportHealthParts(health) {
    if (!health || health.rideCount <= 0) return [];

    const parts = [];
    if (health.missingNormPower > 0 && health.missingAvgPower > 0 && health.missingNormPower === health.rideCount) {
        parts.push(`${health.missingNormPower} ride(s) missing power (NP & avg)`);
    } else {
        if (health.missingNormPower > 0) {
            parts.push(`${health.missingNormPower} missing NP`);
        }
        if (health.missingAvgPower > 0 && health.missingAvgPower !== health.missingNormPower) {
            parts.push(`${health.missingAvgPower} missing avg power`);
        }
    }
    if (health.missingLoad > 0) parts.push(`${health.missingLoad} missing load/TSS`);
    if (health.missingDistance > 0) parts.push(`${health.missingDistance} missing distance`);
    if (health.missingMovingTime > 0) parts.push(`${health.missingMovingTime} missing duration`);
    if (health.missingBestPowerCurve > 0) {
        parts.push(`${health.missingBestPowerCurve} missing power-curve bests`);
    }
    return parts;
}
