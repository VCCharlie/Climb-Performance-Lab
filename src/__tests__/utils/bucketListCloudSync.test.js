import { describe, it, expect } from 'vitest';
import {
    bucketListSettingsDocId,
    BUCKET_LIST_CLOUD_DEBOUNCE_MS,
    resolveBucketListOnSync,
    newerIsoTimestamp,
    stampBucketListState,
    applyBucketListStateChange,
    shouldImmediateSyncBucketList,
} from '../../utils/bucketListCloudSync';
import { migrateLegacyBucketState } from '../../utils/bucketListState';

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

    it('applyBucketListStateChange keeps pbScanCompletedAt across status-only edits', () => {
        const previous = {
            climbStatus: { fr_alpe: 'done' },
            climbPbs: { fr_alpe: { normPower: 300, activityId: 'a1' } },
            updatedAt: '2026-06-02T12:00:00.000Z',
            pbScanCompletedAt: '2026-06-02T12:00:00.000Z',
        };
        // BucketList status toggle historically sent only climbStatus + climbPbs.
        const statusOnlyEdit = {
            climbStatus: { fr_alpe: 'done', it_stelvio: 'planned' },
            climbPbs: previous.climbPbs,
        };
        const next = applyBucketListStateChange(previous, statusOnlyEdit);
        expect(next.pbScanCompletedAt).toBe(previous.pbScanCompletedAt);
        expect(next.climbStatus.it_stelvio).toBe('planned');
        expect(next.climbPbs.fr_alpe?.normPower).toBe(300);
        expect(typeof next.updatedAt).toBe('string');
    });

    it('status edit that keeps scan timestamp still wins PB merge against stale peer', () => {
        const afterStatusEdit = applyBucketListStateChange(
            {
                climbStatus: { fr_alpe: 'done' },
                climbPbs: { fr_alpe: { normPower: 300, activityId: 'a1' } },
                updatedAt: '2026-06-02T12:00:00.000Z',
                pbScanCompletedAt: '2026-06-02T12:00:00.000Z',
            },
            {
                climbStatus: { fr_alpe: 'done', it_stelvio: 'planned' },
                climbPbs: { fr_alpe: { normPower: 300, activityId: 'a1' } },
            },
        );
        const stalePeer = {
            climbStatus: {},
            climbPbs: { fr_alpe: { normPower: 250, activityId: 'old' } },
            updatedAt: '2026-06-01T00:00:00.000Z',
            pbScanCompletedAt: '2026-06-01T00:00:00.000Z',
        };
        const resolved = resolveBucketListOnSync(
            stalePeer,
            stalePeer.updatedAt,
            afterStatusEdit,
            afterStatusEdit.updatedAt,
        );
        expect(resolved.state.climbPbs.fr_alpe?.normPower).toBe(300);
        expect(resolved.state.pbScanCompletedAt).toBe('2026-06-02T12:00:00.000Z');
        expect(resolved.state.climbStatus.it_stelvio).toBe('planned');
    });

    it('resolveBucketListOnSync uses newer updatedAt for climbPbs when pbScanCompletedAt matches', () => {
        const scanAt = '2026-06-02T12:00:00.000Z';
        const local = {
            climbStatus: {},
            climbPbs: { fr_alpe: { normPower: 280 } },
            updatedAt: '2026-06-03T10:00:00.000Z',
            pbScanCompletedAt: scanAt,
            dismissedPbClimbIds: ['es_angliru'],
        };
        const cloud = {
            climbStatus: {},
            climbPbs: {
                es_angliru: { normPower: 250, activityId: 'bad' },
                ch_grande_dixence: { normPower: 240, activityId: 'bad2' },
            },
            updatedAt: '2026-06-01T00:00:00.000Z',
            pbScanCompletedAt: scanAt,
        };
        const resolved = resolveBucketListOnSync(
            local,
            local.updatedAt,
            cloud,
            cloud.updatedAt,
        );
        expect(resolved.source).toBe('local');
        expect(resolved.state.climbPbs.fr_alpe?.normPower).toBe(280);
        expect(resolved.state.climbPbs.es_angliru).toBeUndefined();
        expect(resolved.state.climbPbs.ch_grande_dixence).toBeUndefined();
        expect(resolved.state.dismissedPbClimbIds).toContain('es_angliru');
    });

    it('resolveBucketListOnSync strips dismissed PBs even when cloud climbPbs win on updatedAt', () => {
        const local = {
            climbStatus: {},
            climbPbs: {},
            updatedAt: '2026-01-01T00:00:00.000Z',
            dismissedPbClimbIds: ['es_angliru', 'ch_grande_dixence'],
        };
        const cloud = {
            climbStatus: {},
            climbPbs: {
                es_angliru: { normPower: 250 },
                ch_grande_dixence: { normPower: 240 },
            },
            updatedAt: '2026-06-01T00:00:00.000Z',
        };
        const resolved = resolveBucketListOnSync(
            local,
            local.updatedAt,
            cloud,
            cloud.updatedAt,
        );
        expect(resolved.source).toBe('cloud');
        expect(Object.keys(resolved.state.climbPbs)).toHaveLength(0);
        expect(resolved.state.dismissedPbClimbIds).toEqual(
            expect.arrayContaining(['es_angliru', 'ch_grande_dixence']),
        );
    });

    it('shouldImmediateSyncBucketList when PB row removed or dismissed list grows', () => {
        const previous = migrateLegacyBucketState({
            climbPbs: { es_angliru: { normPower: 200 } },
            dismissedPbClimbIds: [],
        });
        const afterRemove = applyBucketListStateChange(previous, {
            climbStatus: {},
            climbPbs: {},
            dismissedPbClimbIds: ['es_angliru'],
        });
        expect(shouldImmediateSyncBucketList(previous, afterRemove)).toBe(true);
    });
});
