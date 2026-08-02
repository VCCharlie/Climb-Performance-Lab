import { describe, it, expect } from 'vitest';
import {
    computeYearlyPowerPeakRows,
    computePowerLongevitySummary,
    enrichYearlyPowerRowsWithAge,
    ageAtCalendarYear,
    normalizeBirthYear,
    chartRowsForPowerLongevity,
} from '../../utils/powerTrendSeries';

describe('powerTrendSeries', () => {
    const sampleActivities = [
        { id: 'a1', date: '2018-06-01', best_20min: 320, best_60min: 290 },
        { id: 'a2', date: '2018-09-01', best_20min: 310, best_60min: 285 },
        { id: 'a3', date: '2024-03-01', best_20min: 280, best_60min: 265 },
        { id: 'a4', date: '2026-07-01', best_20min: 295, best_60min: 270 },
    ];

    it('computeYearlyPowerPeakRows aggregates max peaks per year', () => {
        const rows = computeYearlyPowerPeakRows(sampleActivities, 280, 70);
        expect(rows).toHaveLength(3);
        const y2018 = rows.find((r) => r.year === 2018);
        expect(y2018?.best20min).toBe(320);
        expect(y2018?.eftp20).toBe(304);
        expect(y2018?.rideCount).toBe(2);
    });

    it('computePowerLongevitySummary compares current year to historical peak', () => {
        const rows = computeYearlyPowerPeakRows(sampleActivities, 280);
        const summary = computePowerLongevitySummary(rows, new Date('2026-08-01'));
        expect(summary?.peakYear).toBe(2018);
        expect(summary?.peakEftp20).toBe(304);
        expect(summary?.currentEftp20).toBe(280);
        expect(summary?.pctVsPeakEftp20).toBeLessThan(0);
    });

    it('enrichYearlyPowerRowsWithAge adds age labels when birth year set', () => {
        const rows = enrichYearlyPowerRowsWithAge(
            computeYearlyPowerPeakRows(sampleActivities, 280),
            1978,
        );
        const y2018 = rows.find((r) => r.year === 2018);
        expect(y2018?.age).toBe(40);
        expect(y2018?.xLabel).toBe('Age 40');
    });

    it('chartRowsForPowerLongevity uses age as xKey in age mode', () => {
        const enriched = enrichYearlyPowerRowsWithAge(
            computeYearlyPowerPeakRows(sampleActivities, 280),
            1978,
        );
        const chartRows = chartRowsForPowerLongevity(enriched, 'age');
        const y2018 = chartRows.find((r) => r.year === 2018);
        expect(y2018?.xKey).toBe(40);
    });

    it('normalizeBirthYear rejects invalid values', () => {
        expect(normalizeBirthYear(1978)).toBe(1978);
        expect(normalizeBirthYear('')).toBeNull();
        expect(normalizeBirthYear(1800)).toBeNull();
    });

    it('ageAtCalendarYear returns null without birth year', () => {
        expect(ageAtCalendarYear(null, 2020)).toBeNull();
    });
});
