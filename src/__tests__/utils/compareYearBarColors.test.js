import { describe, it, expect } from 'vitest';
import {
    compareYearBarColor,
    compareYearValueSpan,
    normalizeCompareYearValue,
    parseCompareBarHue,
} from '../../utils/compareYearBarColors';

describe('compareYearBarColors', () => {
    it('compareYearValueSpan finds min and max', () => {
        expect(compareYearValueSpan([100, 500, 200])).toEqual({ min: 100, max: 500, range: 400 });
    });

    it('normalizeCompareYearValue maps to 0..1', () => {
        const span = compareYearValueSpan([10, 30]);
        expect(normalizeCompareYearValue(10, span)).toBe(0);
        expect(normalizeCompareYearValue(30, span)).toBe(1);
    });

    it('compareYearBarColor runs green (low) to red (high)', () => {
        const low = compareYearBarColor(0);
        const high = compareYearBarColor(1);
        const lowHue = parseCompareBarHue(low);
        const highHue = parseCompareBarHue(high);
        expect(lowHue).not.toBeNull();
        expect(highHue).not.toBeNull();
        expect(lowHue).toBeGreaterThan(highHue);
        expect(lowHue).toBeGreaterThanOrEqual(100);
        expect(highHue).toBeLessThanOrEqual(20);
    });
});
