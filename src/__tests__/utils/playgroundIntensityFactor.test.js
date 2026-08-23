import { describe, it, expect } from 'vitest';
import { buildPlaygroundBuckets, bucketMetricValue } from '../../utils/coach/coachPlaygroundBuckets';

describe('playground intensity factor metric', () => {
    it('averages IF weighted by moving time when FTP is set', () => {
        const activities = [
            {
                date: '2026-01-12',
                type: 'Ride',
                norm_power: 200,
                moving_time: 3600,
                load: 50,
            },
            {
                date: '2026-01-13',
                type: 'Ride',
                norm_power: 250,
                moving_time: 1800,
                load: 40,
            },
        ];

        const buckets = buildPlaygroundBuckets(activities, 'weekly', 250);
        expect(buckets.length).toBe(1);

        const ifAvg = bucketMetricValue(buckets[0], 'intensityFactor', 'primary');
        expect(ifAvg).toBeCloseTo(0.867, 2);

        const ifMax = bucketMetricValue(buckets[0], 'intensityFactor', 'max');
        expect(ifMax).toBeCloseTo(1.0, 2);
    });
});
