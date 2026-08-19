/**
 * IndexedDB snapshot for the merged climb database (Bolt 4.4).
 * Avoids re-downloading + parsing climbs_extended.js on repeat visits.
 */

const DB_NAME = 'cpl-climb-database-v1';
const STORE_NAME = 'snapshots';
const RECORD_KEY = 'full';

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onerror = () => reject(request.error);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
    });
}

function runStoreRequest(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * @param {string} revision Must match {@link CLIMB_DATABASE_STORAGE_REVISION} in climbs.js
 * @returns {Promise<object[] | null>}
 */
export async function readClimbDatabaseSnapshot(revision) {
    if (typeof indexedDB === 'undefined') return null;

    let db;
    try {
        db = await openDatabase();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const row = await runStoreRequest(tx.objectStore(STORE_NAME).get(RECORD_KEY));
        if (!row || row.revision !== revision || !Array.isArray(row.climbs) || !row.climbs.length) {
            return null;
        }
        return row.climbs;
    } catch {
        return null;
    } finally {
        db?.close();
    }
}

/**
 * @param {string} revision
 * @param {object[]} climbs
 */
export async function writeClimbDatabaseSnapshot(revision, climbs) {
    if (typeof indexedDB === 'undefined' || !revision || !climbs?.length) return;

    let db;
    try {
        db = await openDatabase();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put({ revision, climbs, savedAt: Date.now() }, RECORD_KEY);
        await new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch {
        /* non-fatal — network chunk remains fallback */
    } finally {
        db?.close();
    }
}

/** Test-only: wipe stored snapshot. */
export async function clearClimbDatabaseSnapshotForTests() {
    if (typeof indexedDB === 'undefined') return;
    let db;
    try {
        db = await openDatabase();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(RECORD_KEY);
        await new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch {
        /* ignore */
    } finally {
        db?.close();
    }
}
