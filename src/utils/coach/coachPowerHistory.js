/**
 * Long-term FTP / power peak context for coach Q&A.
 */

import { computeYearlyPowerPeakRows, computePowerLongevitySummary } from '../powerTrendSeries';

/**
 * @param {object[]} activities
 * @param {object} userSettings
 * @param {number} ftp
 */
export function buildCoachPowerHistory(activities, userSettings, ftp = 0) {
    const weight = Number(userSettings?.weight) || 0;
    const rows = computeYearlyPowerPeakRows(activities, ftp, weight);
    const longevity = computePowerLongevitySummary(rows);
    const withPower = rows.filter((r) => r.eftp20 || r.best20min);

    return {
        yearlyPeaks: withPower.map((r) => ({
            year: r.year,
            eftp20: r.eftp20,
            best20min: r.best20min,
            best60min: r.best60min,
            rideCount: r.rideCount,
        })),
        longevity,
        earliestYear: withPower[0]?.year ?? null,
        latestYear: withPower[withPower.length - 1]?.year ?? null,
        yearsWithPowerData: withPower.length,
    };
}

/**
 * @param {ReturnType<typeof buildCoachPowerHistory>} powerHistory
 * @param {number} yearsAgo
 * @param {number} currentFtp
 */
export function compareFtpYearsAgo(powerHistory, yearsAgo, currentFtp) {
    const currentYear = new Date().getFullYear();
    const targetYear = currentYear - yearsAgo;
    const peaks = powerHistory?.yearlyPeaks || [];
    const thenRow = peaks.find((r) => r.year === targetYear);
    const nowRow = peaks.find((r) => r.year === currentYear);

    const eftpThen = thenRow?.eftp20 ?? null;
    const eftpNow = nowRow?.eftp20 ?? (currentFtp > 0 ? currentFtp : null);

    if (!peaks.length) {
        return {
            ok: false,
            reason: 'no_data',
            message: 'No historical power peaks found in your activity log. Import older rides with best 20-min / 60-min power fields to enable year-over-year FTP comparisons.',
        };
    }

    if (!eftpThen) {
        const availableYears = peaks.map((r) => r.year).join(', ');
        return {
            ok: false,
            reason: 'missing_year',
            targetYear,
            availableYears,
            message: `I don't have power data from ${targetYear}. Available years: ${availableYears}.`,
        };
    }

    if (!eftpNow) {
        return {
            ok: false,
            reason: 'no_current',
            targetYear,
            eftpThen,
            message: `I found ${targetYear} data (est. eFTP ~${eftpThen}W) but no reliable current-year peak yet. Set FTP in Settings or log a recent ride with power.`,
        };
    }

    const delta = eftpNow - eftpThen;
    const pct = Math.round((delta / eftpThen) * 100);

    return {
        ok: true,
        targetYear,
        currentYear,
        eftpThen,
        eftpNow,
        delta,
        pct,
        thenRideCount: thenRow.rideCount,
        nowRideCount: nowRow?.rideCount ?? 0,
    };
}

/**
 * Parse "5 years ago", "3 year", etc. from a question.
 * @param {string} question
 * @returns {number | null}
 */
export function parseYearsAgoFromQuestion(question) {
    const q = String(question || '').toLowerCase();
    const match = q.match(/(\d+)\s*years?\s*ago/);
    if (match) return Number(match[1]);
    if (q.includes('five years') || q.includes('5 years')) return 5;
    if (q.includes('ten years') || q.includes('10 years')) return 10;
    if (q.includes('long term') || q.includes('long-term') || q.includes('over the years')) return 5;
    return null;
}
