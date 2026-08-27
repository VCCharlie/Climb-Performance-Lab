import { safeLocalStorageSet } from './safeStorage';

export const INTERVALS_SYNC_HEALTH_KEY = 'cpl.intervals.lastSyncSummary.v1';

/**
 * @typedef {{ at: string, added: number, updated: number, skipped: number, summary?: string }} IntervalsSyncHealthSummary
 */

/**
 * @returns {IntervalsSyncHealthSummary | null}
 */
export function readIntervalsSyncHealthSummary() {
    if (typeof localStorage === 'undefined') return null;
    try {
        const raw = localStorage.getItem(INTERVALS_SYNC_HEALTH_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        return parsed;
    } catch {
        return null;
    }
}

/**
 * @param {IntervalsSyncHealthSummary} summary
 */
export function writeIntervalsSyncHealthSummary(summary) {
    safeLocalStorageSet(INTERVALS_SYNC_HEALTH_KEY, JSON.stringify(summary));
}

/**
 * @param {IntervalsSyncHealthSummary | null | undefined} summary
 * @param {string | null | undefined} lastSyncAtIso
 */
export function formatIntervalsSyncHealthLine(summary, lastSyncAtIso) {
    const parts = [];
    const at = summary?.at || lastSyncAtIso;
    if (at && typeof at === 'string') {
        const datePart = at.slice(0, 10);
        if (datePart.length >= 10) parts.push(`Last sync ${datePart}`);
    }
    if (summary) {
        if (summary.added > 0) parts.push(`${summary.added} new`);
        if (summary.updated > 0) parts.push(`${summary.updated} updated`);
        if (summary.skipped > 0) parts.push(`${summary.skipped} skipped`);
    }
    return parts.length > 0 ? parts.join(' · ') : null;
}
