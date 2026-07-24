import { describe, it, expect } from 'vitest';
import {
    compareYearBarColor,
    compareYearValueSpan,
    normalizeCompareYearValue,
    parseCompareBarRgb,
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

    it('compareYearBarColor uses Excel-style green → yellow → red', () => {
        const low = parseCompareBarRgb(compareYearBarColor(0));
        const mid = parseCompareBarRgb(compareYearBarColor(0.5));
        const high = parseCompareBarRgb(compareYearBarColor(1));

        expect(low).toEqual([99, 190, 123]);
        expect(mid).toEqual([255, 235, 132]);
        expect(high).toEqual([248, 105, 107]);

        expect(low[1]).toBeGreaterThan(high[1]);
        expect(high[0]).toBeGreaterThan(low[0]);
    });
});
