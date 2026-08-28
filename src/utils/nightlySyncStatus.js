/**
 * Nightly GitHub Actions sync visibility (server writes Firestore; client reads + local fallback).
 */

export const NIGHTLY_SYNC_LOCAL_KEY = 'cpl.nightlySync.lastRun.v1';

/**
 * @typedef {{ at: string, activitiesSaved?: number, summary?: string }} NightlySyncStatus
 */

/**
 * @returns {NightlySyncStatus | null}
 */
export function readNightlySyncLocalStatus() {
    if (typeof localStorage === 'undefined') return null;
    try {
        const raw = localStorage.getItem(NIGHTLY_SYNC_LOCAL_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.at) return null;
        return parsed;
    } catch {
        return null;
    }
}

/**
 * @param {NightlySyncStatus} status
 */
export function writeNightlySyncLocalStatus(status) {
    if (typeof localStorage === 'undefined' || !status?.at) return;
    try {
        localStorage.setItem(NIGHTLY_SYNC_LOCAL_KEY, JSON.stringify(status));
    } catch {
        /* quota / private mode */
    }
}

/**
 * Merge cloud settings field with optional local fallback.
 *
 * @param {NightlySyncStatus | null | undefined} cloudStatus
 * @returns {NightlySyncStatus | null}
 */
export function resolveNightlySyncStatus(cloudStatus) {
    if (cloudStatus?.at) return cloudStatus;
    return readNightlySyncLocalStatus();
}

/**
 * @param {NightlySyncStatus | null | undefined} status
 * @returns {string | null}
 */
export function formatNightlySyncLine(status) {
    if (!status?.at) return null;
    const when = new Date(status.at);
    if (Number.isNaN(when.getTime())) return null;

    const datePart = when.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });

    const saved = Number(status.activitiesSaved);
    const savedPart = Number.isFinite(saved) && saved >= 0
        ? ` · ${saved} activit${saved === 1 ? 'y' : 'ies'} synced`
        : '';

    const summary = status.summary ? ` · ${status.summary}` : '';
    return `Last nightly sync: ${datePart}${savedPart}${summary}`;
}
