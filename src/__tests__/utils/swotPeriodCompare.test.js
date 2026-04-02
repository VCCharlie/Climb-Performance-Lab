import { describe, it, expect } from 'vitest';
import { summarizeActivityWindow, buildPeriodComparison } from '../../utils/swotPeriodCompare';

const ftp = 250;

describe('summarizeActivityWindow', () => {
    it('returns zeros for empty activities in range', () => {
        const start = new Date('2026-01-01');
        const end = new Date('2026-01-31');
        const s = summarizeActivityWindow([], start, end, ftp);
        expect(s.rideCount).toBe(0);
        expect(s.avgWeeklyLoad).toBe(0);
        expect(s.highIntensityCount).toBe(0);
    });

    it('aggregates rides in inclusive range', () => {
        const start = new Date('2026-01-01');
        const end = new Date('2026-01-14');
        const acts = [
            { date: '2026-01-02', load: 100, distance: 50, climbing: 500, moving_time: 7200, norm_power: 200, best_5min: 280 },
            { date: '2026-01-10', load: 80, distance: 40, climbing: 400, moving_time: 5400, norm_power: 180, best_5min: 270 },
        ];
        const s = summarizeActivityWindow(acts, start, end, ftp);
        expect(s.rideCount).toBe(2);
        expect(s.avgWeeklyLoad).toBeGreaterThan(0);
        expect(s.highIntensityCount).toBe(0);
    });
});

describe('buildPeriodComparison', () => {
    it('includes prior window of same length', () => {
        const acts = [];
        for (let i = 0; i < 20; i++) {
            const d = new Date(2026, 0, 5 + i);
            acts.push({
                date: d.toISOString().split('T')[0],
                load: 80 + i,
                distance: 40,
                climbing: 300,
                moving_time: 3600,
                norm_power: 200,
                best_5min: 270,
            });
        }
        const primaryStart = new Date(2026, 0, 20);
        const primaryEnd = new Date(2026, 1, 3);
        const cmp = buildPeriodComparison(acts, primaryStart, primaryEnd, ftp);
        expect(cmp.prior).not.toBeNull();
        expect(cmp.comparisonRows.length).toBeGreaterThanOrEqual(2);
        expect(cmp.comparisonRows[0].key).toBe('primary');
        expect(cmp.comparisonRows.some((r) => r.key === 'prior')).toBe(true);
    });

    it('adds yearRest row for short primary period with enough history', () => {
        const acts = [];
        for (let i = 0; i < 400; i++) {
            const d = new Date(2025, 0, 1);
            d.setDate(d.getDate() + i);
            acts.push({
                date: d.toISOString().split('T')[0],
                load: 70,
                distance: 35,
                climbing: 200,
                moving_time: 3600,
                norm_power: 190,
                best_5min: 260,
            });
        }
        const primaryStart = new Date(2026, 0, 1);
        const primaryEnd = new Date(2026, 0, 31);
        const cmp = buildPeriodComparison(acts, primaryStart, primaryEnd, ftp);
        expect(cmp.yearRest).not.toBeNull();
        expect(cmp.comparisonRows.some((r) => r.key === 'yearRest')).toBe(true);
    });
});
