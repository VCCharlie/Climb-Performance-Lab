/**
 * Personal bests per climb via activity title + description matching (Profiler heuristic).
 */

import { buildClimbMatchIndex, findBestClimbForActivity } from './activityClimbMatch';
import { activityMovingTimeSec } from './activityFilterMetrics';
import { normalizeDate } from './formatters';
import { stravaIdFromActivity } from './climbPbActivityLinks';
import {
    activityVenue,
    activityMatchesVenueFilter,
    pbMatchesVenueFilter,
    resolvePbVenue,
    climbVenue,
} from './activityVenue';

/**
 * Drop PB rows where the stored ride venue does not match the climb (e.g. Zwift PB on a real climb).
 * @param {Record<string, object>} climbPbs
 * @param {object[]} climbs
 */
export function pruneMismatchedVenuePbs(climbPbs, climbs) {
    const climbById = new Map((climbs || []).map((c) => [String(c.id), c]));
    const next = {};

    for (const [id, pb] of Object.entries(climbPbs || {})) {
        if (!formatPbSummary(pb)) continue;
        const climb = climbById.get(id);
        if (!climb) {
            next[id] = pb;
            continue;
        }
        const pbVenue = resolvePbVenue(pb, climb);
        if (pbVenue && pbVenue !== climbVenue(climb)) continue;
        next[id] = pb;
    }

    return next;
}

/**
 * @param {object[]} activities
 * @param {object[]} climbs
 * @param {{ venueFilter?: 'all' | 'outdoor' | 'virtual' }} [options]
 * @returns {Record<string, object>}
 */
export function scanClimbPersonalBests(activities, climbs, options = {}) {
    const venueFilter = options.venueFilter ?? 'all';
    const index = buildClimbMatchIndex(climbs);
    const pbs = {};

    for (const act of activities || []) {
        if (!activityMatchesVenueFilter(act, venueFilter)) continue;
        if (!act?.title && !act?.description && !act?.notes) continue;
        const { climb, source } = findBestClimbForActivity(act, index);
        if (!climb?.id) continue;

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
            continue;
        }

        if (!betterNp && !betterAp && !betterTime) continue;

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
export function hasStoredClimbPb(climbPbs, climbId, climb = null, venueFilter = 'all') {
    if (!climbPbs || climbId == null) return false;
    const pb = climbPbs[String(climbId)];
    if (!formatPbSummary(pb)) return false;
    return pbMatchesVenueFilter(pb, climb, venueFilter);
}

/**
 * @param {Record<string, object> | null | undefined} climbPbs
 * @param {object[]} [climbs]
 * @param {'all' | 'outdoor' | 'virtual'} [venueFilter]
 */
export function countClimbsWithPb(climbPbs, climbs = [], venueFilter = 'all') {
    if (!climbPbs) return 0;
    const climbById = new Map((climbs || []).map((c) => [String(c.id), c]));
    let count = 0;
    for (const id of Object.keys(climbPbs)) {
        if (hasStoredClimbPb(climbPbs, id, climbById.get(id) ?? null, venueFilter)) count += 1;
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
 * Merge a fresh scan into stored PBs, keeping the stronger record per climb.
 * @param {Record<string, object> | null | undefined} prevPbs
 * @param {Record<string, object>} scanned
 */
export function mergeScannedIntoClimbPbs(prevPbs, scanned, climbs = []) {
    const prev = prevPbs || {};
    const next = { ...prev };

    for (const [id, fresh] of Object.entries(scanned || {})) {
        if (!formatPbSummary(fresh)) continue;
        const old = prev[id];
        if (!old || !formatPbSummary(old) || pbMetricScore(fresh) > pbMetricScore(old)) {
            next[id] = fresh;
        }
    }

    return pruneMismatchedVenuePbs(next, climbs);
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
 */
export function summarizePbScanResult(prevPbs, scanned, activities, climbs = []) {
    const merged = mergeScannedIntoClimbPbs(prevPbs, scanned, climbs);
    const previousWithPb = countClimbsWithPb(prevPbs);
    const totalWithPb = countClimbsWithPb(merged);

    const prevIds = new Set(
        Object.keys(prevPbs || {}).filter((id) => hasStoredClimbPb(prevPbs, id)),
    );

    let newClimbs = 0;
    let improvedPbs = 0;

    for (const id of Object.keys(merged)) {
        if (!hasStoredClimbPb(merged, id)) continue;
        if (!prevIds.has(id)) {
            newClimbs += 1;
            continue;
        }
        const old = prevPbs[id];
        const neu = merged[id];
        const betterNp = (neu.normPower || 0) > (old.normPower || 0);
        const betterTime = (neu.movingTimeSec || 0) > 0
            && (old.movingTimeSec || 0) > 0
            && neu.movingTimeSec < old.movingTimeSec;
        if (betterNp || betterTime) improvedPbs += 1;
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
        matchedFromDescription,
        merged,
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
        totalWithPb,
        previousWithPb,
        newClimbs,
        improvedPbs,
        matchedFromDescription,
    } = summary;

    let delta = '';
    if (newClimbs === 0 && improvedPbs === 0 && previousWithPb === totalWithPb) {
        delta = ' — no new matches or improvements since your last scan';
    } else {
        const bits = [];
        if (newClimbs > 0) bits.push(`${newClimbs} new`);
        if (improvedPbs > 0) bits.push(`${improvedPbs} improved`);
        if (bits.length) delta = ` (+${bits.join(', ')})`;
    }

    let descHint = '';
    if (activitiesWithDescription === 0) {
        descHint = ' Tip: link Strava and run gear/map backfill in Activities to fill descriptions (MyCols, ClimbFinder).';
    } else if (matchedFromDescription === 0) {
        descHint = ` ${activitiesWithDescription} activities have a description; titles already covered those matches.`;
    } else {
        descHint = ` ${matchedFromDescription} match(es) used activity description.`;
    }

    return `Scanned ${activitiesScanned.toLocaleString('en-GB')} activities. ${totalWithPb} climbs with a PB${delta}.${descHint}`;
}

