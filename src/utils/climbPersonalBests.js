/**
 * Personal bests per climb via activity title matching (same heuristic as Profiler).
 */

import { buildClimbMatchIndex, findBestClimbUsingIndex } from './activityClimbMatch';
import { activityMovingTimeSec } from './activityFilterMetrics';
import { normalizeDate } from './formatters';

/**
 * @param {object[]} activities
 * @param {object[]} climbs
 * @returns {Record<string, object>}
 */
export function scanClimbPersonalBests(activities, climbs) {
    const index = buildClimbMatchIndex(climbs);
    const pbs = {};

    for (const act of activities || []) {
        if (!act?.title) continue;
        const climb = findBestClimbUsingIndex(act.title, index);
        if (!climb?.id) continue;

        const climbId = String(climb.id);
        const np = Number(act.norm_power) || 0;
        const ap = Number(act.avg_power) || 0;
        const movingSec = activityMovingTimeSec(act);
        const prev = pbs[climbId];

        const betterNp = np > 0 && (!prev?.normPower || np > prev.normPower);
        const betterAp = ap > 0 && (!prev?.avgPower || ap > prev.avgPower);
        const betterTime = movingSec != null && movingSec > 60
            && (!prev?.movingTimeSec || movingSec < prev.movingTimeSec);

        if (!prev) {
            pbs[climbId] = {
                climbId,
                climbName: climb.name,
                normPower: np > 0 ? np : null,
                avgPower: ap > 0 ? ap : null,
                movingTimeSec: movingSec > 0 ? movingSec : null,
                activityId: act.id != null ? String(act.id) : null,
                date: normalizeDate(act.date) || null,
                activityTitle: act.title,
            };
            continue;
        }

        if (!betterNp && !betterAp && !betterTime) continue;

        pbs[climbId] = {
            ...prev,
            normPower: betterNp ? np : prev.normPower,
            avgPower: betterAp ? ap : prev.avgPower,
            movingTimeSec: betterTime ? movingSec : prev.movingTimeSec,
            activityId: (betterNp || betterAp || betterTime) && act.id != null
                ? String(act.id)
                : prev.activityId,
            date: (betterNp || betterAp || betterTime)
                ? (normalizeDate(act.date) || prev.date)
                : prev.date,
            activityTitle: (betterNp || betterAp || betterTime) ? act.title : prev.activityTitle,
        };
    }

    return pbs;
}

/**
 * @param {number | null} sec
 */
export function formatPbMovingTime(sec) {
    if (sec == null || sec <= 0) return null;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m} min`;
}

/**
 * Short PB label for bucket list rows.
 * @param {object | null} pb
 */
export function formatPbSummary(pb) {
    if (!pb) return null;
    const parts = [];
    if (pb.normPower > 0) parts.push(`${Math.round(pb.normPower)} W NP`);
    else if (pb.avgPower > 0) parts.push(`${Math.round(pb.avgPower)} W avg`);
    const time = formatPbMovingTime(pb.movingTimeSec);
    if (time) parts.push(time);
    return parts.length > 0 ? parts.join(' · ') : null;
}
