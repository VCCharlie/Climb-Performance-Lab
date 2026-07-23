import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    duplicatePairKey,
    duplicatePairFingerprint,
    recordDuplicatePairResolution,
    getDuplicatePairResolution,
    shouldHideDuplicatePair,
    filterStoredDuplicatePairs,
    duplicateResolutionSummary,
} from '../../utils/duplicateResolutions';

const actA = {
    id: 'i100',
    date: '2025-06-15T08:00:00',
    distance: 42.5,
    moving_time: 3600,
    strava_id: '9001',
};
const actB = {
    id: 'i200',
    date: '2025-06-15T08:05:00',
    distance: 42.4,
    moving_time: 3590,
    strava_id: '9002',
};

describe('duplicateResolutions', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it('builds order-independent pair keys', () => {
        expect(duplicatePairKey(actA, actB)).toBe('i100::i200');
        expect(duplicatePairKey(actB, actA)).toBe('i100::i200');
    });

    it('records and reads keepBoth resolution', () => {
        recordDuplicatePairResolution(actA, actB, 'keepBoth');
        expect(getDuplicatePairResolution(actA, actB)?.action).toBe('keepBoth');
        expect(shouldHideDuplicatePair(actA, actB)).toBe(true);
    });

    it('filters keepBoth pairs from duplicate list', () => {
        recordDuplicatePairResolution(actA, actB, 'keepBoth');
        const other = {
            a: { id: 'x', date: '2025-07-01', distance: 10, moving_time: 1800 },
            b: { id: 'y', date: '2025-07-01', distance: 10.1, moving_time: 1810 },
            reason: 'test',
        };
        const filtered = filterStoredDuplicatePairs([
            { a: actA, b: actB, reason: 'hidden' },
            other,
        ]);
        expect(filtered).toHaveLength(1);
        expect(filtered[0].a.id).toBe('x');
    });

    it('remembers keepA with kept id', () => {
        recordDuplicatePairResolution(actA, actB, 'keepA');
        const saved = getDuplicatePairResolution(actA, actB);
        expect(saved?.action).toBe('keepA');
        expect(saved?.keptId).toBe('i100');
        expect(shouldHideDuplicatePair(actA, actB)).toBe(false);
    });

    it('matches fingerprint when ids change after re-import', () => {
        recordDuplicatePairResolution(actA, actB, 'keepBoth');
        const reimportA = { ...actA, id: 'i999' };
        const reimportB = { ...actB, id: 'i888' };
        expect(shouldHideDuplicatePair(reimportA, reimportB)).toBe(true);
        expect(duplicatePairFingerprint(actA, actB)).toBe(duplicatePairFingerprint(reimportA, reimportB));
    });

    it('summarizes saved resolutions for UI', () => {
        expect(duplicateResolutionSummary({ action: 'keepB' })).toBe('Previously: kept Version B');
        expect(duplicateResolutionSummary(null)).toBeNull();
    });
});
