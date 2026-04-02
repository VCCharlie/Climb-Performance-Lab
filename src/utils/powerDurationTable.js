/**
 * Power-duration curve per activiteitenset (intervals.icu/power-achtig).
 * We hebben per rit: max_power, best_1/5/10/20/60 min — tussenliggende seconden log-interpoleren.
 */

import { DASHBOARD_FTP_CAPS } from './dashboardActivityPeaks';

const MS_DAY = 86400000;

/** Rij-label (weergave) → duur in seconden */
export const POWER_DURATION_ROWS = [
    { label: '5s', sec: 5 },
    { label: '15s', sec: 15 },
    { label: '30s', sec: 30 },
    { label: '1m', sec: 60 },
    { label: '2m', sec: 120 },
    { label: '3m', sec: 180 },
    { label: '4m', sec: 240 },
    { label: '5m', sec: 300 },
    { label: '6m', sec: 360 },
    { label: '8m', sec: 480 },
    { label: '10m', sec: 600 },
    { label: '12m', sec: 720 },
    { label: '15m', sec: 900 },
    { label: '20m', sec: 1200 },
    { label: '25m', sec: 1500 },
    { label: '30m', sec: 1800 },
    { label: '45m', sec: 2700 },
    { label: '1u', sec: 3600 },
    { label: '1u30', sec: 5400 },
    { label: '2u', sec: 7200 },
    { label: '3u', sec: 10800 },
];

function capMaxPowerW(w, manualFtp) {
    const n = Number(w) || 0;
    if (n <= 0) return 0;
    const cap = manualFtp > 0 ? manualFtp * 6 : 800;
    return Math.min(n, cap);
}

function capBestField(w, key, manualFtp) {
    const n = Number(w) || 0;
    if (n <= 0) return 0;
    const mult = DASHBOARD_FTP_CAPS[key];
    const cap = manualFtp > 0 && mult ? manualFtp * mult : 1500;
    return Math.min(n, cap);
}

/**
 * Bouwt ankers (sec, watt) uit activiteiten in één venster.
 */
export function buildPowerAnchors(activities, manualFtp) {
    if (!activities?.length) return [];

    let maxP = 0;
    let b1 = 0;
    let b5 = 0;
    let b10 = 0;
    let b20 = 0;
    let b60 = 0;

    for (const a of activities) {
        maxP = Math.max(maxP, capMaxPowerW(a.max_power, manualFtp));
        b1 = Math.max(b1, capBestField(a.best_1min, 'best_1min', manualFtp));
        b5 = Math.max(b5, capBestField(a.best_5min, 'best_5min', manualFtp));
        b10 = Math.max(b10, capBestField(a.best_10min, 'best_10min', manualFtp));
        b20 = Math.max(b20, capBestField(a.best_20min, 'best_20min', manualFtp));
        b60 = Math.max(b60, capBestField(a.best_60min, 'best_60min', manualFtp));
    }

    const anchors = [];
    if (maxP > 0) anchors.push({ sec: 1, w: maxP });
    if (b1 > 0) anchors.push({ sec: 60, w: b1 });
    if (b5 > 0) anchors.push({ sec: 300, w: b5 });
    if (b10 > 0) anchors.push({ sec: 600, w: b10 });
    if (b20 > 0) anchors.push({ sec: 1200, w: b20 });
    if (b60 > 0) anchors.push({ sec: 3600, w: b60 });

    return anchors.sort((a, b) => a.sec - b.sec);
}

/**
 * Watt op tijd t (s) via log-lineaire interpolatie tussen ankers.
 */
export function interpolatePowerAt(anchors, tSec) {
    if (!anchors.length || tSec <= 0) return null;
    const t = Math.max(tSec, 1);
    if (t <= anchors[0].sec) return Math.round(anchors[0].w);
    if (t >= anchors[anchors.length - 1].sec) return Math.round(anchors[anchors.length - 1].w);

    let i = 0;
    while (i < anchors.length - 1 && anchors[i + 1].sec < t) i += 1;
    const a0 = anchors[i];
    const a1 = anchors[i + 1];
    const u0 = Math.log(a0.sec);
    const u1 = Math.log(a1.sec);
    const u = Math.log(t);
    const frac = (u - u0) / (u1 - u0);
    return Math.round(a0.w + frac * (a1.w - a0.w));
}

export function filterActivitiesByDaysBeforeEnd(activities, days, endDate = new Date()) {
    if (!activities?.length || days <= 0) return [];
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end.getTime() - days * MS_DAY);
    return activities.filter((a) => {
        const d = new Date(a.date);
        return d >= start && d <= end;
    });
}

export function filterActivitiesCalendarYear(activities, year) {
    if (!activities?.length) return [];
    return activities.filter((a) => new Date(a.date).getFullYear() === year);
}

/**
 * @returns {Record<string, number|null>} map row label -> watts
 */
export function powerCurveForWindow(activities, manualFtp) {
    const anchors = buildPowerAnchors(activities, manualFtp);
    const out = {};
    for (const row of POWER_DURATION_ROWS) {
        out[row.label] = interpolatePowerAt(anchors, row.sec);
    }
    return out;
}

export function dashboardFilterLabel(timeRange) {
    const map = {
        '1M': '1 maand',
        '3M': '3 maanden',
        '6M': '6 maanden',
        '1Y': '1 jaar',
        '3Y': '3 jaar',
        '6Y': '6 jaar',
        ALL: 'Alles (filter)',
        Custom: 'Aangepast',
    };
    return map[timeRange] || timeRange || 'Filter';
}
