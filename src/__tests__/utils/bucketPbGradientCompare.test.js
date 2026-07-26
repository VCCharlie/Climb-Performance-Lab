import { describe, it, expect } from 'vitest';
import { effectiveGradeFromRide, summarizePbVsDbGradient } from '../../utils/bucketPbGradientCompare';

describe('bucketPbGradientCompare', () => {
    it('effectiveGradeFromRide computes climb grade', () => {
        expect(effectiveGradeFromRide(10, 800)).toBe(8);
    });

    it('summarizePbVsDbGradient compares DB and ride', () => {
        const climb = { avgGrade: 8 };
        const pb = { normPower: 250 };
        const activity = { distance: 10, climbing: 750 };
        const s = summarizePbVsDbGradient(climb, pb, activity);
        expect(s?.rideGradePct).toBe(7.5);
        expect(s?.summaryLine).toContain('DB 8.0%');
        expect(s?.summaryLine).toContain('7.5%');
    });
});
