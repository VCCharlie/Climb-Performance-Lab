/**
 * CTL / ATL / TSB progression for Dashboard Form tab, Coach forecast, and Recovery.
 * Uses YMD string iteration (no per-day Date allocation in the hot loop).
 * Single source of truth: exponential decay (42d CTL / 7d ATL).
 */

import { normalizeDate } from './formatters';
import { addDaysToYmd } from './dashboardVolumeTotals';
import { todayYmd } from './coach/coachHelpers';

const CTL_DAYS = 42;
const ATL_DAYS = 7;

function ymdToLocalTime(ymd) {
    if (!ymd || ymd.length < 10) return 0;
    const [y, m, d] = ymd.split('-').map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return 0;
    return new Date(y, m - 1, d).getTime();
}

function round1(n) {
    return Math.round(n * 10) / 10;
}

/**
 * @param {object[]} activities
 * @returns {Record<string, number>}
 */
export function buildTssByDate(activities) {
    const tssMap = {};
    for (const a of activities || []) {
        const ymd = normalizeDate(a?.date);
        const load = Number(a?.load) || 0;
        if (!ymd || ymd.length < 10 || load <= 0) continue;
        tssMap[ymd] = (tssMap[ymd] || 0) + load;
    }
    return tssMap;
}

/**
 * Limit CTL warmup: start iteration at displayStart − CTL window instead of first-ever activity.
 * @param {string} firstYmd
 * @param {string | undefined} displayStartYmd
 * @returns {string}
 */
function resolveFitnessComputeStartYmd(firstYmd, displayStartYmd) {
    if (!displayStartYmd || displayStartYmd <= firstYmd) return firstYmd;
    const warmupYmd = addDaysToYmd(displayStartYmd, -CTL_DAYS);
    if (!warmupYmd) return firstYmd;
    return warmupYmd > firstYmd ? warmupYmd : firstYmd;
}

/**
 * @param {Record<string, number>} tssMap
 * @param {string} startYmd
 * @param {string} endYmd
 * @returns {Array<{ date: string, dateNum: number, ctl: number, atl: number, tsb: number }>}
 */
function iterateFitnessRows(tssMap, startYmd, endYmd) {
    const ctlFactor = 1 - Math.exp(-1 / CTL_DAYS);
    const atlFactor = 1 - Math.exp(-1 / ATL_DAYS);

    let ctl = 0;
    let atl = 0;
    const result = [];

    let currentYmd = startYmd;
    while (currentYmd <= endYmd) {
        const tss = tssMap[currentYmd] || 0;
        ctl += ctlFactor * (tss - ctl);
        atl += atlFactor * (tss - atl);
        const tsb = ctl - atl;

        result.push({
            date: currentYmd,
            dateNum: ymdToLocalTime(currentYmd),
            ctl: round1(ctl),
            atl: round1(atl),
            tsb: round1(tsb),
        });

        const nextYmd = addDaysToYmd(currentYmd, 1);
        if (!nextYmd) break;
        currentYmd = nextYmd;
    }

    return result;
}

/**
 * @param {object[]} activities — activities with load/TSS
 * @param {{ endYmd?: string, startYmd?: string }} [options]
 *   endYmd — extend through this date with 0 TSS on rest days (e.g. today)
 *   startYmd — filter output rows from this date onward (computation still warms from first activity)
 * @returns {Array<{ date: string, dateNum: number, ctl: number, atl: number, tsb: number }>}
 */
export function calculateFitnessMetrics(activities, options = {}) {
    if (!activities?.length) return [];

    const tssMap = buildTssByDate(activities);
    const sortedDates = Object.keys(tssMap).sort();
    if (sortedDates.length === 0) return [];

    const firstYmd = sortedDates[0];
    const lastActivityYmd = sortedDates[sortedDates.length - 1];
    const endYmd = options.endYmd && options.endYmd >= firstYmd
        ? options.endYmd
        : lastActivityYmd;

    const computeStartYmd = resolveFitnessComputeStartYmd(firstYmd, options.startYmd);
    const rows = iterateFitnessRows(tssMap, computeStartYmd, endYmd);

    if (options.startYmd) {
        return rows.filter((row) => row.date >= options.startYmd);
    }

    return rows;
}

/**
 * CTL/ATL/TSB on a specific calendar day (extends through asOfYmd with 0 TSS rest days).
 * @param {object[]} activities
 * @param {string} [asOfYmd]
 * @returns {{ date: string, ctl: number, atl: number, tsb: number } | null}
 */
export function getFitnessAtDate(activities, asOfYmd = todayYmd()) {
    const rows = calculateFitnessMetrics(activities, { endYmd: asOfYmd });
    if (!rows.length) return null;
    return rows.find((row) => row.date === asOfYmd) || rows[rows.length - 1];
}

/**
 * Chart series for a date window plus a consistent "current" snapshot (usually today).
 * @param {object[]} activities
 * @param {{ displayStartYmd?: string, displayEndYmd?: string, asOfYmd?: string }} [options]
 */
export function buildFitnessSeriesForRange(activities, options = {}) {
    const tssMap = buildTssByDate(activities);
    const sortedDates = Object.keys(tssMap).sort();
    if (!sortedDates.length) {
        return { chartData: [], current: null };
    }

    const firstYmd = sortedDates[0];
    const asOfYmd = options.asOfYmd || todayYmd();
    const displayEndYmd = options.displayEndYmd || asOfYmd;
    const displayStartYmd = options.displayStartYmd || addDaysToYmd(displayEndYmd, -90);
    const computeEndYmd = asOfYmd >= displayEndYmd ? asOfYmd : displayEndYmd;
    const computeStartYmd = resolveFitnessComputeStartYmd(firstYmd, displayStartYmd);

    const allRows = iterateFitnessRows(tssMap, computeStartYmd, computeEndYmd);
    const chartData = allRows
        .filter((row) => row.date >= displayStartYmd && row.date <= displayEndYmd)
        .map((row) => ({
            ...row,
            load: tssMap[row.date] || 0,
        }));

    const current = allRows.find((row) => row.date === asOfYmd) || allRows[allRows.length - 1];

    return { chartData, current };
}
