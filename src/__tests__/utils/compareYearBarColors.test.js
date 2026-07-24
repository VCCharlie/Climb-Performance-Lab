import { describe, it, expect } from 'vitest';
import {
    compareYearBarColor,
    compareYearValueSpan,
    normalizeCompareYearValue,
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

    it('compareYearBarColor returns distinct strings for low vs high', () => {
        const low = compareYearBarColor(0.1, { isCurrentYear: false });
        const high = compareYearBarColor(0.95, { isCurrentYear: false });
        expect(low).not.toBe(high);
        expect(low).toContain('hsl');
    });
});
