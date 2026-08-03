/**
 * Deployment recovery utilities for zero-downtime, self-healing SPA reloads.
 *
 * Handles:
 *  - Stale service-worker / Cache API shells after a new deploy
 *  - Failed dynamic-import chunks (React.lazy / code-splitting)
 *  - Version mismatches between stored build ID and current bundle
 *
 * Recovery runs at most once per browser tab (sessionStorage guard).
 */

import { pruneLocalStorageCaches } from './safeStorage.js';
import { readPersistedMainTab } from './sessionNavRestore.js';

/** @type {string|undefined} */
const BUILD_ID = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : undefined;

export const RECOVERY_ATTEMPT_KEY = 'cpl.deploy.recoveryAttempted.v1';
export const STORED_BUILD_ID_KEY = 'cpl.app.buildId.v1';

const CHUNK_ERROR_PATTERNS = [
    /failed to fetch dynamically imported module/i,
    /error loading dynamically imported module/i,
    /importing a module script failed/i,
    /loading chunk [\w-]+ failed/i,
    /chunkloaderror/i,
    /unable to preload css/i,
    /expected a javascript module script/i,
];

const REFERENCE_ERROR_PATTERNS = [
    /is not defined$/,
    /can't find variable:/i,
];

/**
 * @param {unknown} value
 * @returns {string}
 */
function errorToMessage(value) {
    if (value instanceof Error) return value.message || value.name || String(value);
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && 'message' in value) {
        return String(/** @type {{ message: unknown }} */ (value).message);
    }
    return String(value);
}

/**
 * @param {unknown} error
 * @returns {boolean}
 */
export function isChunkLoadError(error) {
    const message = errorToMessage(error);
    const name = error instanceof Error ? error.name : '';
    if (name === 'ChunkLoadError') return true;
    return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * ReferenceErrors after deploy often mean the browser executed a stale JS shell
 * that references symbols removed or moved in the new build.
 *
 * @param {unknown} error
 * @returns {boolean}
 */
export function isDeployReferenceError(error) {
    if (!(error instanceof ReferenceError)) return false;
    const message = errorToMessage(error);
    return REFERENCE_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * @param {unknown} error
 * @returns {boolean}
 */
export function isRecoverableDeployError(error) {
    if (!error) return false;
    return isChunkLoadError(error) || isDeployReferenceError(error);
}

/**
 * @returns {boolean}
 */
export function hasRecoveryBeenAttempted() {
    if (typeof sessionStorage === 'undefined') return false;
    try {
        return sessionStorage.getItem(RECOVERY_ATTEMPT_KEY) === '1';
    } catch {
        return false;
    }
}

/**
 * Marks that an automatic recovery reload was triggered in this tab.
 */
export function markRecoveryAttempted() {
    if (typeof sessionStorage === 'undefined') return;
    try {
        sessionStorage.setItem(RECOVERY_ATTEMPT_KEY, '1');
    } catch {
        /* ignore quota errors */
    }
}

/**
 * Clears deploy-related caches without reloading.
 * @returns {Promise<void>}
 */
export async function clearDeployCaches() {
    try {
        pruneLocalStorageCaches({ aggressive: true });
    } catch (err) {
        console.warn('[deployRecovery] localStorage prune failed:', err);
    }

    try {
        clearSensitiveLocalStorage();
    } catch (err) {
        console.warn('[deployRecovery] sensitive storage clear failed:', err);
    }

    if ('serviceWorker' in navigator) {
        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map((registration) => registration.unregister()));
        } catch (err) {
            console.warn('[deployRecovery] service worker unregister failed:', err);
        }
    }

    if ('caches' in window) {
        try {
            const keys = await caches.keys();
            await Promise.all(keys.map((key) => caches.delete(key)));
        } catch (err) {
            console.warn('[deployRecovery] Cache API clear failed:', err);
        }
    }
}

/**
 * Persists the active build ID after a successful boot.
 * @param {string} [buildId]
 */
export function persistCurrentBuildId(buildId = BUILD_ID) {
    if (!buildId || typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(STORED_BUILD_ID_KEY, buildId);
    } catch (err) {
        console.warn('[deployRecovery] Could not persist build ID:', err);
    }
}

/**
 * @returns {string|null}
 */
export function readStoredBuildId() {
    if (typeof localStorage === 'undefined') return null;
    try {
        return localStorage.getItem(STORED_BUILD_ID_KEY);
    } catch {
        return null;
    }
}

/**
 * When a new build ships, proactively clear stale caches before React mounts.
 * @returns {Promise<boolean>} true when caches were cleared due to version mismatch
 */
export async function reconcileBuildVersionOnBoot() {
    if (!BUILD_ID) return false;

    const stored = readStoredBuildId();
    if (!stored) {
        persistCurrentBuildId(BUILD_ID);
        return false;
    }

    if (stored === BUILD_ID) return false;

    console.info('[deployRecovery] Build ID changed (%s → %s). Clearing stale caches.', stored, BUILD_ID);
    await clearDeployCaches();
    persistCurrentBuildId(BUILD_ID);
    return true;
}

/**
 * One-shot silent recovery: clear caches and hard-reload the tab.
 * @returns {Promise<{ reloaded: boolean }>}
 */
export async function performSilentDeployRecovery() {
    if (hasRecoveryBeenAttempted()) {
        console.warn('[deployRecovery] Recovery already attempted in this tab; skipping auto-reload.');
        return { reloaded: false };
    }

    markRecoveryAttempted();
    const tab = readPersistedMainTab();
    if (tab) {
        try {
            sessionStorage.setItem('cpl_main_tab_v1', tab);
        } catch {
            /* ignore */
        }
    }
    await clearDeployCaches();
    window.location.reload();
    return { reloaded: true };
}

/**
 * Installs global listeners for chunk-load failures outside React error boundaries
 * (e.g. unhandled promise rejections from React.lazy()).
 */
export function installGlobalDeployRecoveryHandlers() {
    if (typeof window === 'undefined') return;

    const handleRecoverableError = (error) => {
        if (!isRecoverableDeployError(error)) return;
        if (hasRecoveryBeenAttempted()) return;
        console.warn('[deployRecovery] Recoverable deploy error detected — auto-healing:', error);
        void performSilentDeployRecovery();
    };

    window.addEventListener('unhandledrejection', (event) => {
        handleRecoverableError(event.reason);
    });

    window.addEventListener('error', (event) => {
        handleRecoverableError(event.error ?? event.message);
    });
}

/**
 * Boot-time entry: version reconciliation + global handlers.
 * Call before React mount; await so deploy cache clears finish before auth redirect.
 */
export async function bootstrapDeployRecoveryForBoot() {
    installGlobalDeployRecoveryHandlers();
    return reconcileBuildVersionOnBoot();
}

/**
 * Boot-time entry: version reconciliation + global handlers.
 * Call synchronously before ReactDOM.createRoot().
 */
export function bootstrapDeployRecovery() {
    installGlobalDeployRecoveryHandlers();
    void reconcileBuildVersionOnBoot();
}
