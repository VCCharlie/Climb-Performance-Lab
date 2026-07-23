/**
 * Personal bests per climb via activity title + description matching (Profiler heuristic).
 */

import { buildClimbMatchIndex, findBestClimbForActivity } from './activityClimbMatch';
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
        if (!act?.title && !act?.description && !act?.notes) continue;
        const { climb, source } = findBestClimbForActivity(act, index);
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
                activityTitle: act.title || null,
                matchSource: source,
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
            activityTitle: (betterNp || betterAp || betterTime)
                ? (act.title || prev.activityTitle)
                : prev.activityTitle,
            matchSource: (betterNp || betterAp || betterTime) ? (source || prev.matchSource) : prev.matchSource,
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

/**
 * @param {Record<string, object> | null | undefined} climbPbs
 * @param {string} climbId
 */
export function hasStoredClimbPb(climbPbs, climbId) {
    if (!climbPbs || climbId == null) return false;
    return !!formatPbSummary(climbPbs[String(climbId)]);
}

/**
 * @param {Record<string, object> | null | undefined} climbPbs
 */
export function countClimbsWithPb(climbPbs) {
    if (!climbPbs) return 0;
    let count = 0;
    for (const id of Object.keys(climbPbs)) {
        if (hasStoredClimbPb(climbPbs, id)) count += 1;
    }
    return count;
}

/**
 * @param {'title' | 'description' | null | undefined} source
 */
export function formatPbMatchSourceLabel(source) {
    if (source === 'description') return 'Matched from activity description';
    if (source === 'title') return 'Matched from activity title';
    return 'Matched from activity title or description';
}
