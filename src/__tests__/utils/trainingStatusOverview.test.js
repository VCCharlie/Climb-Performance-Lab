import { describe, it, expect } from 'vitest';
import {
    buildTrainingStatusOverview,
    buildWeeklyLoadSnapshot,
    computeWeeklyTssOptimalBand,
    weekTssPercentOfTarget,
    WEEK_TSS_OPTIMAL_BAND,
} from '../../utils/trainingStatusOverview';
import { buildWeeklyTssSeries } from '../../utils/weeklyLoadChart';

describe('computeWeeklyTssOptimalBand', () => {
    it('returns zero band when target is missing', () => {
        expect(computeWeeklyTssOptimalBand(0)).toEqual({ min: 0, max: 0 });
    });

    it('computes 85–115% band around target TSS', () => {
        expect(computeWeeklyTssOptimalBand(200)).toEqual({
            min: Math.round(200 * WEEK_TSS_OPTIMAL_BAND.minRatio),
            max: Math.round(200 * WEEK_TSS_OPTIMAL_BAND.maxRatio),
        });
    });
});

describe('weekTssPercentOfTarget', () => {
    it('returns null when target is zero', () => {
        expect(weekTssPercentOfTarget(100, 0)).toBeNull();
    });

    it('rounds percent of weekly target', () => {
        expect(weekTssPercentOfTarget(125, 250)).toBe(50);
    });
});

describe('buildWeeklyLoadSnapshot', () => {
    it('uses calendar week TSS, not rolling last-7-days', () => {
        const activities = [
            { date: '2026-08-20', load: 120, type: 'Ride' },
            { date: '2026-08-21', load: 130, type: 'Ride' },
            { date: '2026-08-22', load: 119, type: 'Ride' },
            { date: '2026-08-24', load: 30, type: 'Ride' },
            { date: '2026-08-26', load: 27, type: 'Ride' },
        ];

        const snapshot = buildWeeklyLoadSnapshot({
            activities,
            userSettings: { weeklyHoursTarget: 5 },
            referenceYmd: '2026-08-26',
        });

        expect(snapshot.actualTss).toBe(57);
        expect(snapshot.targetTss).toBe(250);
        expect(snapshot.compliancePct).toBe(Math.round((57 / 250) * 100));
        expect(snapshot.weekStartYmd).toBe('2026-08-24');
        expect(snapshot.weekEndYmd).toBe('2026-08-30');
    });
});

describe('buildTrainingStatusOverview', () => {
    it('aggregates CTL/ATL/TSB and weekly TSS from activities', () => {
        const activities = [
            { date: '2026-08-20', load: 80, type: 'Ride', distance: 40, moving_time: 3600 },
            { date: '2026-08-22', load: 60, type: 'Ride', distance: 30, moving_time: 2700 },
        ];
        const overview = buildTrainingStatusOverview({
            activities,
            userSettings: { ftp: 250, weeklyHoursTarget: 5 },
            ftp: 250,
            referenceYmd: '2026-08-23',
        });

        expect(overview).not.toBeNull();
        expect(overview.weekTss).toBeGreaterThan(0);
        expect(overview.targetTss).toBe(250);
        expect(overview.weekTssPct).toBe(Math.round((overview.weekTss / 250) * 100));
        expect(overview.readinessBadge).toBeTruthy();
    });
});

describe('buildWeeklyTssSeries', () => {
    it('builds ordered weekly buckets with summed TSS', () => {
        const activities = [
            { date: '2026-08-18', load: 50, type: 'Ride' },
            { date: '2026-08-20', load: 70, type: 'Ride' },
        ];
        const series = buildWeeklyTssSeries(activities, 2, '2026-08-23');
        expect(series.length).toBe(2);
        const last = series[series.length - 1];
        expect(last.tss).toBe(120);
    });
});
