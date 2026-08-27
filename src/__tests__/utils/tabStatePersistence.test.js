import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    TAB_STATE_STORAGE_KEYS,
    defaultTargetPowerFromFtp,
    readPersistedTabState,
    writePersistedTabState,
} from '../../utils/tabStatePersistence';

describe('tabStatePersistence', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('computes default target power from FTP', () => {
        expect(defaultTargetPowerFromFtp(300)).toBe(255);
        expect(defaultTargetPowerFromFtp(0)).toBe(280 * 0.85);
    });

    it('reads and writes versioned tab state keys', () => {
        const fallback = { targetIntensity: 0.85, selectedClimbs: [] };
        expect(readPersistedTabState(TAB_STATE_STORAGE_KEYS.racePacing, fallback)).toEqual(fallback);

        writePersistedTabState(TAB_STATE_STORAGE_KEYS.racePacing, {
            targetIntensity: 0.9,
            selectedClimbs: ['alpe'],
        });

        expect(readPersistedTabState(TAB_STATE_STORAGE_KEYS.racePacing, fallback)).toEqual({
            targetIntensity: 0.9,
            selectedClimbs: ['alpe'],
        });
    });

    it('returns fallback when stored JSON is invalid', () => {
        localStorage.setItem(TAB_STATE_STORAGE_KEYS.gearOptimizer, '{not-json');
        const fallback = { targetCadence: 80 };
        expect(readPersistedTabState(TAB_STATE_STORAGE_KEYS.gearOptimizer, fallback)).toEqual(fallback);
    });
});
