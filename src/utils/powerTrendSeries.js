/**
 * Long-term power peaks per calendar year (and age when birth year is set).
 */

import { normalizeDate } from './formatters';
import { DASHBOARD_FTP_CAPS } from './dashboardActivityPeaks';

const MAX_DISPLAY_EFTP_W = 600;
const MIN_BIRTH_YEAR = 1930;

function capForKey(key, manualFtp) {
    const mult = DASHBOARD_FTP_CAPS[key];
    if (!mult) return 1500;
    return manualFtp > 0 ? manualFtp * mult : 1500;
}

function calendarYearFromActivity(activity) {
    const ymd = normalizeDate(activity?.date);
    if (!ymd || ymd.length < 4) return null;
    const y = parseInt(ymd.slice(0, 4), 10);
    return Number.isFinite(y) ? y : null;
}

/**
 * @param {number | null | undefined} birthYear
 * @param {number} calendarYear
 */
export function ageAtCalendarYear(birthYear, calendarYear) {
    const by = normalizeBirthYear(birthYear);
    if (!by || calendarYear < by) return null;
    return calendarYear - by;
}

/**
 * @param {number | string | null | undefined} birthYear
 * @param {Date} [referenceDate]
 */
export function normalizeBirthYear(birthYear, referenceDate = new Date()) {
    const y = parseInt(String(birthYear), 10);
    if (!Number.isFinite(y)) return null;
    const maxYear = referenceDate.getFullYear();
    if (y < MIN_BIRTH_YEAR || y > maxYear) return null;
    return y;
}

/**
 * Peak best_20min / best_60min per calendar year across all rides.
 * @param {object[]} activities
 * @param {number} [manualFtp]
 * @param {number} [weightKg]
 */
export function computeYearlyPowerPeakRows(activities, manualFtp = 0, weightKg = 0) {
    const cap20 = capForKey('best_20min', manualFtp);
    const cap60 = capForKey('best_60min', manualFtp);
    const buckets = new Map();

    for (const a of activities || []) {
        const year = calendarYearFromActivity(a);
        if (!year) continue;

        if (!buckets.has(year)) {
            buckets.set(year, {
                year,
                best20: 0,
                best60: 0,
                rideCount: 0,
                activity20: null,
                activity60: null,
            });
        }
        const bucket = buckets.get(year);
        bucket.rideCount += 1;

        const v20 = Number(a.best_20min) || 0;
        const v60 = Number(a.best_60min) || 0;

        if (v20 > 0 && v20 <= cap20) {
            if (v20 > bucket.best20) {
                bucket.best20 = v20;
                bucket.activity20 = a;
            } else if (
                v20 === bucket.best20
                && bucket.activity20
                && new Date(a.date) > new Date(bucket.activity20.date)
            ) {
                bucket.activity20 = a;
            }
        }

        if (v60 > 0 && v60 <= cap60) {
            if (v60 > bucket.best60) {
                bucket.best60 = v60;
                bucket.activity60 = a;
            } else if (
                v60 === bucket.best60
                && bucket.activity60
                && new Date(a.date) > new Date(bucket.activity60.date)
            ) {
                bucket.activity60 = a;
            }
        }
    }

    const weight = Number(weightKg) > 0 ? Number(weightKg) : 0;

    return [...buckets.values()]
        .sort((a, b) => a.year - b.year)
        .map((b) => {
            const best20min = b.best20 > 0 ? b.best20 : null;
            const best60min = b.best60 > 0 ? b.best60 : null;
            const eftp20 = best20min
                ? Math.min(Math.round(best20min * 0.95), MAX_DISPLAY_EFTP_W)
                : null;
            const eftpWkg = eftp20 && weight > 0 ? Number((eftp20 / weight).toFixed(2)) : null;
            const best20Wkg = best20min && weight > 0 ? Number((best20min / weight).toFixed(2)) : null;

            return {
                year: b.year,
                best20min,
                eftp20,
                best60min,
                eftpWkg,
                best20Wkg,
                rideCount: b.rideCount,
                activity20: b.activity20,
                activity60: b.activity60,
            };
        })
        .filter((r) => r.rideCount > 0);
}

/**
 * @param {ReturnType<typeof computeYearlyPowerPeakRows>} rows
 * @param {number | null} birthYear
 */
export function enrichYearlyPowerRowsWithAge(rows, birthYear) {
    const by = normalizeBirthYear(birthYear);
    if (!by) return rows.map((r) => ({ ...r, age: null, xLabel: String(r.year) }));

    return rows.map((r) => {
        const age = ageAtCalendarYear(by, r.year);
        return {
            ...r,
            age,
            xLabel: age != null ? `Age ${age}` : String(r.year),
        };
    });
}

/**
 * Snapshot for Overview longevity card.
 * @param {ReturnType<typeof computeYearlyPowerPeakRows>} rows
 * @param {Date} [referenceDate]
 */
export function computePowerLongevitySummary(rows, referenceDate = new Date()) {
    if (!rows?.length) return null;

    const refYear = referenceDate.getFullYear();
    const withEftp = rows.filter((r) => r.eftp20);
    if (!withEftp.length) return null;

    let peakRow = withEftp[0];
    for (const r of withEftp) {
        if ((r.eftp20 || 0) > (peakRow.eftp20 || 0)) peakRow = r;
    }

    const currentRow = rows.find((r) => r.year === refYear) || null;
    const currentEftp = currentRow?.eftp20 ?? null;
    const peakEftp = peakRow.eftp20;

    let pctVsPeakEftp20 = null;
    if (currentEftp != null && peakEftp != null && peakEftp > 0) {
        pctVsPeakEftp20 = ((currentEftp - peakEftp) / peakEftp) * 100;
    }

    return {
        peakYear: peakRow.year,
        peakEftp20: peakEftp,
        peakBest20min: peakRow.best20min,
        currentYear: refYear,
        currentEftp20: currentEftp,
        currentBest20min: currentRow?.best20min ?? null,
        currentRideCount: currentRow?.rideCount ?? 0,
        pctVsPeakEftp20,
        yearsWithPowerData: withEftp.length,
    };
}

/**
 * Chart rows with xKey for Recharts (year or age).
 * @param {ReturnType<typeof enrichYearlyPowerRowsWithAge>} rows
 * @param {'year' | 'age'} xMode
 */
export function chartRowsForPowerLongevity(rows, xMode = 'year') {
    return rows.map((r) => ({
        ...r,
        xKey: xMode === 'age' && r.age != null ? r.age : r.year,
        xLabel: xMode === 'age' && r.age != null ? `Age ${r.age}` : String(r.year),
    }));
}
