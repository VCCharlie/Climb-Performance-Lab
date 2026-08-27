import { safeLocalStorageSet } from './safeStorage';

export const TAB_STATE_STORAGE_KEYS = {
    racePacing: 'cpl.racePacingState.v1',
    gearOptimizer: 'cpl.gearOptimizerState.v1',
    climbProfiler: 'cpl.climbProfilerState.v1',
    weatherClimb: 'cpl.weatherClimbState.v1',
    fueling: 'cpl.fuelingState.v1',
};

/**
 * Target climb power at ~85% FTP (Weather + Gear defaults).
 * @param {number | undefined | null} ftp
 */
export function defaultTargetPowerFromFtp(ftp) {
    const n = Number(ftp);
    const base = Number.isFinite(n) && n > 0 ? n : 280;
    return base * 0.85;
}

/**
 * @template T extends Record<string, unknown>
 * @param {string} key
 * @param {T} fallback
 * @returns {T}
 */
export function readPersistedTabState(key, fallback) {
    if (typeof localStorage === 'undefined') return fallback;
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fallback;
        return { ...fallback, ...parsed };
    } catch {
        return fallback;
    }
}

/**
 * @param {string} key
 * @param {Record<string, unknown>} state
 */
export function writePersistedTabState(key, state) {
    safeLocalStorageSet(key, JSON.stringify(state));
}

/** Debounce delay for tab-state localStorage writes (ms). */
export const TAB_STATE_PERSIST_DEBOUNCE_MS = 400;
