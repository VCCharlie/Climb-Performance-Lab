import { describe, it, expect, beforeEach } from 'vitest';
import {
    STRAVA_ENRICH_PENDING_STORAGE_KEY,
    readStravaEnrichPendingQueue,
    enqueueStravaEnrichPending,
    removeStravaEnrichPendingIds,
    recordStravaEnrichPendingFromResult,
    activityStillNeedsStravaEnrich,
    reconcileStravaEnrichPendingQueue,
    formatStravaEnrichRetryGuidance,
} from '../../utils/stravaEnrichPendingQueue';

describe('stravaEnrichPendingQueue', () => {
    beforeEach(() => {
        localStorage.removeItem(STRAVA_ENRICH_PENDING_STORAGE_KEY);
    });

    it('enqueue and read pending entries', () => {
        enqueueStravaEnrichPending([{
            activityId: 'a1',
            title: 'Morning Ride',
            date: '2026-09-01',
            reason: 'rate_limit',
        }]);
        const q = readStravaEnrichPendingQueue();
        expect(q).toHaveLength(1);
        expect(q[0].activityId).toBe('a1');
        expect(q[0].reason).toBe('rate_limit');
    });

    it('recordStravaEnrichPendingFromResult queues rate-limited ids', () => {
        const acts = [{ id: 'x1', title: 'Test', date: '2026-09-02' }];
        recordStravaEnrichPendingFromResult(acts, {
            updates: [],
            rateLimitedActivityIds: ['x1'],
            rateLimitHits: 1,
        });
        expect(readStravaEnrichPendingQueue().map((e) => e.activityId)).toEqual(['x1']);
    });

    it('removes ids that received updates', () => {
        enqueueStravaEnrichPending([{ activityId: 'done', reason: 'rate_limit' }]);
        recordStravaEnrichPendingFromResult(
            [{ id: 'done', title: 'Done' }],
            { updates: [{ id: 'done', data: { avg_hr: 140 } }], rateLimitedActivityIds: [] },
        );
        expect(readStravaEnrichPendingQueue()).toHaveLength(0);
    });

    it('activityStillNeedsStravaEnrich detects missing HR', () => {
        expect(activityStillNeedsStravaEnrich({ id: '1', strava_id: '99', avg_hr: 0 })).toBe(true);
        expect(activityStillNeedsStravaEnrich({ id: '1', strava_id: '99', avg_hr: 130, rpe: 5, strava_map: 'abc', gear_id: 'g1', title: 'Real title' })).toBe(false);
    });

    it('reconcileStravaEnrichPendingQueue drops complete rows', () => {
        enqueueStravaEnrichPending([{ activityId: 'complete', reason: 'partial' }]);
        const queue = reconcileStravaEnrichPendingQueue(
            [{ id: 'complete', strava_id: '1', avg_hr: 120, rpe: 6, strava_map: 'poly', gear_id: 'b1', title: 'Ride' }],
            {
                updates: [{ id: 'complete', data: { avg_hr: 120 } }],
                mergedActivities: [{ id: 'complete', strava_id: '1', avg_hr: 120, rpe: 6, strava_map: 'poly', gear_id: 'b1', title: 'Ride' }],
                rateLimitHits: 0,
            },
            [],
        );
        expect(queue.find((e) => e.activityId === 'complete')).toBeUndefined();
    });

    it('formatStravaEnrichRetryGuidance mentions 429 and panel', () => {
        const msg = formatStravaEnrichRetryGuidance({ pendingCount: 2, rateLimitHits: 1, partialSaved: true });
        expect(msg).toMatch(/429/);
        expect(msg).toMatch(/Pending enrich/);
    });

    it('removeStravaEnrichPendingIds', () => {
        enqueueStravaEnrichPending([{ activityId: 'a' }, { activityId: 'b' }]);
        removeStravaEnrichPendingIds(['a']);
        expect(readStravaEnrichPendingQueue().map((e) => e.activityId)).toEqual(['b']);
    });
});
