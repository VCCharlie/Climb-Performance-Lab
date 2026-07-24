import { describe, it, expect } from 'vitest';
import {
    bucketListSettingsDocId,
    BUCKET_LIST_CLOUD_DEBOUNCE_MS,
    resolveBucketListOnSync,
    newerIsoTimestamp,
} from '../../utils/bucketListCloudSync';

describe('bucketListCloudSync', () => {
    it('builds settings doc id from uid', () => {
        expect(bucketListSettingsDocId('abc123')).toBe('user_abc123');
    });

    it('exports debounce constant', () => {
        expect(BUCKET_LIST_CLOUD_DEBOUNCE_MS).toBeGreaterThan(0);
    });

    it('newerIsoTimestamp picks the latest instant', () => {
        expect(newerIsoTimestamp('2026-01-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z'))
            .toBe('2026-02-01T00:00:00.000Z');
    });

    it('resolveBucketListOnSync prefers cloud when local has no updatedAt', () => {
        const local = { climbStatus: {}, climbPbs: { a: { normPower: 200 } }, updatedAt: null };
        const cloud = { climbStatus: {}, climbPbs: { b: { normPower: 220 } } };
        const resolved = resolveBucketListOnSync(local, null, cloud, '2026-01-01T00:00:00.000Z');
        expect(resolved.source).toBe('cloud');
        expect(resolved.state.climbPbs.b?.normPower).toBe(220);
    });

    it('resolveBucketListOnSync prefers cloud when cloud updatedAt is newer', () => {
        const local = { climbStatus: {}, climbPbs: { a: { normPower: 200 } }, updatedAt: '2026-01-01T00:00:00.000Z' };
        const cloud = { climbStatus: {}, climbPbs: { b: { normPower: 220 } } };
        const resolved = resolveBucketListOnSync(
            local,
            local.updatedAt,
            cloud,
            '2026-06-01T00:00:00.000Z',
        );
        expect(resolved.source).toBe('cloud');
        expect(resolved.state.climbPbs.b?.normPower).toBe(220);
        expect(resolved.state.climbPbs.a).toBeUndefined();
    });

    it('resolveBucketListOnSync prefers local when local updatedAt is newer', () => {
        const local = { climbStatus: {}, climbPbs: { a: { normPower: 200 } }, updatedAt: '2026-06-01T00:00:00.000Z' };
        const cloud = { climbStatus: {}, climbPbs: { b: { normPower: 220 } } };
        const resolved = resolveBucketListOnSync(
            local,
            local.updatedAt,
            cloud,
            '2026-01-01T00:00:00.000Z',
        );
        expect(resolved.source).toBe('local');
        expect(resolved.state.climbPbs.a?.normPower).toBe(200);
    });
});
