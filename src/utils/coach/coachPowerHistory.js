/**
 * Long-term FTP / power peak context for coach Q&A.
 */

import { normalizeDate } from '../formatters';
import { DASHBOARD_FTP_CAPS } from '../dashboardActivityPeaks';
import { computeYearlyPowerPeakRows, computePowerLongevitySummary } from '../powerTrendSeries';

function capForKey(key, manualFtp) {
    const mult = DASHBOARD_FTP_CAPS[key];
    if (!mult) return 1500;
    return manualFtp > 0 ? manualFtp * mult : 1500;
}

/**
 * Top N per-calendar-year efforts for a stored power field (best_60min, best_20min, …).
 * @param {object[]} activities
 * @param {number} [manualFtp]
 * @param {'best_60min' | 'best_20min'} field
 * @param {number} [limit]
 * @param {number} [maxYears]
 */
export function buildTopPowerEffortsByYear(activities, manualFtp = 0, field = 'best_60min', limit = 10, maxYears = 12) {
    const cap = capForKey(field, manualFtp);
    /** @type {Map<number, { watts: number, date: string, title: string, id: string | null }[]>} */
    const byYear = new Map();

    for (const a of activities || []) {
        const ymd = normalizeDate(a?.date);
        if (!ymd) continue;
        const year = parseInt(ymd.slice(0, 4), 10);
        if (!Number.isFinite(year)) continue;
        const watts = Number(a[field]) || 0;
        if (watts <= 0 || watts > cap) continue;

        if (!byYear.has(year)) byYear.set(year, []);
        byYear.get(year).push({
            watts: Math.round(watts),
            date: ymd,
            title: a.title || 'Ride',
            id: a.id || null,
        });
    }

    const years = [...byYear.keys()].sort((a, b) => b - a).slice(0, maxYears);
    /** @type {Record<number, { watts: number, date: string, title: string, id: string | null }[]>} */
    const result = {};
    for (const year of years) {
        result[year] = byYear.get(year)
            .sort((a, b) => b.watts - a.watts || b.date.localeCompare(a.date))
            .slice(0, limit);
    }

    return {
        byYear: result,
        availableYears: [...byYear.keys()].sort((a, b) => a - b),
    };
}

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
    const top60 = buildTopPowerEffortsByYear(activities, ftp, 'best_60min', 10);
    const top20 = buildTopPowerEffortsByYear(activities, ftp, 'best_20min', 10);

    return {
        yearlyPeaks: withPower.map((r) => ({
            year: r.year,
            eftp20: r.eftp20,
            best20min: r.best20min,
            best60min: r.best60min,
            rideCount: r.rideCount,
        })),
        top60minByYear: top60.byYear,
        top20minByYear: top20.byYear,
        yearsWithTop60min: top60.availableYears,
        yearsWithTop20min: top20.availableYears,
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

/**
 * @param {string} question
 * @returns {number | null}
 */
export function parseYearFromQuestion(question) {
    const match = String(question || '').match(/\b(20\d{2})\b/);
    return match ? Number(match[1]) : null;
}

/**
 * @param {string} question
 * @returns {number}
 */
export function parseTopLimitFromQuestion(question) {
    const q = String(question || '').toLowerCase();
    if (/\b(10|ten)\b/.test(q) && /\b(top|best)\b/.test(q)) return 10;
    if (/\b(5|five)\b/.test(q) && /\b(top|best)\b/.test(q)) return 5;
    const m = q.match(/\btop\s+(\d+)\b/);
    if (m) return Number(m[1]);
    const m2 = q.match(/\b(\d+)\s+best\b/);
    if (m2) return Number(m2[1]);
    return 10;
}

/**
 * @param {string} question
 * @returns {'best_60min' | 'best_20min'}
 */
export function parsePowerFieldFromQuestion(question) {
    const q = String(question || '').toLowerCase();
    if (/\b20[\s-]?min/.test(q) || q.includes('twenty minute')) return 'best_20min';
    if (/\b60[\s-]?min/.test(q) || q.includes('sixty minute') || q.includes('1 hour') || q.includes('one hour')) {
        return 'best_60min';
    }
    return 'best_60min';
}

/**
 * @param {ReturnType<typeof buildCoachPowerHistory>} powerHistory
 * @param {number} year
 * @param {'best_60min' | 'best_20min'} field
 * @param {number} limit
 */
export function formatTopPowerEffortsAnswer(powerHistory, year, field = 'best_60min', limit = 10) {
    const source = field === 'best_20min' ? powerHistory?.top20minByYear : powerHistory?.top60minByYear;
    const label = field === 'best_20min' ? '20-minute' : '60-minute';
    const efforts = source?.[year] || [];

    if (!efforts.length) {
        const avail = field === 'best_20min'
            ? powerHistory?.yearsWithTop20min
            : powerHistory?.yearsWithTop60min;
        const yearsText = avail?.length ? avail.join(', ') : 'none in your log';
        return `No ${label} power efforts found for ${year}. Years with per-ride ${label} data: ${yearsText}.`;
    }

    const lines = efforts.slice(0, limit).map((row, index) =>
        `${index + 1}. ${row.watts}W — ${row.date}${row.title ? ` (${row.title})` : ''}`,
    );

    const peak = powerHistory?.yearlyPeaks?.find((r) => r.year === year);
    const peakNote = peak?.best60min && field === 'best_60min'
        ? `\n\nCalendar-year peak (same source): ${peak.best60min}W.`
        : '';

    return `Top ${Math.min(limit, efforts.length)} ${label} efforts in ${year}:\n${lines.join('\n')}${peakNote}`;
}
