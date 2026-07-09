/**
 * Safe localStorage/sessionStorage writes with quota recovery.
 * Large Strava scan caches and intervals_data_* entries can fill the ~5MB browser quota.
 */

const INTERVALS_CACHE_PREFIX = 'intervals_data_';
const STRAVA_SCAN_PREFIX = 'stravaVsLogScan_v';
const INTERVALS_CACHE_TTL_MS = 60 * 60 * 1000;

/** @param {unknown} err */
export function isQuotaExceededError(err) {
    if (!err || typeof err !== 'object') return false;
    const e = /** @type {{ name?: string, code?: number }} */ (err);
    return e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014;
}

/**
 * Remove stale or bulky cache entries to free localStorage space.
 * @param {{ aggressive?: boolean }} [opts] aggressive = drop all intervals + Strava scan caches
 * @returns {number} keys removed
 */
export function pruneLocalStorageCaches({ aggressive = false } = {}) {
    if (typeof localStorage === 'undefined') return 0;

    const keysToRemove = [];
    const now = Date.now();

    for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key) continue;

        if (key.startsWith(INTERVALS_CACHE_PREFIX)) {
            if (aggressive) {
                keysToRemove.push(key);
                continue;
            }
            try {
                const raw = localStorage.getItem(key);
                const parsed = raw ? JSON.parse(raw) : null;
                const age = parsed?.timestamp ? now - parsed.timestamp : Infinity;
                if (!parsed?.timestamp || age > INTERVALS_CACHE_TTL_MS) {
                    keysToRemove.push(key);
                }
            } catch {
                keysToRemove.push(key);
            }
        }

        if (aggressive && key.startsWith(STRAVA_SCAN_PREFIX)) {
            keysToRemove.push(key);
        }
    }

    let removed = 0;
    for (const key of [...new Set(keysToRemove)]) {
        try {
            localStorage.removeItem(key);
            removed += 1;
        } catch {
            /* ignore */
        }
    }
    return removed;
}

/**
 * Try setItem; on quota error prune caches and retry. Never throws QuotaExceededError.
 * @returns {boolean} true when value was stored
 */
export function safeLocalStorageSet(key, value) {
    if (typeof localStorage === 'undefined') return false;

    const attempt = () => {
        localStorage.setItem(key, value);
        return true;
    };

    try {
        return attempt();
    } catch (err) {
        if (!isQuotaExceededError(err)) throw err;
    }

    pruneLocalStorageCaches({ aggressive: true });

    try {
        return attempt();
    } catch (err) {
        if (!isQuotaExceededError(err)) throw err;
        console.warn('[safeStorage] localStorage full; could not persist key:', key);
        return false;
    }
}

/**
 * @returns {boolean} true when value was stored
 */
export function safeSessionStorageSet(key, value) {
    if (typeof sessionStorage === 'undefined') return false;
    try {
        sessionStorage.setItem(key, value);
        return true;
    } catch (err) {
        if (!isQuotaExceededError(err)) throw err;
        console.warn('[safeStorage] sessionStorage full; could not persist key:', key);
        return false;
    }
}

/** Boot-time maintenance: prune expired caches before React mounts. */
export function maintainBrowserStorageOnBoot() {
    try {
        pruneLocalStorageCaches({ aggressive: false });
    } catch (err) {
        console.warn('[safeStorage] Boot prune failed:', err);
    }
}
