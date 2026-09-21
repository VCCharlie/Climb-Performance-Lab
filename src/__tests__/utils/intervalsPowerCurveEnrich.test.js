/**
 * Tests for src/utils/intervalsPowerCurveEnrich.js
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    lookupPowerCurveWattsAtDuration,
    missingPowerCurveBestTargets,
    enrichActivitiesWithPowerCurveBests,
    STANDARD_POWER_CURVE_BEST_TARGETS,
} from '../../utils/intervalsPowerCurveEnrich';

describe('lookupPowerCurveWattsAtDuration', () => {
    it('returns exact match from secs/watts arrays', () => {
        const curve = {
            secs: [60, 300, 3600, 5400, 7200],
            watts: [400, 320, 240, 210, 200],
        };
        expect(lookupPowerCurveWattsAtDuration(curve, 5400)).toBe(210);
        expect(lookupPowerCurveWattsAtDuration(curve, 3600)).toBe(240);
    });

    it('interpolates between known durations', () => {
        const curve = {
            secs: [3600, 7200],
            watts: [240, 200],
        };
        expect(lookupPowerCurveWattsAtDuration(curve, 5400)).toBe(220);
    });

    it('returns 0 for empty or invalid input', () => {
        expect(lookupPowerCurveWattsAtDuration(null, 5400)).toBe(0);
        expect(lookupPowerCurveWattsAtDuration({ secs: [], watts: [] }, 5400)).toBe(0);
    });

    it('supports values array alias', () => {
        const curve = { secs: [5400], values: [215] };
        expect(lookupPowerCurveWattsAtDuration(curve, 5400)).toBe(215);
    });
});

describe('missingPowerCurveBestTargets', () => {
    it('detects missing standard bests for rides with duration strings', () => {
        const missing = missingPowerCurveBestTargets(
            {
                moving_time: '1:30:00',
                best_1min: 0,
                best_5min: 0,
                best_20min: 0,
            },
            STANDARD_POWER_CURVE_BEST_TARGETS,
        );
        expect(missing.map((t) => t.field)).toEqual([
            'best_1min',
            'best_5min',
            'best_10min',
            'best_20min',
            'best_60min',
        ]);
    });
});

describe('enrichActivitiesWithPowerCurveBests', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('fills missing 1–60 min bests from Intervals power curve', async () => {
        fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                secs: [60, 300, 600, 1200, 3600],
                watts: [450, 340, 310, 285, 240],
            }),
        });

        const [out] = await enrichActivitiesWithPowerCurveBests(
            [{
                id: 'i12345',
                moving_time: 5400,
                best_1min: 0,
                best_5min: 0,
                best_10min: 0,
                best_20min: 0,
                best_60min: 0,
            }],
            { apiKey: 'secret' },
            { maxFetches: 1, delayMs: 0 },
        );

        expect(out.best_1min).toBe(450);
        expect(out.best_5min).toBe(340);
        expect(out.best_20min).toBe(285);
        expect(out.best_60min).toBe(240);
    });
});
