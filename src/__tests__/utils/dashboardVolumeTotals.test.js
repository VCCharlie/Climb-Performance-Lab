import { describe, it, expect } from 'vitest';
import {
    ymdToMondayYmd,
    addDaysToYmd,
    formatWeekRangeLabelEn,
    buildMonthlyVolumeTotals,
    buildWeeklyVolumeTotals,
} from '../../utils/dashboardVolumeTotals';

describe('ymdToMondayYmd', () => {
    it('maps Sunday to previous Monday', () => {
        expect(ymdToMondayYmd('2026-01-04')).toBe('2025-12-29');
    });

    it('maps Wednesday to same-week Monday', () => {
        expect(ymdToMondayYmd('2026-01-07')).toBe('2026-01-05');
    });
});

describe('addDaysToYmd', () => {
    it('adds days across month boundary', () => {
        expect(addDaysToYmd('2026-01-28', 5)).toBe('2026-02-02');
    });
});

describe('formatWeekRangeLabelEn', () => {
    it('formats a range', () => {
        const s = formatWeekRangeLabelEn('2026-01-05', '2026-01-11');
        expect(s).toContain('2026');
        expect(s).toContain('–');
    });
});

describe('buildMonthlyVolumeTotals', () => {
    it('aggregates by calendar month', () => {
        const acts = [
            { date: '2026-01-10', distance: 50, climbing: 500, moving_time: 3600, load: 80 },
            { date: '2026-01-20', distance: 30, climbing: 300, moving_time: 1800, load: 40 },
            { date: '2026-02-01', distance: 40, climbing: 200, moving_time: 3600, load: 50 },
        ];
        const m = buildMonthlyVolumeTotals(acts);
        expect(m).toHaveLength(2);
        const jan = m.find((x) => x.key === '2026-01');
        expect(jan.rideCount).toBe(2);
        expect(jan.distanceKm).toBe(80);
        expect(jan.elevationM).toBe(800);
        expect(jan.load).toBe(120);
    });
});

describe('buildWeeklyVolumeTotals', () => {
    it('puts same-week rides in one bucket', () => {
        const acts = [
            { date: '2026-01-05', distance: 20, climbing: 100, moving_time: 3600, load: 40 },
            { date: '2026-01-07', distance: 30, climbing: 200, moving_time: 3600, load: 50 },
        ];
        const w = buildWeeklyVolumeTotals(acts);
        expect(w).toHaveLength(1);
        expect(w[0].rideCount).toBe(2);
        expect(w[0].key).toBe('2026-01-05');
        expect(w[0].distanceKm).toBe(50);
    });
});
