import { describe, it, expect } from 'vitest';
import {
    planIntervalsMapBackfillFromActivities,
    precheckIntervalsMapBackfill,
} from '../../utils/intervalsMapBackfillOutcomes.js';
import { MAP_BACKFILL_CODE } from '../../utils/intervalsMapBackfillCodes.js';

describe('intervalsMapBackfillOutcomes', () => {
    it('skips manual ids without calling Intervals', () => {
        const plan = planIntervalsMapBackfillFromActivities([
            { id: 'manual-1', type: 'Ride', title: 'Hand entered' },
            { id: 'i999', type: 'VirtualRide', title: 'Zwift' },
        ]);
        expect(plan.toFetch).toHaveLength(1);
        expect(plan.toFetch[0].id).toBe('i999');
        expect(plan.preSkipped).toHaveLength(1);
        expect(plan.preSkipped[0].code).toBe(MAP_BACKFILL_CODE.NOT_INTERVALS_ACTIVITY);
    });

    it('includes virtual rides in fetch plan', () => {
        const pre = precheckIntervalsMapBackfill({ id: 'i42', type: 'VirtualRide' });
        expect(pre.canFetch).toBe(true);
    });
});
