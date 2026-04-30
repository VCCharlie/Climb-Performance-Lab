/**
 * Find activity with best (capped) power value for dashboard / Power tab.
 */

/** Same sanity ceiling as Dashboard.enhanceActivity — eFTP estimates above this are discarded. */
const MAX_DISPLAY_EFTP_W = 600;

const FTP_CAPS = {
    best_1min: 4.0,
    best_5min: 2.2,
    best_10min: 1.6,
    best_20min: 1.3,
    best_60min: 1.1,
    best_90min: 1.08,
    best_120min: 1.06,
};

function capForKey(key, manualFtp) {
    const mult = FTP_CAPS[key];
    if (!mult) return 1500;
    return manualFtp > 0 ? manualFtp * mult : 1500;
}

/**
 * @returns {{ activity: object|null, watts: number }}
 */
export function findBestPowerActivity(activities, key, manualFtp) {
    if (!activities?.length) return { activity: null, watts: 0 };
    const cap = capForKey(key, manualFtp);
    let bestAct = null;
    let bestW = 0;
    for (const a of activities) {
        const w = Number(a[key]) || 0;
        if (w <= 0 || w > cap) continue;
        if (w > bestW) {
            bestW = w;
            bestAct = a;
        } else if (w === bestW && bestAct && new Date(a.date) > new Date(bestAct.date)) {
            bestAct = a;
        }
    }
    return { activity: bestAct, watts: bestW };
}

/**
 * Derive dashboard eFTP (20m) from raw best_20min — mirrors enhanceActivity in Dashboard.jsx.
 * @returns {number|null} rounded watts or null if missing / above sanity cap
 */
export function deriveEftp20FromActivity(activity) {
    if (!activity?.best_20min) return null;
    const eFTP = Math.round(Number(activity.best_20min) * 0.95);
    if (eFTP > MAX_DISPLAY_EFTP_W) return null;
    return eFTP;
}

/**
 * Derive dashboard eFTP60 from best_60min — mirrors enhanceActivity in Dashboard.jsx.
 */
export function deriveEftp60FromActivity(activity) {
    if (!activity?.best_60min) return null;
    const eFTP60 = Math.round(Number(activity.best_60min));
    if (eFTP60 > MAX_DISPLAY_EFTP_W) return null;
    return eFTP60;
}

/**
 * Activity that produced the highest Peak eFTP (20m) in the list (same rule as stat card max).
 * Tie-break: newer activity date wins.
 * @returns {{ activity: object|null, derivedWatts: number, best20Raw: number }}
 */
export function findPeakEftp20Activity(activities) {
    if (!activities?.length) return { activity: null, derivedWatts: 0, best20Raw: 0 };
    let bestAct = null;
    let bestDerived = 0;
    let best20Raw = 0;
    for (const a of activities) {
        const derived = deriveEftp20FromActivity(a);
        if (derived == null) continue;
        const raw = Number(a.best_20min) || 0;
        if (derived > bestDerived) {
            bestDerived = derived;
            bestAct = a;
            best20Raw = raw;
        } else if (derived === bestDerived && bestAct && new Date(a.date) > new Date(bestAct.date)) {
            bestAct = a;
            best20Raw = raw;
        } else if (derived === bestDerived && !bestAct) {
            bestAct = a;
            best20Raw = raw;
        }
    }
    return { activity: bestAct, derivedWatts: bestDerived, best20Raw };
}

/**
 * Activity that produced the highest Peak eFTP (60m) in the list.
 * @returns {{ activity: object|null, derivedWatts: number, best60Raw: number }}
 */
export function findPeakEftp60Activity(activities) {
    if (!activities?.length) return { activity: null, derivedWatts: 0, best60Raw: 0 };
    let bestAct = null;
    let bestDerived = 0;
    let best60Raw = 0;
    for (const a of activities) {
        const derived = deriveEftp60FromActivity(a);
        if (derived == null) continue;
        const raw = Number(a.best_60min) || 0;
        if (derived > bestDerived) {
            bestDerived = derived;
            bestAct = a;
            best60Raw = raw;
        } else if (derived === bestDerived && bestAct && new Date(a.date) > new Date(bestAct.date)) {
            bestAct = a;
            best60Raw = raw;
        } else if (derived === bestDerived && !bestAct) {
            bestAct = a;
            best60Raw = raw;
        }
    }
    return { activity: bestAct, derivedWatts: bestDerived, best60Raw };
}

export function activityExternalLinks(activity) {
    if (!activity) return [];
    const links = [];
    const id = activity.id != null ? String(activity.id) : '';
    if (id && /^\d+$/.test(id)) {
        links.push({ label: 'Intervals.icu', href: `https://intervals.icu/activities/${id}` });
    }
    const sid = activity.strava_id != null ? String(activity.strava_id).replace(/\D/g, '') : '';
    if (sid) {
        links.push({ label: 'Strava', href: `https://www.strava.com/activities/${sid}` });
    }
    return links;
}

export { FTP_CAPS as DASHBOARD_FTP_CAPS };
