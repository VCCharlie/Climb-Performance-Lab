import { describe, it, expect } from 'vitest';
import {
    analyzeIntervalsImportHealth,
    formatIntervalsImportHealthParts,
    summarizeImportPreviewWarnings,
} from '../../utils/intervalsImportHealth';

describe('intervalsImportHealth', () => {
    it('counts rides missing power and load', () => {
        const health = analyzeIntervalsImportHealth([
            { type: 'Ride', norm_power: 200, avg_power: 190, load: 80, distance: 50, moving_time: 3600, best_20min: 220 },
            { type: 'VirtualRide', norm_power: 0, avg_power: 0, load: 0, distance: 30, moving_time: 1800 },
        ]);
        expect(health.rideCount).toBe(2);
        expect(health.missingNormPower).toBe(1);
        expect(health.missingLoad).toBe(1);
        expect(health.missingBestPowerCurve).toBe(1);
    });

    it('ignores non-ride types in health counts', () => {
        const health = analyzeIntervalsImportHealth([
            { type: 'Run', norm_power: 0, avg_power: 0, load: 0, distance: 5, moving_time: 1200 },
        ]);
        expect(health.rideCount).toBe(0);
    });

    it('summarizeImportPreviewWarnings builds user message for sparse power', () => {
        const summary = summarizeImportPreviewWarnings([
            { type: 'Ride', norm_power: 0, avg_power: 0, load: 10, distance: 40, moving_time: 3600 },
            { type: 'Ride', norm_power: 200, avg_power: 190, load: 80, distance: 50, moving_time: 3600 },
        ]);
        expect(summary.missingPowerCount).toBe(1);
        expect(summary.message).toMatch(/no power data/i);
    });

    it('formats health parts for user-visible sync summary', () => {
        const parts = formatIntervalsImportHealthParts({
            rideCount: 3,
            missingNormPower: 2,
            missingAvgPower: 2,
            missingLoad: 1,
            missingDistance: 0,
            missingMovingTime: 0,
            missingBestPowerCurve: 2,
        });
        expect(parts.some((p) => p.includes('missing load'))).toBe(true);
        expect(parts.some((p) => p.includes('power-curve'))).toBe(true);
    });
});
