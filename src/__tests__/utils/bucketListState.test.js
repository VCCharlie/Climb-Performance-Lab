import { describe, it, expect } from 'vitest';
import {
    migrateLegacyBucketState,
    idsByStatus,
    setClimbBucketStatus,
    hasBucketStatus,
} from '../../utils/bucketListState';

describe('migrateLegacyBucketState', () => {
    it('migrates legacy array schema', () => {
        const state = migrateLegacyBucketState({
            done: ['fr_alpe'],
            planned: ['it_stelvio'],
            want: [],
        });
        expect(state.climbStatus.fr_alpe).toBe('done');
        expect(state.climbStatus.it_stelvio).toBe('planned');
        expect(state.climbPbs).toEqual({});
    });

    it('preserves canonical schema', () => {
        const state = migrateLegacyBucketState({
            climbStatus: { fr_alpe: 'done' },
            climbPbs: { fr_alpe: { normPower: 280 } },
        });
        expect(state.climbStatus.fr_alpe).toBe('done');
        expect(state.climbPbs.fr_alpe.normPower).toBe(280);
    });
});

describe('setClimbBucketStatus', () => {
    it('toggles status off when same status clicked', () => {
        const base = { climbStatus: { a: 'planned' }, climbPbs: {} };
        const next = setClimbBucketStatus(base, 'a', 'planned');
        expect(next.climbStatus.a).toBeUndefined();
    });

    it('sets new status', () => {
        const base = { climbStatus: {}, climbPbs: {} };
        const next = setClimbBucketStatus(base, 'b', 'want');
        expect(hasBucketStatus(next, 'b', 'want')).toBe(true);
        expect(idsByStatus(next, 'want')).toEqual(['b']);
    });
});
