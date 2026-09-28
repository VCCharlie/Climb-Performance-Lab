import { describe, it, expect, beforeEach } from 'vitest';
import {
    readPersistedSyncDepth,
    writePersistedSyncDepth,
    isFullSyncDepth,
    resolveInitialSyncDepth,
    SYNC_DEPTH_FAST,
    SYNC_DEPTH_FULL,
    INTERVALS_SYNC_DEPTH_STORAGE_KEY,
} from '../../utils/intervalsSyncDepth.js';

describe('intervalsSyncDepth', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('defaults to fast sync depth', () => {
        expect(readPersistedSyncDepth()).toBe(SYNC_DEPTH_FAST);
    });

    it('readPersistedSyncDepth falls back to settings default when localStorage empty', () => {
        expect(readPersistedSyncDepth(SYNC_DEPTH_FULL)).toBe(SYNC_DEPTH_FULL);
    });

    it('resolveInitialSyncDepth prefers localStorage over settings', () => {
        writePersistedSyncDepth(SYNC_DEPTH_FAST);
        expect(resolveInitialSyncDepth({ defaultIntervalsSyncDepth: SYNC_DEPTH_FULL })).toBe(SYNC_DEPTH_FAST);
    });

    it('persists full depth', () => {
        writePersistedSyncDepth(SYNC_DEPTH_FULL);
        expect(localStorage.getItem(INTERVALS_SYNC_DEPTH_STORAGE_KEY)).toBe(SYNC_DEPTH_FULL);
        expect(readPersistedSyncDepth()).toBe(SYNC_DEPTH_FULL);
    });

    it('isFullSyncDepth identifies full mode only', () => {
        expect(isFullSyncDepth(SYNC_DEPTH_FULL)).toBe(true);
        expect(isFullSyncDepth(SYNC_DEPTH_FAST)).toBe(false);
        expect(isFullSyncDepth(undefined)).toBe(false);
    });
});
