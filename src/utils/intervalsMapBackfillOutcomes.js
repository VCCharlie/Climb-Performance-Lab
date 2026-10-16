/**
 * User-facing reasons when Intervals route map backfill cannot run or returns no polyline.
 */

import { activityNeedsIntervalsMapPolyline, isIntervalsActivityId } from './intervalsMapEnrich.js';
import { MAP_BACKFILL_CODE, messageForMapBackfillCode } from './intervalsMapBackfillCodes.js';

export { MAP_BACKFILL_CODE, messageForMapBackfillCode };

/** @typedef {'added' | 'skipped' | 'failed'} IntervalsMapBackfillOutcomeStatus */

/**
 * @typedef {{
 *   id: string,
 *   date?: string,
 *   title?: string,
 *   type?: string,
 *   status: IntervalsMapBackfillOutcomeStatus,
 *   code: string,
 *   message: string,
 * }} IntervalsMapBackfillOutcome
 */

/**
 * @param {object | null | undefined} activity
 * @returns {{ canFetch: boolean, code?: string, message?: string }}
 */
export function precheckIntervalsMapBackfill(activity) {
    if (!activityNeedsIntervalsMapPolyline(activity)) {
        return { canFetch: false, code: MAP_BACKFILL_CODE.NO_GPS_DATA, message: 'Already has a route map' };
    }
    if (!isIntervalsActivityId(activity?.id)) {
        return {
            canFetch: false,
            code: MAP_BACKFILL_CODE.NOT_INTERVALS_ACTIVITY,
            message: messageForMapBackfillCode(MAP_BACKFILL_CODE.NOT_INTERVALS_ACTIVITY),
        };
    }
    return { canFetch: true };
}

/**
 * @param {object} activity
 * @param {IntervalsMapBackfillOutcomeStatus} status
 * @param {string} code
 * @param {{ httpStatus?: number }} [ctx]
 * @returns {IntervalsMapBackfillOutcome}
 */
export function buildMapBackfillOutcome(activity, status, code, ctx = {}) {
    return {
        id: String(activity?.id ?? ''),
        date: activity?.date != null ? String(activity.date) : undefined,
        title: activity?.title != null ? String(activity.title) : undefined,
        type: activity?.type != null ? String(activity.type) : undefined,
        status,
        code,
        message: messageForMapBackfillCode(code, ctx),
    };
}

/**
 * @param {object[] | null | undefined} activities
 * @returns {{ toFetch: object[], preSkipped: IntervalsMapBackfillOutcome[] }}
 */
export function planIntervalsMapBackfillFromActivities(activities) {
    const list = Array.isArray(activities) ? activities : [];
    const needing = list.filter(activityNeedsIntervalsMapPolyline);
    /** @type {object[]} */
    const toFetch = [];
    /** @type {IntervalsMapBackfillOutcome[]} */
    const preSkipped = [];

    for (const act of needing) {
        const pre = precheckIntervalsMapBackfill(act);
        if (pre.canFetch) {
            toFetch.push(act);
        } else if (pre.code === MAP_BACKFILL_CODE.NOT_INTERVALS_ACTIVITY) {
            preSkipped.push(buildMapBackfillOutcome(act, 'skipped', pre.code));
        }
    }

    return { toFetch, preSkipped };
}
