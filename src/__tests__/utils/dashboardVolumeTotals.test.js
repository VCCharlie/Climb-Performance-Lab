import { describe, it, expect } from 'vitest';
import {
    ymdToMondayYmd,
    addDaysToYmd,
    formatWeekRangeLabelEn,
    buildMonthlyVolumeTotals,
    buildWeeklyVolumeTotals,
    orderVolumeRowsChronological,
    formatMonthChartTickEn,
    trailingMovingAverage,
    monthKeyToDateRange,
    mondayOneYearBefore,
    monthKeyOneYearBefore,
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
    it('formats a range in DD-MM-YYYY', () => {
        const s = formatWeekRangeLabelEn('2026-01-05', '2026-01-11');
        expect(s).toBe('05-01-2026 – 11-01-2026');
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

    it('uses Dutch month name for month row labels', () => {
        const m = buildMonthlyVolumeTotals([{ date: '2026-03-10', distance: 10, climbing: 0, moving_time: 0, load: 0 }]);
        expect(m[0].label).toMatch(/maart 2026/i);
    });
});

describe('orderVolumeRowsChronological', () => {
    it('sorts by key ascending', () => {
        const rows = [
            { key: '2026-02', label: 'b', rideCount: 1 },
            { key: '2026-01', label: 'a', rideCount: 2 },
        ];
        const o = orderVolumeRowsChronological(rows);
        expect(o.map((r) => r.key)).toEqual(['2026-01', '2026-02']);
    });
});

describe('monthKeyOneYearBefore', () => {
    it('shifts year', () => {
        expect(monthKeyOneYearBefore('2026-05')).toBe('2025-05');
    });
});

describe('mondayOneYearBefore', () => {
    it('returns a Monday YMD near one calendar year back', () => {
        const out = mondayOneYearBefore('2026-01-05');
        expect(out).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(ymdToMondayYmd(out)).toBe(out);
    });
});

describe('monthKeyToDateRange', () => {
    it('returns full month span', () => {
        expect(monthKeyToDateRange('2024-02')).toEqual({ startYmd: '2024-02-01', endYmd: '2024-02-29' });
        expect(monthKeyToDateRange('2025-02')).toEqual({ startYmd: '2025-02-01', endYmd: '2025-02-28' });
    });
});

describe('trailingMovingAverage', () => {
    it('computes expanding then trailing window', () => {
        expect(trailingMovingAverage([10, 20, 30, 40], 4)).toEqual([10, 15, 20, 25]);
    });

    it('handles window 1', () => {
        expect(trailingMovingAverage([5, 15], 1)).toEqual([5, 15]);
    });
});

describe('formatMonthChartTickEn', () => {
    it('returns first-of-month in DD-MM-YYYY', () => {
        expect(formatMonthChartTickEn('2026-03')).toBe('01-03-2026');
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
