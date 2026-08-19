import { describe, it, expect } from 'vitest';
import { normalizeActivityStreams } from '../../utils/activityStreamNormalize';

describe('activityStreamNormalize', () => {
    it('normalizes Intervals.icu array stream payload', () => {
        const payload = [
            { type: 'time', data: [0, 60, 120, 180, 240, 300, 360, 420] },
            { type: 'watts', data: [180, 182, 181, 179, 180, 178, 180, 179] },
            { type: 'heartrate', data: [130, 131, 132, 133, 140, 142, 143, 145] },
        ];

        const result = normalizeActivityStreams(payload, 'intervals');
        expect(result).not.toBeNull();
        expect(result.watts).toHaveLength(8);
        expect(result.heartrate).toHaveLength(8);
        expect(result.time).toHaveLength(8);
    });

    it('normalizes object-keyed stream payload', () => {
        const payload = {
            time: { data: [0, 1, 2, 3, 4, 5, 6, 7] },
            watts: { data: [200, 200, 200, 200, 200, 200, 200, 200] },
            heartrate: { data: [130, 131, 132, 133, 140, 141, 142, 143] },
        };

        const result = normalizeActivityStreams(payload, 'intervals');
        expect(result?.watts).toHaveLength(8);
        expect(result?.heartrate).toHaveLength(8);
    });

    it('filters Strava moving samples when moving stream is present', () => {
        const payload = {
            time: { data: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
            watts: { data: [180, 180, 180, 180, 180, 180, 180, 180, 180, 180] },
            heartrate: { data: [130, 131, 132, 133, 134, 140, 141, 142, 143, 144] },
            moving: { data: [true, true, true, true, true, true, true, true, false, false] },
        };

        const result = normalizeActivityStreams(payload, 'strava');
        expect(result?.watts.length).toBe(8);
        expect(result?.heartrate.length).toBe(8);
    });

    it('returns null when power or HR is missing', () => {
        expect(normalizeActivityStreams({ time: { data: [0, 1] } }, 'intervals')).toBeNull();
        expect(normalizeActivityStreams(null, 'intervals')).toBeNull();
    });
});
