import { describe, it, expect } from 'vitest';
import {
    trimmedMeanTopEfforts,
    computeHistoricalFtpByYear,
    resolveHistoricalFtpMap,
    buildHistoricalFtpYearRows,
    HISTORICAL_FTP_SOURCE_20,
    HISTORICAL_FTP_SOURCE_60,
} from '../../utils/historicalFtp';
import { computeYearlyPowerPeakRows } from '../../utils/powerTrendSeries';

describe('historicalFtp', () => {
    it('trimmedMeanTopEfforts drops highest outlier before averaging', () => {
        const values = [320, 315, 310, 305, 300, 295, 290, 285, 280, 275];
        const avg = trimmedMeanTopEfforts(values, 10, 1, 3);
        expect(avg).toBeCloseTo(295, 1);
    });

    it('computeHistoricalFtpByYear uses 20 min × 0.95 by default', () => {
        const activities = [
            { date: '2017-06-01', best_20min: 340, best_60min: 320 },
            { date: '2017-09-01', best_20min: 330, best_60min: 310 },
            { date: '2017-11-01', best_20min: 325, best_60min: 305 },
        ];
        const byYear = computeHistoricalFtpByYear(activities, {
            source: HISTORICAL_FTP_SOURCE_20,
            topN: 10,
            trimHigh: 0,
            minEfforts: 3,
        });
        expect(byYear[2017].autoFtp).toBe(Math.round(((340 + 330 + 325) / 3) * 0.95));
    });

    it('computeHistoricalFtpByYear can use 60 min average', () => {
        const activities = [
            { date: '2017-06-01', best_60min: 320 },
            { date: '2017-09-01', best_60min: 310 },
            { date: '2017-11-01', best_60min: 305 },
        ];
        const byYear = computeHistoricalFtpByYear(activities, {
            source: HISTORICAL_FTP_SOURCE_60,
            topN: 10,
            trimHigh: 0,
            minEfforts: 3,
        });
        expect(byYear[2017].autoFtp).toBe(Math.round((320 + 310 + 305) / 3));
    });

    it('resolveHistoricalFtpMap prefers manual overrides', () => {
        const activities = [
            { date: '2018-01-01', best_20min: 300, best_60min: 280 },
            { date: '2018-06-01', best_20min: 310, best_60min: 290 },
            { date: '2018-09-01', best_20min: 305, best_60min: 285 },
        ];
        const map = resolveHistoricalFtpMap({
            historicalFtp: {
                config: { enabled: true, source: '20min', topN: 10, trimHigh: 0, minEfforts: 3 },
                overrides: { 2018: 295 },
            },
        }, activities);
        expect(map[2018]).toBe(295);
    });

    it('buildHistoricalFtpYearRows lists override and effective FTP', () => {
        const rows = buildHistoricalFtpYearRows(
            [{ date: '2017-01-01', best_20min: 320, best_60min: 300 }],
            {
                historicalFtp: {
                    config: { enabled: true, minEfforts: 1, topN: 10, trimHigh: 0 },
                    overrides: { 2017: 310 },
                },
            },
        );
        expect(rows[0].overrideFtp).toBe(310);
        expect(rows[0].effectiveFtp).toBe(310);
    });
});

describe('powerTrendSeries with historical FTP', () => {
    it('uses per-year FTP for sanity caps so historical peaks are not clipped', () => {
        const activities = [
            { id: 'a1', date: '2017-10-01', best_60min: 320 },
            { id: 'a2', date: '2017-06-01', best_60min: 299 },
        ];

        const withCurrentFtp = computeYearlyPowerPeakRows(activities, 272, 0);
        expect(withCurrentFtp.find((r) => r.year === 2017)?.best60min).toBe(299);

        const withHistorical = computeYearlyPowerPeakRows(activities, 272, 0, { 2017: 310 });
        expect(withHistorical.find((r) => r.year === 2017)?.best60min).toBe(320);
        expect(withHistorical.find((r) => r.year === 2017)?.yearFtp).toBe(310);
    });
});
