/**
 * Lazy loader for the extended climb database (~3300 real-world climbs).
 * Core Zwift climbs ship in the main bundle; extended data is a separate chunk.
 */

import {
    CORE_CLIMB_DATABASE,
    buildFullClimbDatabase,
    CLIMB_DATABASE_STORAGE_REVISION,
} from '../climbs';
import {
    readClimbDatabaseSnapshot,
    writeClimbDatabaseSnapshot,
} from '../utils/climbDatabaseStorage';

let loadPromise = null;
let cachedFullDatabase = null;

/**
 * @returns {object[]} Core climbs available synchronously (Zwift + portals).
 */
export function getCoreClimbDatabase() {
    return CORE_CLIMB_DATABASE;
}

/**
 * @returns {object[]} Full database when loaded, otherwise core climbs only.
 */
export function getClimbDatabaseSync() {
    return cachedFullDatabase || CORE_CLIMB_DATABASE;
}

export function isFullClimbDatabaseLoaded() {
    return cachedFullDatabase != null;
}

async function loadFromNetworkChunk() {
    const mod = await import('../climbs_extended.js');
    const full = buildFullClimbDatabase(mod.CLIMB_DATABASE);
    writeClimbDatabaseSnapshot(CLIMB_DATABASE_STORAGE_REVISION, full).catch(() => {});
    return full;
}

/**
 * Dynamic import of climbs_extended.js — deduped across callers.
 * Tries IndexedDB snapshot first (Bolt 4.4), then network chunk.
 * @returns {Promise<object[]>}
 */
export function loadFullClimbDatabase() {
    if (cachedFullDatabase) {
        return Promise.resolve(cachedFullDatabase);
    }
    if (!loadPromise) {
        loadPromise = (async () => {
            const fromStorage = await readClimbDatabaseSnapshot(CLIMB_DATABASE_STORAGE_REVISION);
            if (fromStorage?.length) {
                cachedFullDatabase = fromStorage;
                return cachedFullDatabase;
            }
            cachedFullDatabase = await loadFromNetworkChunk();
            return cachedFullDatabase;
        })().catch((err) => {
            loadPromise = null;
            throw err;
        });
    }
    return loadPromise;
}

/** @returns {object} Safe default climb for initial UI state */
export function getDefaultClimb() {
    return CORE_CLIMB_DATABASE[0] || {
        id: 'default',
        name: 'Select a climb',
        lengthKm: 0,
        elevation: 0,
        avgGrade: 0,
        country: 'ZWIFT',
    };
}

/** Test-only: reset in-memory cache between cases. */
export function resetClimbDatabaseCacheForTests() {
    cachedFullDatabase = null;
    loadPromise = null;
}
