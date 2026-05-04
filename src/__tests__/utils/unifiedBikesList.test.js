import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildUnifiedBikesList, uniqueGearNamesFromActivities } from '../../utils/unifiedBikesList';

describe('uniqueGearNamesFromActivities', () => {
    it('filters raw gear-id-like names', () => {
        const acts = [{ gear_name: 'Road bike' }, { gear_name: 'b12345' }];
        expect(uniqueGearNamesFromActivities(acts)).toEqual(['Road bike']);
    });
});

describe('buildUnifiedBikesList', () => {
    beforeEach(() => {
        const store = { stravaBikesMap: JSON.stringify({ g1: 'Tarmac' }) };
        vi.stubGlobal('localStorage', {
            getItem: (k) => store[k] ?? null,
            setItem: (k, v) => { store[k] = v; },
            removeItem: (k) => { delete store[k]; },
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('merges localStorage bikes and activity gear', () => {
        const list = buildUnifiedBikesList([
            { gear_id: 'g2', gear_name: 'Canyon' },
        ]);
        const ids = list.map((b) => b.id).sort();
        expect(ids).toContain('g1');
        expect(ids).toContain('g2');
    });
});
