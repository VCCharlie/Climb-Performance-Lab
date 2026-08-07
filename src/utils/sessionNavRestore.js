/**
 * Persist main tab + DataHub sub-tab before leaving the SPA (e.g. Strava segment in same tab),
 * then read once on next load so Back returns to the right place.
 */

export const SESSION_NAV_RESTORE_KEY = 'cpl_nav_restore_v1';
export const SESSION_MAIN_TAB_KEY = 'cpl_main_tab_v1';

const MAIN_TAB_IDS = new Set([
    'dashboard', 'physics', 'activities', 'training', 'race', 'gearoptimizer',
    'profiler', 'bucketlist', 'climbmap', 'weather',
]);

const DASHBOARD_SUB_TABS = new Set(['overview', 'form', 'power', 'distance', 'volume', 'compare', 'strava']);

const DATAHUB_INTERNAL_TABS = new Set(['log', 'import']);

let cachedNavRestorePayload = null;

/**
 * Read one-shot nav restore payload once per app boot (StrictMode-safe).
 * @returns {{ activeTab?: string, dataHubInternalTab?: string }}
 */
export function consumeNavRestoreOnce() {
    if (cachedNavRestorePayload === null) {
        cachedNavRestorePayload = consumeNavRestore() ?? {};
    }
    return cachedNavRestorePayload;
}

/**
 * Persist main tab across reloads (deploy recovery, chunk heal, auth boot).
 * @param {string} tabId
 */
export function persistMainTab(tabId) {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    if (!tabId || !MAIN_TAB_IDS.has(tabId)) return;
    try {
        window.sessionStorage.setItem(SESSION_MAIN_TAB_KEY, tabId);
    } catch {
        /* quota / private mode */
    }
}

/**
 * @returns {string | null}
 */
export function readPersistedMainTab() {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    try {
        const tab = window.sessionStorage.getItem(SESSION_MAIN_TAB_KEY);
        return tab && MAIN_TAB_IDS.has(tab) ? tab : null;
    } catch {
        return null;
    }
}

/**
 * Initial main tab: external nav restore → session tab → dashboard.
 * @returns {string}
 */
export function resolveInitialMainTab() {
    const restored = consumeNavRestoreOnce();
    if (restored?.activeTab && MAIN_TAB_IDS.has(restored.activeTab)) {
        persistMainTab(restored.activeTab);
        return restored.activeTab;
    }
    const persisted = readPersistedMainTab();
    if (persisted) return persisted;
    return 'dashboard';
}

/**
 * Dashboard sub-tab from nav restore payload (legacy strava-profile → dashboard strava).
 * @returns {string}
 */
export function resolveInitialDashboardSubTab() {
    const restored = consumeNavRestoreOnce();
    if (restored?.dashboardSubTab && DASHBOARD_SUB_TABS.has(restored.dashboardSubTab)) {
        return restored.dashboardSubTab;
    }
    if (restored?.dataHubInternalTab === 'strava-profile') {
        return 'strava';
    }
    if (typeof window !== 'undefined' && window.sessionStorage) {
        try {
            const v = window.sessionStorage.getItem('cpl.dashboard.subTab.v1');
            if (v && DASHBOARD_SUB_TABS.has(v)) return v;
        } catch {
            /* ignore */
        }
    }
    return 'overview';
}

/**
 * DataHub sub-tab from the same one-shot nav restore payload.
 * @returns {string}
 */
export function resolveInitialDataHubInternalTab() {
    const restored = consumeNavRestoreOnce();
    const t = restored?.dataHubInternalTab;
    if (t === 'strava-profile') return 'log';
    return t && DATAHUB_INTERNAL_TABS.has(t) ? t : 'log';
}

/**
 * @param {{ activeTab?: string, dataHubInternalTab?: string }} payload
 */
export function stashNavRestoreBeforeExternalNav(payload = {}) {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    try {
        const data = {
            activeTab: 'dashboard',
            dashboardSubTab: 'strava',
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
