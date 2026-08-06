/**
 * Power-duration curve for a set of activities (intervals.icu-style).
 * Per ride: max_power, best 1/5/10/20/60 (and optional 90/120) min, plus a moving_time anchor
 * with conservative average power — intermediate seconds via log interpolation.
 */

import { DASHBOARD_FTP_CAPS } from './dashboardActivityPeaks';
import { activityMovingTimeSec } from './activityFilterMetrics';

const MS_DAY = 86400000;

/** Row label (display) → duration in seconds */
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
    { label: '1h', sec: 3600 },
    { label: '1h30', sec: 5400 },
    { label: '2h', sec: 7200 },
    { label: '3h', sec: 10800 },
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

/** Lang gemiddeld vermogen (ritduur-anker): plafond ~FTP voor lange duur. */
function capSteadyAverageWatts(w, manualFtp) {
    const n = Number(w) || 0;
    if (n <= 0) return 0;
    const cap = manualFtp > 0 ? manualFtp * 1.12 : 550;
    return Math.min(n, cap);
}

function maxAnchorSec(anchors) {
    if (!anchors?.length) return 0;
    // ⚡ Bolt Optimization: Use reduce instead of Math.max(...array.map()) to prevent call stack issues
    return anchors.reduce((max, a) => Math.max(max, a.sec), 0);
}

/**
 * Ankers (sec, watt) voor één activiteit — basis voor interpolatie per rit.
 * Inclusief optionele best_90min / best_120min uit API en een anker op echte moving_time
 * (avg/np) zodat de curve voorbij 60 min kan dalen zonder plat te blijven.
 */
export function buildAnchorsForActivity(activity, manualFtp) {
    if (!activity) return [];
    const maxP = capMaxPowerW(activity.max_power, manualFtp);
    const b1 = capBestField(activity.best_1min, 'best_1min', manualFtp);
    const b5 = capBestField(activity.best_5min, 'best_5min', manualFtp);
    const b10 = capBestField(activity.best_10min, 'best_10min', manualFtp);
    const b20 = capBestField(activity.best_20min, 'best_20min', manualFtp);
    const b60 = capBestField(activity.best_60min, 'best_60min', manualFtp);
    const b90 = capBestField(activity.best_90min, 'best_90min', manualFtp);
    const b120 = capBestField(activity.best_120min, 'best_120min', manualFtp);

    const anchors = [];
    if (maxP > 0) anchors.push({ sec: 1, w: maxP });
    if (b1 > 0) anchors.push({ sec: 60, w: b1 });
    if (b5 > 0) anchors.push({ sec: 300, w: b5 });
    if (b10 > 0) anchors.push({ sec: 600, w: b10 });
    if (b20 > 0) anchors.push({ sec: 1200, w: b20 });
    if (b60 > 0) anchors.push({ sec: 3600, w: b60 });
    if (b90 > 0) anchors.push({ sec: 5400, w: b90 });
    if (b120 > 0) anchors.push({ sec: 7200, w: b120 });

    anchors.sort((a, b) => a.sec - b.sec);

    const mv = activityMovingTimeSec(activity);
    if (mv != null && mv > 3660) {
        const ap = capSteadyAverageWatts(activity.avg_power, manualFtp);
        const np = capSteadyAverageWatts(activity.norm_power, manualFtp);
        const steady = np > 0 && ap > 0 ? Math.min(ap, np) : (np > 0 ? np : ap);
        if (steady > 0) {
            const t = Math.min(Math.floor(mv), 6 * 3600);
            const lastSec = maxAnchorSec(anchors);
            if (t > lastSec + 60) {
                anchors.push({ sec: t, w: steady });
                anchors.sort((x, y) => x.sec - y.sec);
            }
        }
    }

    return anchors;
}

/**
 * Pre-compute anchors per activity id — avoids rebuilding anchors inside nested duration loops.
 * @returns {Map<string, Array<{ sec: number, w: number }>>}
 */
export function buildAnchorsCache(activities, manualFtp) {
    const cache = new Map();
    for (const a of activities || []) {
        const id = a?.id != null ? String(a.id) : null;
        if (!id) continue;
        cache.set(id, buildAnchorsForActivity(a, manualFtp));
    }
    return cache;
}

function anchorsForActivity(a, manualFtp, anchorsCache) {
    if (anchorsCache) {
        const id = a?.id != null ? String(a.id) : null;
        if (id && anchorsCache.has(id)) return anchorsCache.get(id);
    }
    return buildAnchorsForActivity(a, manualFtp);
}

