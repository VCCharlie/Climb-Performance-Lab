/**
 * Client helpers for climb logbook server sync (date range + route source).
 */

import { siteDateToYmd, ymdInRangeInclusive } from './stravaVsLogGap.js';
import { activityHasRoutePolylineForSource } from './activityRouteMapCoverage.js';
import { isValidCustomDateRange, resolveDraftYmd } from './customDateRange.js';
import {
    labelClimbLogbookRouteSource,
    normalizeClimbLogbookRouteSource,
} from './climbLogbookRouteSource.js';

/**
 * @typedef {import('./climbLogbookRouteSource.js').ClimbLogbookRouteSource} ClimbLogbookRouteSource
 */

/**
 * @typedef {{
 *   startDate: string,
 *   endDate: string,
 *   routeSource: ClimbLogbookRouteSource,
 *   requestedAt: string,
 *   requestId: string,
 * }} ClimbLogbookSyncRequest
 */

/**
 * @typedef {{
 *   state?: 'queued' | 'running' | 'completed' | 'error',
 *   routeSource?: ClimbLogbookRouteSource,
 *   jobStartDate?: string,
 *   jobEndDate?: string,
 *   ridesWithRouteInBatch?: number,
 *   firestoreDocsScanned?: number,
 *   docsOutsidePeriod?: number,
 *   matchesWritten?: number,
 *   regionsDone?: number,
 *   regionsTotal?: number,
 *   message?: string,
 *   updatedAt?: string,
 * }} ClimbLogbookSyncStatus
 */

/**
 * @param {string} startYmd
 * @param {string} endYmd
 * @returns {{ ok: true, startDate: string, endDate: string } | { ok: false, error: string }}
 */
export function validateClimbLogbookDateRange(startYmd, endYmd) {
    const startDate = resolveDraftYmd(startYmd);
    const endDate = resolveDraftYmd(endYmd);
    if (!isValidCustomDateRange(startDate, endDate)) {
        return { ok: false, error: 'Choose a valid start and end date (dd/mm/yyyy).' };
    }
    return { ok: true, startDate, endDate };
}

/**
 * @param {object[] | null | undefined} activities
 * @param {string} startDate ISO YYYY-MM-DD
 * @param {string} endDate ISO YYYY-MM-DD
 * @param {ClimbLogbookRouteSource} routeSource
 */
export function summarizeClimbLogbookPreview(activities, startDate, endDate, routeSource) {
    const list = activities || [];
    let firestoreDocsScanned = list.length;
    let docsOutsidePeriod = 0;
    let ridesInPeriod = 0;
    let ridesWithRouteInBatch = 0;

    for (const act of list) {
        const ymd = siteDateToYmd(act?.date);
        if (!ymdInRangeInclusive(ymd, startDate, endDate)) {
            docsOutsidePeriod += 1;
            continue;
        }
        ridesInPeriod += 1;
        if (activityHasRoutePolylineForSource(act, routeSource)) {
            ridesWithRouteInBatch += 1;
        }
    }

    return {
        firestoreDocsScanned,
        docsOutsidePeriod,
        ridesInPeriod,
        ridesWithRouteInBatch,
    };
}

/**
 * @param {ClimbLogbookSyncStatus | null | undefined} status
 * @returns {string[]}
 */
export function formatClimbLogbookSyncStatusLines(status) {
    if (!status || typeof status !== 'object') return [];

    const lines = [];
    const source = normalizeClimbLogbookRouteSource(status.routeSource);
    const state = String(status.state || '').toLowerCase();

    if (state) {
        const sourceLabel = source ? labelClimbLogbookRouteSource(source) : 'Server';
        const stateLabel = state === 'running'
            ? 'running'
            : state === 'completed'
                ? 'completed'
                : state === 'error'
                    ? 'failed'
                    : state;
        lines.push(`Climb logbook sync · ${sourceLabel} · ${stateLabel}`);
    }

    if (status.jobStartDate && status.jobEndDate) {
        lines.push(`Job period: ${status.jobStartDate}${status.jobEndDate !== status.jobStartDate ? ` — ${status.jobEndDate}` : ''}`);
    }

    if (Number.isFinite(status.firestoreDocsScanned)) {
        lines.push(`Firestore docs scanned: ${status.firestoreDocsScanned}`);
    }
    if (Number.isFinite(status.docsOutsidePeriod) && status.docsOutsidePeriod > 0) {
        lines.push(`${status.docsOutsidePeriod} doc(s) outside selected period (filtered after query)`);
    }
    if (Number.isFinite(status.ridesWithRouteInBatch)) {
        lines.push(`Rides with route in CPL (this batch): ${status.ridesWithRouteInBatch}`);
    }
    if (Number.isFinite(status.matchesWritten)) {
        lines.push(`Logbook updated (matchesWritten): ${status.matchesWritten}`);
    }
    if (Number.isFinite(status.regionsDone) && Number.isFinite(status.regionsTotal)) {
        lines.push(`Regions: ${status.regionsDone}/${status.regionsTotal} regions`);
    }
    if (status.message) {
        lines.push(String(status.message));
    }
    if (status.updatedAt) {
        const when = new Date(status.updatedAt);
        if (!Number.isNaN(when.getTime())) {
            lines.push(`Last saved: ${when.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' })}`);
        }
    }

    return lines;
}

/**
 * @returns {string}
 */
export function newClimbLogbookRequestId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
