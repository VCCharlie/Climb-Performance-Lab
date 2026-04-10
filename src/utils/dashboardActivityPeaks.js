/**
 * Vind activiteit met beste (capped) power-waarde voor dashboard/Power-tab.
 */

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