/**
 * @returns {Record<string, { watts: number|null, activity: object|null }>}
 * Per duur: sterkste rit (max over ritten van geïnterpoleerd vermogen) + bronactiviteit.
 * @param {Map<string, Array<{ sec: number, w: number }>>} [anchorsCache] optional pre-built cache from buildAnchorsCache
 */
export function powerCurveWithSources(activities, manualFtp, anchorsCache = null) {
    const list = activities || [];
    const out = {};
    for (const row of POWER_DURATION_ROWS) {
        let bestW = null;
        let bestAct = null;
        for (const a of list) {
            const anchors = anchorsForActivity(a, manualFtp, anchorsCache);
            if (row.sec > maxAnchorSec(anchors)) continue;
            const w = interpolatePowerAt(anchors, row.sec);
            if (w == null) continue;
            const newer =
                bestAct &&
                new Date(a.date).getTime() > new Date(bestAct.date).getTime();
            if (bestW === null || w > bestW || (w === bestW && newer)) {
                bestW = w;
                bestAct = a;
            }
        }
        out[row.label] = { watts: bestW, activity: bestAct };
    }
    return out;
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
export function powerCurveForWindow(activities, manualFtp, anchorsCache = null) {
    const src = powerCurveWithSources(activities, manualFtp, anchorsCache);
    const out = {};
    for (const row of POWER_DURATION_ROWS) {
        out[row.label] = src[row.label]?.watts ?? null;
    }
    return out;
}

export function dashboardFilterLabel(timeRange) {
    const map = {
        '1M': '1 month',
        '3M': '3 months',
        '6M': '6 months',
        '1Y': '1 year',
        '3Y': '3 years',
        '6Y': '6 years',
        ALL: 'All (filter)',
        Custom: 'Custom',
    };
    return map[timeRange] || timeRange || 'Filter';
}

/**
 * Top-N strongest interpolated power moments (same anchors as power-duration matrix).
 */
export function computeTopPowerMoments(activities, manualFtp, limit = 10, anchorsCache = null) {
    if (!activities?.length || limit <= 0) return [];

    const candidates = [];
    for (const a of activities) {
        const anchors = anchorsForActivity(a, manualFtp, anchorsCache);
        if (anchors.length === 0) continue;
        for (const row of POWER_DURATION_ROWS) {
            if (row.sec > maxAnchorSec(anchors)) continue;
            const w = interpolatePowerAt(anchors, row.sec);
            if (w == null || w <= 0) continue;
            candidates.push({
                activity: a,
                watts: w,
                durationLabel: row.label,
                sec: row.sec,
            });
        }
    }

    candidates.sort((x, y) => {
        if (y.watts !== x.watts) return y.watts - x.watts;
        return new Date(y.activity.date) - new Date(x.activity.date);
    });

    const out = [];
    const seen = new Set();
    for (const c of candidates) {
        const id = c.activity?.id != null ? String(c.activity.id) : JSON.stringify(c.activity?.date);
        const key = `${id}::${c.durationLabel}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(c);
        if (out.length >= limit) break;
    }
    return out;
}

/**
 * Top-N ritten op één vaste duur (sec), op basis van geïnterpoleerd vermogen.
 * @param {{ requireAnchorBeyondSec?: number }} [opts] — alleen ritten waarvan de langste anker ≥ deze sec (bijv. 7200 voor 120 min).
 * @returns {Array<{ activity: object, watts: number }>}
 */
export function topNInterpolatedAtSec(activities, manualFtp, sec, limit = 10, opts = {}, anchorsCache = null) {
    if (!activities?.length || limit <= 0 || sec <= 0) return [];
    const needAnchor = opts.requireAnchorBeyondSec != null && opts.requireAnchorBeyondSec > 0
        ? opts.requireAnchorBeyondSec
        : null;
    const list = [];
    for (const a of activities) {
        const anchors = anchorsForActivity(a, manualFtp, anchorsCache);
        if (!anchors.length) continue;
        const longestAnchor = maxAnchorSec(anchors);
        if (needAnchor != null && longestAnchor < needAnchor) continue;
        // Skip durations beyond measured anchors — interpolatePowerAt would flat-extrapolate.
        if (sec > longestAnchor) continue;
        const mv = activityMovingTimeSec(a);
        if (mv != null && mv < sec) continue;
        const w = interpolatePowerAt(anchors, sec);
        if (w == null || w <= 0) continue;
        list.push({ activity: a, watts: w });
    }
    list.sort((x, y) => {
        if (y.watts !== x.watts) return y.watts - x.watts;
        return new Date(y.activity.date) - new Date(x.activity.date);
    });
    return list.slice(0, limit);
}
