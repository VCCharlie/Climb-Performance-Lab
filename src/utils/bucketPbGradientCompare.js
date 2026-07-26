/**
 * Compare bucket-list climb database gradient vs PB ride gradient (from linked activity).
 */

/**
 * @param {number | string | null | undefined} distanceKm
 * @param {number | string | null | undefined} elevationM
 * @returns {number | null} average grade percent
 */
export function effectiveGradeFromRide(distanceKm, elevationM) {
    const d = Number(distanceKm);
    const e = Number(elevationM);
    if (!Number.isFinite(d) || d <= 0 || !Number.isFinite(e) || e <= 0) return null;
    return (e / (d * 1000)) * 100;
}

/**
 * @param {object | null | undefined} climb
 * @param {object | null | undefined} pb
 * @param {object | null | undefined} activity
 * @returns {{ dbGradePct: number | null, rideGradePct: number | null, deltaPct: number | null, summaryLine: string } | null}
 */
export function summarizePbVsDbGradient(climb, pb, activity = null) {
    if (!climb || !pb) return null;
    const dbGradePct = Number(climb.avgGrade);
    const dbOk = Number.isFinite(dbGradePct) && dbGradePct > 0;

    let rideGradePct = null;
    if (activity) {
        rideGradePct = effectiveGradeFromRide(activity.distance, activity.climbing);
    }

    if (!dbOk && rideGradePct == null) return null;

    const deltaPct = dbOk && rideGradePct != null ? rideGradePct - dbGradePct : null;

    const fmt = (n) => `${Number(n).toFixed(1)}%`;
    let summaryLine = '';
    if (dbOk && rideGradePct != null) {
        const delta = deltaPct;
        const deltaStr = delta == null ? '' : delta === 0
            ? ' (same avg gradient)'
            : delta > 0
                ? ` (+${fmt(delta)} vs DB)`
                : ` (${fmt(delta)} vs DB)`;
        summaryLine = `Gradient: DB ${fmt(dbGradePct)} avg · your ride ${fmt(rideGradePct)}${deltaStr}`;
    } else if (dbOk) {
        summaryLine = `Database avg gradient: ${fmt(dbGradePct)}`;
    } else if (rideGradePct != null) {
        summaryLine = `Your ride avg gradient: ${fmt(rideGradePct)}`;
    }

    return {
        dbGradePct: dbOk ? dbGradePct : null,
        rideGradePct,
        deltaPct,
        summaryLine,
    };
}
