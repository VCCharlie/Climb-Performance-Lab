/**
 * Year-over-year YTD comparison from scanned Strava activities (same calendar window as reference date).
 */

const actTimeMs = (a) => {
    const d = a?.start_date_local || a?.start_date;
    if (!d) return NaN;
    return new Date(d).getTime();
};

/**
 * @param {object[]} bikeActivities - Strava list activities (bike types only)
 * @param {Date} referenceDate - typically profile `fetchedAt`
 * @returns {{ thisYtd: object, prevYtd: object, referenceDate: string } | null}
 */
export function computeYtdYearOverYearFromActivities(bikeActivities, referenceDate) {
    if (!bikeActivities || !referenceDate || Number.isNaN(referenceDate.getTime())) return null;

    const y = referenceDate.getFullYear();
    const mo = referenceDate.getMonth();
    const da = referenceDate.getDate();

    const startThis = new Date(y, 0, 1, 0, 0, 0, 0).getTime();
    const endThis = new Date(y, mo, da, 23, 59, 59, 999).getTime();

    const startPrev = new Date(y - 1, 0, 1, 0, 0, 0, 0).getTime();
    const endPrev = new Date(y - 1, mo, da, 23, 59, 59, 999).getTime();

    const empty = () => ({
        count: 0,
        distance: 0,
        elevation_gain: 0,
        moving_time: 0,
    });

    const thisYtd = empty();
    const prevYtd = empty();

    for (const a of bikeActivities) {
        const t = actTimeMs(a);
        if (Number.isNaN(t)) continue;

        const d = Number(a.distance) || 0;
        const e = Number(a.total_elevation_gain) || 0;
        const mv = Number(a.moving_time) || 0;

        if (t >= startThis && t <= endThis) {
            thisYtd.count++;
            thisYtd.distance += d;
            thisYtd.elevation_gain += e;
            thisYtd.moving_time += mv;
        } else if (t >= startPrev && t <= endPrev) {
            prevYtd.count++;
            prevYtd.distance += d;
            prevYtd.elevation_gain += e;
            prevYtd.moving_time += mv;
        }
    }

    return { thisYtd, prevYtd, referenceDate: referenceDate.toISOString() };
}

/**
 * @param {number} current
 * @param {number} previous
 * @returns {number | null} percent change vs previous (null if previous is 0)
 */
export function percentChange(current, previous) {
    const p = Number(previous) || 0;
    const c = Number(current) || 0;
    if (p === 0) return null;
    return ((c - p) / p) * 100;
}
