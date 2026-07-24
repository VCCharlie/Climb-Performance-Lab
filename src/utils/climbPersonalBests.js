/**
 * Personal bests per climb via activity title + description matching (Profiler heuristic).
 */

import { buildClimbMatchIndex } from './activityClimbMatch';
import { findBestClimbForActivityPb } from './activityClimbMatchPb';
import { activityMovingTimeSec } from './activityFilterMetrics';
import { normalizeDate } from './formatters';
import { stravaIdFromActivity } from './climbPbActivityLinks';
import {
    activityVenue,
    activityMatchesVenueFilter,
    pbMatchesVenueFilter,
    resolvePbVenue,
    climbVenue,
    isClimbVenueCompatible,
} from './activityVenue';
import { yieldToMain } from './yieldToMain';

/**
 * Drop PB rows where the stored ride venue does not match the climb or source activity.
 * @param {Record<string, object>} climbPbs
 * @param {object[]} climbs
 * @param {object[]} [activities]
 */
export function pruneMismatchedVenuePbs(climbPbs, climbs, activities = []) {
    const climbById = new Map((climbs || []).map((c) => [String(c.id), c]));
    const actById = new Map((activities || []).map((a) => [String(a.id), a]));
    const next = {};

    for (const [id, pb] of Object.entries(climbPbs || {})) {
        if (!formatPbSummary(pb)) continue;
        const climb = climbById.get(id);
        if (!climb) {
            next[id] = pb;
            continue;
        }
        const activity = pb.activityId ? actById.get(String(pb.activityId)) : null;
        const pbVenue = resolvePbVenue(pb, climb, activity);
        if (pbVenue && pbVenue !== climbVenue(climb)) continue;
        if (activity && !isClimbVenueCompatible(climb, activityVenue(activity))) continue;
        next[id] = pb;
    }

    return next;
}

/**
 * Remove PB rows whose linked activity no longer passes strict PB climb matching
 * (e.g. legacy false positives from loose word overlap).
 *
 * @param {Record<string, object> | null | undefined} climbPbs
 * @param {object[]} activities
 * @param {object[]} climbs
 */
export function pruneInvalidPbAttributions(climbPbs, activities, climbs) {
    const list = activities || [];
    const climbList = climbs || [];
    if (!climbPbs || !list.length || !climbList.length) {
        return climbPbs || {};
    }

    const index = buildClimbMatchIndex(climbList);
    const climbById = new Map(climbList.map((c) => [String(c.id), c]));
    const actById = new Map(list.map((a) => [String(a.id), a]));
    const next = { ...climbPbs };

    for (const [climbId, pb] of Object.entries(climbPbs)) {
        if (!formatPbSummary(pb)) {
            delete next[climbId];
            continue;
        }
        const climb = climbById.get(String(climbId));
        const activity = pb.activityId ? actById.get(String(pb.activityId)) : null;
        if (!climb || !activity) continue;

        const { climb: matched } = findBestClimbForActivityPb(activity, index);
        if (!matched || String(matched.id) !== String(climbId)) {
            delete next[climbId];
        }
    }

    return next;
}

/**
 * Async variant — yields between PB checks so the Bucket List tab stays responsive.
 *
 * @param {Record<string, object> | null | undefined} climbPbs
 * @param {object[]} activities
 * @param {object[]} climbs
 * @param {{ chunkSize?: number }} [options]
 * @returns {Promise<Record<string, object>>}
 */
