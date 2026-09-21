import { describe, it, expect } from 'vitest';
import {
    computeMaxMeanPowerForDuration,
    computeBestPowersFromWattsStream,
    parseStravaWattsStream,
} from '../../utils/stravaPowerStreamBests';

describe('computeMaxMeanPowerForDuration', () => {
    it('finds the highest 60s average in a flat stream', () => {
        const watts = Array.from({ length: 120 }, () => 200);
        for (let i = 30; i < 90; i += 1) watts[i] = 300;
        const time = watts.map((_, i) => i);
        expect(computeMaxMeanPowerForDuration(watts, time, 60)).toBe(300);
    });

    it('returns 0 for empty input', () => {
        expect(computeMaxMeanPowerForDuration([], [], 60)).toBe(0);
    });
});

describe('parseStravaWattsStream', () => {
    it('extracts watts and time from Strava key_by_type payload', () => {
        const timeData = Array.from({ length: 70 }, (_, i) => i);
        const wattsData = Array.from({ length: 70 }, (_, i) => (i > 0 ? 200 + (i % 5) : 0));
        const parsed = parseStravaWattsStream({
            time: { data: timeData },
            watts: { data: wattsData },
        });
        expect(parsed?.watts.length).toBeGreaterThanOrEqual(60);
        expect(parsed?.time.length).toBe(parsed?.watts.length);
    });
});

describe('computeBestPowersFromWattsStream', () => {
    it('maps standard durations to activity fields', () => {
        const watts = Array.from({ length: 400 }, () => 180);
        for (let i = 100; i < 160; i += 1) watts[i] = 320;
        const time = watts.map((_, i) => i);
        const bests = computeBestPowersFromWattsStream(watts, time, [
            { field: 'best_1min', curveSec: 60 },
            { field: 'best_5min', curveSec: 300 },
        ]);
        expect(bests.best_1min).toBe(320);
        expect(bests.best_5min).toBeGreaterThanOrEqual(180);
    });
});
