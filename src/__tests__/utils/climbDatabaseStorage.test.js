import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    readClimbDatabaseSnapshot,
    writeClimbDatabaseSnapshot,
    clearClimbDatabaseSnapshotForTests,
} from '../../utils/climbDatabaseStorage';

function createFakeIndexedDb() {
    const stores = new Map();

    const fakeIndexedDB = {
        open(name, version) {
            const db = {
                name,
                version,
                objectStoreNames: {
                    contains(storeName) {
                        return stores.has(`${name}:${storeName}`);
                    },
                },
                createObjectStore(storeName) {
                    const key = `${name}:${storeName}`;
                    if (!stores.has(key)) stores.set(key, new Map());
                    return {
                        put(value, recordKey) {
                            stores.get(key).set(recordKey, value);
                        },
                        get(recordKey) {
                            return {
                                onsuccess: null,
                                onerror: null,
                                result: stores.get(key).get(recordKey),
                            };
                        },
                        delete(recordKey) {
                            stores.get(key).delete(recordKey);
                        },
                    };
                },
                transaction(storeName, mode) {
                    const key = `${name}:${storeName}`;
                    if (!stores.has(key)) stores.set(key, new Map());
                    const storeData = stores.get(key);
                    const store = {
                        put(value, recordKey) {
                            storeData.set(recordKey, value);
                        },
                        get(recordKey) {
                            const req = {
                                onsuccess: null,
                                onerror: null,
                                result: storeData.get(recordKey),
                            };
                            queueMicrotask(() => req.onsuccess?.({ target: req }));
                            return req;
                        },
                        delete(recordKey) {
                            storeData.delete(recordKey);
                        },
                    };
                    const tx = {
                        objectStore: () => store,
                        oncomplete: null,
                        onerror: null,
                    };
                    queueMicrotask(() => tx.oncomplete?.());
                    return tx;
                },
                close() {},
            };

            const request = {
                onsuccess: null,
                onerror: null,
                onupgradeneeded: null,
                result: db,
            };
            queueMicrotask(() => {
                request.onupgradeneeded?.({ target: request });
                request.onsuccess?.({ target: request });
            });
            return request;
        },
    };

    return { fakeIndexedDB, stores };
}

describe('climbDatabaseStorage', () => {
    let fakeIndexedDB;

    beforeEach(() => {
        fakeIndexedDB = createFakeIndexedDb().fakeIndexedDB;
        globalThis.indexedDB = fakeIndexedDB;
    });

    afterEach(async () => {
        await clearClimbDatabaseSnapshotForTests();
        delete globalThis.indexedDB;
    });

    it('returns null when revision does not match', async () => {
        await writeClimbDatabaseSnapshot('old-rev', [{ id: 'x', name: 'Test' }]);
        const read = await readClimbDatabaseSnapshot('new-rev');
        expect(read).toBeNull();
    });

    it('round-trips climb snapshots for the active revision', async () => {
        const climbs = [
            { id: 'fr_alpe', name: "Alpe d'Huez", country: 'FR' },
            { id: 'zw_alpe', name: 'Alpe du Zwift', country: 'ZWIFT' },
        ];
        await writeClimbDatabaseSnapshot('rev-1', climbs);
        const read = await readClimbDatabaseSnapshot('rev-1');
        expect(read).toEqual(climbs);
    });
});