export async function pruneInvalidPbAttributionsAsync(climbPbs, activities, climbs, options = {}) {
    const list = activities || [];
    const climbList = climbs || [];
    if (!climbPbs || !list.length || !climbList.length) {
        return climbPbs || {};
    }

    const chunkSize = Math.max(1, options.chunkSize ?? 8);
    const index = buildClimbMatchIndex(climbList);
    const climbById = new Map(climbList.map((c) => [String(c.id), c]));
    const actById = new Map(list.map((a) => [String(a.id), a]));
    const next = { ...climbPbs };
    const ids = Object.keys(climbPbs);

    for (let i = 0; i < ids.length; i += 1) {
        const climbId = ids[i];
        const pb = climbPbs[climbId];
        if (!formatPbSummary(pb)) {
            delete next[climbId];
        } else {
            const climb = climbById.get(String(climbId));
            const activity = pb.activityId ? actById.get(String(pb.activityId)) : null;
            if (climb && activity) {
                const { climb: matched } = findBestClimbForActivityPb(activity, index);
                if (!matched || String(matched.id) !== String(climbId)) {
                    delete next[climbId];
                }
            }
        }

        if ((i + 1) % chunkSize === 0) {
            await yieldToMain();
        }
    }

    return next;
}

/**
 * Apply one activity to the in-progress PB map (mutates `pbs`).
 * @param {object} act
 * @param {ReturnType<typeof buildClimbMatchIndex>} index
 * @param {Record<string, object>} pbs
 * @param {{ venueFilter?: 'all' | 'outdoor' | 'virtual' }} [options]
 */
function applyActivityToClimbPbs(act, index, pbs, options = {}) {
    const venueFilter = options.venueFilter ?? 'all';
    if (!activityMatchesVenueFilter(act, venueFilter)) return;
    if (!act?.title && !act?.description && !act?.notes) return;
    const { climb, source } = findBestClimbForActivityPb(act, index);
    if (!climb?.id) return;

    const climbId = String(climb.id);
    const venue = activityVenue(act);
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
            venue,
            normPower: np > 0 ? np : null,
            avgPower: ap > 0 ? ap : null,
            movingTimeSec: movingSec > 0 ? movingSec : null,
            activityId: act.id != null ? String(act.id) : null,
            stravaId: stravaIdFromActivity(act),
            date: normalizeDate(act.date) || null,
            activityTitle: act.title || null,
            matchSource: source,
        };
        return;
    }

    if (!betterNp && !betterAp && !betterTime) return;

    pbs[climbId] = {
        ...prev,
        venue,
        normPower: betterNp ? np : prev.normPower,
        avgPower: betterAp ? ap : prev.avgPower,
        movingTimeSec: betterTime ? movingSec : prev.movingTimeSec,
        activityId: (betterNp || betterAp || betterTime) && act.id != null
            ? String(act.id)
            : prev.activityId,
        stravaId: (betterNp || betterAp || betterTime)
            ? (stravaIdFromActivity(act) || prev.stravaId || null)
            : prev.stravaId,
        date: (betterNp || betterAp || betterTime)
            ? (normalizeDate(act.date) || prev.date)
            : prev.date,
        activityTitle: (betterNp || betterAp || betterTime)
            ? (act.title || prev.activityTitle)
            : prev.activityTitle,
        matchSource: (betterNp || betterAp || betterTime) ? (source || prev.matchSource) : prev.matchSource,
    };
}

/**
 * @param {object[]} activities
 * @param {object[]} climbs
 * @param {{ venueFilter?: 'all' | 'outdoor' | 'virtual' }} [options]
 * @returns {Record<string, object>}
 */
export function scanClimbPersonalBests(activities, climbs, options = {}) {
    const index = buildClimbMatchIndex(climbs);
    const pbs = {};

    for (const act of activities || []) {
        applyActivityToClimbPbs(act, index, pbs, options);
    }

    return pbs;
}

/**
 * Same result as scanClimbPersonalBests, but yields to the main thread between chunks
 * so the UI stays responsive on large activity logs.
 *
 * @param {object[]} activities
 * @param {object[]} climbs
 * @param {{ chunkSize?: number, onProgress?: (p: { done: number, total: number }) => void, venueFilter?: 'all' | 'outdoor' | 'virtual' }} [options]
 * @returns {Promise<Record<string, object>>}
 */
