/**
 * CTL / ATL / TSB progression for Dashboard Form tab.
 * Uses YMD string iteration (no per-day Date allocation in the hot loop).
 */

import { normalizeDate } from './formatters';
import { addDaysToYmd } from './dashboardVolumeTotals';

const CTL_DAYS = 42;
const ATL_DAYS = 7;

function ymdToLocalTime(ymd) {
    if (!ymd || ymd.length < 10) return 0;
    const [y, m, d] = ymd.split('-').map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return 0;
    return new Date(y, m - 1, d).getTime();
}

/**
 * @param {object[]} activities — dashboard-filtered activities with load/TSS
 * @returns {Array<{ date: string, dateNum: number, ctl: number, atl: number, tsb: number }>}
 */
export function calculateFitnessMetrics(activities) {
    if (!activities?.length) return [];

    const tssMap = {};
    for (const a of activities) {
        const ymd = normalizeDate(a?.date);
        const load = Number(a?.load) || 0;
        if (!ymd || ymd.length < 10 || load <= 0) continue;
        tssMap[ymd] = (tssMap[ymd] || 0) + load;
    }

    const sortedDates = Object.keys(tssMap).sort();
    if (sortedDates.length === 0) return [];

    const startYmd = sortedDates[0];
    const endYmd = sortedDates[sortedDates.length - 1];
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
            ctl: Math.round(ctl * 10) / 10,
            atl: Math.round(atl * 10) / 10,
            tsb: Math.round(tsb * 10) / 10,
        });

        const nextYmd = addDaysToYmd(currentYmd, 1);
        if (!nextYmd) break;
        currentYmd = nextYmd;
    }

    return result;
}
