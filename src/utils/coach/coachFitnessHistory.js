/**
 * Compact CTL/ATL/TSB history for the AI Coach LLM context.
 */

import { addDaysToYmd } from '../dashboardVolumeTotals';
import { todayYmd } from './coachHelpers';

function round1(n) {
    return Math.round(n * 10) / 10;
}

/**
 * @param {object[]} series — sorted [{ date, ctl, atl, tsb }]
 * @param {string} endYmd
 * @param {number} days
 * @returns {object[]}
 */
function sliceLastDays(series, endYmd, days) {
    const startYmd = addDaysToYmd(endYmd, -(days - 1));
    return series.filter((row) => row.date >= startYmd && row.date <= endYmd);
}

/**
 * One snapshot per ISO week (Sunday = last day of week in series).
 * @param {object[]} series
 * @param {number} maxWeeks
 * @returns {object[]}
 */
function weeklySnapshots(series, maxWeeks = 26) {
    const byWeek = new Map();
    for (const row of series) {
        const dt = new Date(`${row.date}T12:00:00`);
        const day = dt.getDay();
        const diffToSunday = day === 0 ? 0 : 7 - day;
        const sunday = addDaysToYmd(row.date, diffToSunday);
        byWeek.set(sunday, {
            weekEnd: sunday,
            ctl: row.ctl,
            atl: row.atl,
            tsb: row.tsb,
        });
    }
    return Array.from(byWeek.values())
        .sort((a, b) => a.weekEnd.localeCompare(b.weekEnd))
        .slice(-maxWeeks);
}

/**
 * @param {object[]} series
 * @param {string} endYmd
 * @param {number} days
 * @returns {object}
 */
function summaryForWindow(series, endYmd, days = 90) {
    const window = sliceLastDays(series, endYmd, days);
    if (window.length === 0) {
        return { days: 0, tsbMin: null, tsbMax: null, tsbAvg: null, negativeTsbDays: 0, ctlChange: null };
    }

    const tsbValues = window.map((r) => r.tsb).filter((v) => v != null);
    const tsbMin = tsbValues.length ? Math.min(...tsbValues) : null;
    const tsbMax = tsbValues.length ? Math.max(...tsbValues) : null;
    const tsbAvg = tsbValues.length
        ? round1(tsbValues.reduce((s, v) => s + v, 0) / tsbValues.length)
        : null;
    const negativeTsbDays = tsbValues.filter((v) => v < 0).length;

    const firstCtl = window[0]?.ctl;
    const lastCtl = window[window.length - 1]?.ctl;
    const ctlChange = firstCtl != null && lastCtl != null ? round1(lastCtl - firstCtl) : null;

    return {
        days: window.length,
        tsbMin: tsbMin != null ? round1(tsbMin) : null,
        tsbMax: tsbMax != null ? round1(tsbMax) : null,
        tsbAvg,
        negativeTsbDays,
        ctlChange,
    };
}

/**
 * @param {object[]} series — [{ date, ctl, atl, tsb }]
 * @param {object} [options]
 * @param {string} [options.source]
 * @param {string} [options.endYmd]
 * @returns {object | null}
 */
export function buildFitnessHistoryForCoach(series, options = {}) {
    if (!series?.length) return null;

    const endYmd = options.endYmd || series[series.length - 1].date || todayYmd();
    const dailyLast14d = sliceLastDays(series, endYmd, 14).map((row) => ({
        date: row.date,
        ctl: row.ctl,
        atl: row.atl,
        tsb: row.tsb,
    }));
    const weeklyLast26w = weeklySnapshots(series, 26);
    const summary90d = summaryForWindow(series, endYmd, 90);

    return {
        source: options.source || 'local',
        rangeStart: series[0].date,
        rangeEnd: endYmd,
        dailyLast14d,
        weeklyLast26w,
        summary90d,
    };
}

/**
 * @param {object} currentFitness — coachContext.fitness snapshot
 * @param {object[]} wellnessRows — normalized intervals wellness rows
 * @returns {object}
 */
export function mergeIntervalsFitnessSnapshot(currentFitness, wellnessRows) {
    if (!wellnessRows?.length) return currentFitness;
    const latest = wellnessRows[wellnessRows.length - 1];
    return {
        ...currentFitness,
        ctl: latest.ctl ?? currentFitness.ctl,
        atl: latest.atl ?? currentFitness.atl,
        tsb: latest.tsb ?? currentFitness.tsb,
        asOfDate: latest.date ?? currentFitness.asOfDate,
        source: 'intervals.icu',
    };
}
