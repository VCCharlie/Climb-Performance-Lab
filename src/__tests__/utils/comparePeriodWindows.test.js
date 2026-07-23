import { describe, it, expect } from 'vitest';
import { comparePeriodWindowForYear, comparePeriodSubtitle } from '../../utils/comparePeriodWindows';

describe('comparePeriodWindows', () => {
    const ref = new Date(2026, 6, 23);

    it('ytd window matches calendar year slice', () => {
        const w = comparePeriodWindowForYear('ytd', ref, 2026);
        expect(w.startYmd).toBe('2026-01-01');
        expect(w.endYmd).toBe('2026-07-23');
    });

    it('month window starts on first of month', () => {
        const w = comparePeriodWindowForYear('month', ref, 2025);
        expect(w.startYmd).toBe('2025-07-01');
        expect(w.endYmd).toBe('2025-07-23');
    });

    it('365d window spans ~365 days', () => {
        const w = comparePeriodWindowForYear('365d', ref, 2026);
        expect(w.endYmd).toBe('2026-07-23');
        expect(w.startYmd).toBe('2025-07-24');
    });

    it('running year spans 12 months', () => {
        const w = comparePeriodWindowForYear('running_year', ref, 2026);
        expect(w.endYmd).toBe('2026-07-23');
        expect(w.startYmd).toBe('2025-07-24');
    });

    it('comparePeriodSubtitle is human readable', () => {
        expect(comparePeriodSubtitle('ytd', ref)).toContain('Jan');
    });
});
