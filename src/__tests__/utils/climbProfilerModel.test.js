import { describe, it, expect } from 'vitest';
import {
    buildSyntheticProfile,
    estimateClimbPacingMetrics
} from '../../utils/climbProfilerModel';

describe('climbProfilerModel', () => {
    const climb = { lengthKm: 10, elevation: 800, avgGrade: 8 };

    it('buildSyntheticProfile produces ordered points', () => {
        const p = buildSyntheticProfile(climb, 20);
        expect(p.length).toBe(21);
        expect(p[0].distance).toBe(0);
        expect(p[p.length - 1].distance).toBeCloseTo(10, 5);
        expect(p[p.length - 1].elevation).toBeCloseTo(800, 0);
    });

    it('estimateClimbPacingMetrics returns positive VAM and time', () => {
        const m = estimateClimbPacingMetrics({
            ftp: 280,
            totalWeightKg: 78,
            elevationM: 800,
            avgGradePct: 8,
            lengthKm: 10,
            intensityFraction: 0.85
        });
        expect(m.vam).toBeGreaterThan(100);
        expect(m.timeMinutes).toBeGreaterThan(5);
        expect(m.targetPower).toBe(238);
        expect(m.energyKj).toBeGreaterThan(0);
    });
});
