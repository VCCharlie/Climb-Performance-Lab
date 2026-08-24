/**
 * Tests for src/utils/customDateRange.js
 */
import { describe, it, expect } from 'vitest';
import {
    isIsoYmd,
    isValidCustomDateRange,
    isCustomDateApplyEnabled,
    normalizeYmd,
    resolveDraftYmd,
} from '../../utils/customDateRange';

describe('customDateRange helpers', () => {
    it('normalizes YMD strings', () => {
        expect(normalizeYmd('2026-04-09T12:00:00')).toBe('2026-04-09');
        expect(normalizeYmd('')).toBe('');
    });

    it('validates ISO YMD tokens', () => {
        expect(isIsoYmd('2026-04-09')).toBe(true);
        expect(isIsoYmd('2026-4-9')).toBe(false);
        expect(isIsoYmd('not-a-date')).toBe(false);
    });

    it('accepts ordered custom ranges', () => {
        expect(isValidCustomDateRange('2026-01-01', '2026-04-09')).toBe(true);
        expect(isValidCustomDateRange('2026-01-01', '2026-01-01')).toBe(true);
    });

    it('rejects invalid or reversed custom ranges', () => {
        expect(isValidCustomDateRange('', '2026-04-09')).toBe(false);
        expect(isValidCustomDateRange('2026-04-09', '')).toBe(false);
        expect(isValidCustomDateRange('2026-05-01', '2026-04-01')).toBe(false);
    });

    it('accepts Dutch display dates with slashes or hyphens', () => {
        expect(resolveDraftYmd('01/01/2012')).toBe('2012-01-01');
        expect(resolveDraftYmd('24-08-2013')).toBe('2013-08-24');
        expect(isValidCustomDateRange('01/01/2012', '24/08/2013')).toBe(true);
        expect(isValidCustomDateRange('01-01-2012', '24-08-2013')).toBe(true);
    });

    it('enables Apply when both draft dates are valid (even if unchanged)', () => {
        expect(isCustomDateApplyEnabled('2012-01-01', '2013-08-24')).toBe(true);
        expect(isCustomDateApplyEnabled('01-01-2012', '24-08-2013')).toBe(true);
        expect(isCustomDateApplyEnabled('2013-08-24', '2012-01-01')).toBe(false);
        expect(isCustomDateApplyEnabled('', '2013-08-24')).toBe(false);
    });
});
