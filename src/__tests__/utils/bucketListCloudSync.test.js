import { describe, it, expect } from 'vitest';
import {
    bucketListSettingsDocId,
    BUCKET_LIST_CLOUD_DEBOUNCE_MS,
    resolveBucketListOnSync,
    newerIsoTimestamp,
    stampBucketListState,
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

    it('settings-save style resolve keeps newer cloud PBs over stale local memory', () => {
        const staleLocal = {
            climbStatus: { it_stelvio: 'planned' },
            climbPbs: {},
            updatedAt: '2026-01-01T00:00:00.000Z',
        };
        const newerCloud = {
            climbStatus: {},
            climbPbs: { fr_alpe: { normPower: 280, activityId: 'a1' } },
            updatedAt: '2026-06-01T00:00:00.000Z',
        };
        const resolved = resolveBucketListOnSync(
            staleLocal,
            staleLocal.updatedAt,
            newerCloud,
            newerCloud.updatedAt,
        );
        expect(resolved.source).toBe('cloud');
        expect(resolved.state.climbPbs.fr_alpe?.normPower).toBe(280);
        expect(resolved.state.climbStatus.it_stelvio).toBeUndefined();
    });

    it('resolveBucketListOnSync keeps newer local PB scan when cloud updatedAt is newer', () => {
        const local = {
            climbStatus: { fr_alpe: 'done' },
            climbPbs: { fr_alpe: { normPower: 300, activityId: 'a1' } },
            updatedAt: '2026-01-01T00:00:00.000Z',
            pbScanCompletedAt: '2026-06-02T12:00:00.000Z',
        };
        const cloud = {
            climbStatus: {},
            climbPbs: {
                es_angliru: { normPower: 250, activityId: 'bad' },
                nl_amerongse: { normPower: 200, activityId: 'bad2' },
            },
            updatedAt: '2026-06-01T00:00:00.000Z',
            pbScanCompletedAt: '2026-01-01T00:00:00.000Z',
        };
        const resolved = resolveBucketListOnSync(
            local,
            local.updatedAt,
            cloud,
            cloud.updatedAt,
        );
        expect(resolved.source).toBe('cloud');
        expect(resolved.state.climbPbs.fr_alpe?.normPower).toBe(300);
        expect(resolved.state.climbPbs.es_angliru).toBeUndefined();
        expect(resolved.state.pbScanCompletedAt).toBe(local.pbScanCompletedAt);
    });

    it('stampBucketListState always sets a non-null updatedAt for restores', () => {
        const stamped = stampBucketListState({
            climbStatus: { fr_alpe: 'done' },
            climbPbs: { fr_alpe: { normPower: 250 } },
            updatedAt: null,
        });
        expect(typeof stamped.updatedAt).toBe('string');
        expect(Date.parse(stamped.updatedAt)).not.toBeNaN();
        expect(stamped.climbStatus.fr_alpe).toBe('done');
    });
});
