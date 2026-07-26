import { formatDateDDMMYYYY } from './formatters';

export const ACTIVITY_LOG_INTERVALS_LAST_SYNC_KEY = 'cpl.intervals.lastSyncAt';

/**
 * @returns {string | null} ISO timestamp
 */
export function readLastCloudSyncAt() {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem('app_last_sync_time');
    if (!raw || typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    return trimmed || null;
}

/**
 * @returns {string | null} ISO timestamp
 */
export function readLastIntervalsSyncAt() {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(ACTIVITY_LOG_INTERVALS_LAST_SYNC_KEY);
    if (!raw || typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    return trimmed || null;
}

function formatSyncDate(iso) {
    if (!iso || typeof iso !== 'string') return null;
    const slice = iso.slice(0, 10);
    if (slice.length < 10) return null;
    return formatDateDDMMYYYY(slice);
}

/**
 * Persistent Activity Log sync summary (English UI).
 * @param {{
 *   isSignedIn?: boolean,
 *   firestoreSyncStatus?: string | null,
 *   isLoadingActivities?: boolean,
 *   activityCount?: number,
 *   lastActivityDate?: string | null,
 *   lastCloudSyncAt?: string | null,
 *   lastIntervalsSyncAt?: string | null,
 *   isIntervalsBusy?: boolean,
 * }} opts
 */
export function formatActivityLogSyncLabel(opts = {}) {
    const {
        isSignedIn = false,
        firestoreSyncStatus = 'idle',
        isLoadingActivities = false,
        activityCount = 0,
        lastActivityDate = null,
        lastCloudSyncAt = null,
        lastIntervalsSyncAt = null,
        isIntervalsBusy = false,
    } = opts;

    if (isIntervalsBusy) {
        return 'Intervals sync in progress…';
    }
    if (firestoreSyncStatus === 'syncing') {
        return 'Saving activities to cloud…';
    }

    if (!isSignedIn) {
        const countPart = activityCount > 0 ? `${activityCount.toLocaleString('en-GB')} activities on this device` : 'No activities yet';
        return `${countPart}. Sign in to sync your log across devices.`;
    }

    if (isLoadingActivities) {
        return 'Loading activities from cloud…';
    }

    const parts = [];

    if (firestoreSyncStatus === 'error') {
        parts.push('Cloud sync error — check your connection');
    } else if (firestoreSyncStatus === 'synced') {
        parts.push('Signed in — activity log synced to cloud');
    } else {
        parts.push('Signed in — activity log uses cloud when available');
    }

    parts.push(`${activityCount.toLocaleString('en-GB')} in log`);

    const latest = lastActivityDate ? formatSyncDate(String(lastActivityDate).slice(0, 10)) : null;
    if (latest) parts.push(`latest ride ${latest}`);

    const cloud = formatSyncDate(lastCloudSyncAt);
    if (cloud) parts.push(`last cloud update ${cloud}`);

    const intervals = formatSyncDate(lastIntervalsSyncAt);
    if (intervals) parts.push(`last Intervals import ${intervals}`);

    return parts.join(' · ');
}