export async function scanClimbPersonalBestsAsync(activities, climbs, options = {}) {
    const chunkSize = Math.max(50, options.chunkSize ?? 250);
    const onProgress = options.onProgress;
    const index = buildClimbMatchIndex(climbs);
    const pbs = {};
    const list = activities || [];
    const total = list.length;

    onProgress?.({ done: 0, total });

    for (let i = 0; i < total; i++) {
        applyActivityToClimbPbs(list[i], index, pbs, options);
        const done = i + 1;
        if (done % chunkSize === 0 || done === total) {
            onProgress?.({ done, total });
            if (done < total) {
                await yieldToMain();
            }
        }
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
 * @param {object | null} [climb]
 * @param {'all' | 'outdoor' | 'virtual'} [venueFilter]
 */
export function hasStoredClimbPb(climbPbs, climbId, climb = null, venueFilter = 'all', activity = null) {
    if (!climbPbs || climbId == null) return false;
    const pb = climbPbs[String(climbId)];
    if (!formatPbSummary(pb)) return false;
    return pbMatchesVenueFilter(pb, climb, venueFilter, activity);
}

/**
 * @param {Record<string, object> | null | undefined} climbPbs
 * @param {object[]} [climbs]
 * @param {'all' | 'outdoor' | 'virtual'} [venueFilter]
 * @param {object[]} [activities]
 */
export function countClimbsWithPb(climbPbs, climbs = [], venueFilter = 'all', activities = []) {
    if (!climbPbs) return 0;
    const climbById = new Map((climbs || []).map((c) => [String(c.id), c]));
    const actById = new Map((activities || []).map((a) => [String(a.id), a]));
    let count = 0;
    for (const id of Object.keys(climbPbs)) {
        const pb = climbPbs[id];
        const activity = pb?.activityId ? actById.get(String(pb.activityId)) : null;
        if (hasStoredClimbPb(climbPbs, id, climbById.get(id) ?? null, venueFilter, activity)) count += 1;
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

function pbMetricScore(pb) {
    if (!pb) return 0;
    const np = Number(pb.normPower) || Number(pb.avgPower) || 0;
    const time = Number(pb.movingTimeSec) || 0;
    return np * 10000 + (time > 0 ? 1000000 / time : 0);
}

/**
 * Replace stored PBs with a fresh scan (drops climbs that no longer match).
 * @param {Record<string, object>} scanned
 * @param {object[]} [climbs]
 * @param {object[]} [activities]
 */
export function replaceClimbPbsFromScan(scanned, climbs = [], activities = []) {
    const next = {};

    for (const [id, fresh] of Object.entries(scanned || {})) {
        if (!formatPbSummary(fresh)) continue;
        next[id] = fresh;
    }

    return pruneMismatchedVenuePbs(next, climbs, activities);
}

/**
 * @deprecated Prefer replaceClimbPbsFromScan — merge kept old false-positive PBs across rescans.
 * @param {Record<string, object> | null | undefined} prevPbs
 * @param {Record<string, object>} scanned
 * @param {object[]} [climbs]
 */
export function mergeScannedIntoClimbPbs(prevPbs, scanned, climbs = [], activities = []) {
    const prev = prevPbs || {};
    const next = { ...prev };

    for (const [id, fresh] of Object.entries(scanned || {})) {
        if (!formatPbSummary(fresh)) continue;
        const old = prev[id];
        if (!old || !formatPbSummary(old) || pbMetricScore(fresh) > pbMetricScore(old)) {
            next[id] = fresh;
        }
    }

    return pruneMismatchedVenuePbs(next, climbs, activities);
}

/**
 * @param {object[]} activities
 */
export function countActivitiesWithDescription(activities) {
    let count = 0;
    for (const act of activities || []) {
        const text = (act?.description || act?.notes || '').trim();
        if (text) count += 1;
    }
    return count;
}

/**
 * @param {Record<string, object>} climbPbs
 */
export function countPbByMatchSource(climbPbs) {
    let title = 0;
    let description = 0;
    for (const pb of Object.values(climbPbs || {})) {
        if (!formatPbSummary(pb)) continue;
        if (pb.matchSource === 'description') description += 1;
        else title += 1;
    }
    return { title, description };
}

/**
 * Compare stored PBs with a fresh scan — used for scan button feedback.
 * @param {Record<string, object> | null | undefined} prevPbs
 * @param {Record<string, object>} scanned
 * @param {object[]} activities
 * @param {object[]} [climbs]
 */
export function summarizePbScanResult(prevPbs, scanned, activities, climbs = []) {
    const replaced = replaceClimbPbsFromScan(scanned, climbs, activities);
    const previousWithPb = countClimbsWithPb(prevPbs, climbs, 'all', activities);
    const totalWithPb = countClimbsWithPb(replaced, climbs, 'all', activities);

    const prevIds = new Set(
        Object.keys(prevPbs || {}).filter((id) => hasStoredClimbPb(prevPbs, id)),
    );
    const nextIds = new Set(
        Object.keys(replaced || {}).filter((id) => hasStoredClimbPb(replaced, id)),
    );

    let newClimbs = 0;
    let improvedPbs = 0;
    let removedPbs = 0;

    for (const id of nextIds) {
        if (!prevIds.has(id)) {
            newClimbs += 1;
            continue;
        }
        const old = prevPbs[id];
        const neu = replaced[id];
        const betterNp = (neu.normPower || 0) > (old.normPower || 0);
        const betterTime = (neu.movingTimeSec || 0) > 0
            && (old.movingTimeSec || 0) > 0
            && neu.movingTimeSec < old.movingTimeSec;
        if (betterNp || betterTime) improvedPbs += 1;
    }

    for (const id of prevIds) {
        if (!nextIds.has(id)) removedPbs += 1;
    }

    const { description: matchedFromDescription } = countPbByMatchSource(scanned);

    return {
        activitiesScanned: activities?.length || 0,
        activitiesWithDescription: countActivitiesWithDescription(activities),
        climbsMatchedInScan: Object.keys(scanned || {}).filter((id) => hasStoredClimbPb(scanned, id)).length,
        previousWithPb,
        totalWithPb,
        newClimbs,
        improvedPbs,
        removedPbs,
        matchedFromDescription,
        replaced,
        /** @deprecated use replaced */
        merged: replaced,
    };
}

/**
 * @param {ReturnType<typeof summarizePbScanResult>} summary
 */
export function formatPbScanFeedbackMessage(summary) {
    if (!summary) return 'Scan could not run — no activities loaded.';

    const {
        activitiesScanned,
        activitiesWithDescription,
        climbsMatchedInScan,
        totalWithPb,
        previousWithPb,
        newClimbs,
        improvedPbs,
        removedPbs,
        matchedFromDescription,
    } = summary;

    let delta = '';
    if (newClimbs === 0 && improvedPbs === 0 && removedPbs === 0 && previousWithPb === totalWithPb) {
        delta = ' — no changes since your last scan';
    } else {
        const bits = [];
        if (newClimbs > 0) bits.push(`${newClimbs} new`);
        if (improvedPbs > 0) bits.push(`${improvedPbs} improved`);
        if (removedPbs > 0) bits.push(`${removedPbs} removed`);
        if (bits.length) delta = ` (${bits.join(', ')})`;
    }

    let descHint = '';
    if (activitiesWithDescription === 0) {
        descHint = ' Tip: link Strava and run gear/map backfill in Activities to fill descriptions (MyCols, ClimbFinder).';
    } else if (matchedFromDescription === 0) {
        descHint = ` ${activitiesWithDescription} activities have a description; titles covered the matches.`;
    } else {
        descHint = ` ${matchedFromDescription} match(es) used activity description.`;
    }

    return `Scanned ${activitiesScanned.toLocaleString('en-GB')} activities — ${climbsMatchedInScan} climb match(es) found. ${totalWithPb} climbs with a PB${delta}.${descHint}`;
}
