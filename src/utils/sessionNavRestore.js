/**
 * Persist main tab + DataHub sub-tab before leaving the SPA (e.g. Strava segment in same tab),
 * then read once on next load so Back returns to the right place.
 */

export const SESSION_NAV_RESTORE_KEY = 'cpl_nav_restore_v1';

/**
 * @param {{ activeTab?: string, dataHubInternalTab?: string }} payload
 */
export function stashNavRestoreBeforeExternalNav(payload = {}) {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    try {
        const data = {
            activeTab: 'activities',
            dataHubInternalTab: 'strava-profile',
            ...payload,
        };
        window.sessionStorage.setItem(SESSION_NAV_RESTORE_KEY, JSON.stringify(data));
    } catch {
        /* quota / private mode */
    }
}

/**
 * Read and remove one-shot restore payload (call once on app mount).
 * @returns {{ activeTab?: string, dataHubInternalTab?: string } | null}
 */
export function consumeNavRestore() {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    try {
        const raw = window.sessionStorage.getItem(SESSION_NAV_RESTORE_KEY);
        if (!raw) return null;
        window.sessionStorage.removeItem(SESSION_NAV_RESTORE_KEY);
        const o = JSON.parse(raw);
        return o && typeof o === 'object' ? o : null;
    } catch {
        return null;
    }
}
