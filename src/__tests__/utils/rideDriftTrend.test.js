import { describe, it, expect } from 'vitest';
import {
    buildDriftProfileTrend,
    buildDriftProfilePortfolio,
    summarizeDriftProfile,
    countDriftProfileSignals,
} from '../../utils/coach/rideDriftTrend';
import { DRIFT_PROFILE } from '../../utils/coach/rideDurability';

const steadyRide = {
    id: '1',
    type: 'Ride',
    date: '2026-08-10',
    title: 'Z2 endurance',
    moving_time: 5400,
    norm_power: 180,
    avg_power: 175,
    avg_hr: 135,
    decoupling_pct: 4.2,
    decoupling_ef_first: 1.4,
    decoupling_ef_second: 1.33,
    decoupling_status: 'good',
    decoupling_source: 'intervals',
};

const thresholdRide = {
    id: '2',
    type: 'Ride',
    date: '2026-08-18',
    title: 'Orient Express',
    moving_time: 9244,
    norm_power: 243,
    avg_power: 190,
    avg_hr: 132,
    threshold_drift_pct: 7.1,
    threshold_drift_status: 'moderate',
    threshold_drift_source: 'strava',
};

describe('rideDriftTrend', () => {
    it('buildDriftProfileTrend maps steady recent rows', () => {
        const trend = buildDriftProfileTrend([steadyRide], 250, DRIFT_PROFILE.STEADY, {
            referenceYmd: '2026-08-19',
            weeks: 12,
        });
        expect(trend.recentDrift).toHaveLength(1);
        expect(trend.recentDrift[0].driftPct).toBe(4.2);
        expect(trend.showWeeklyEfChart).toBe(true);
    });

    it('buildDriftProfileTrend builds threshold weekly drift', () => {
        const trend = buildDriftProfileTrend([thresholdRide], 280, DRIFT_PROFILE.THRESHOLD, {
            referenceYmd: '2026-08-19',
            weeks: 12,
        });
        expect(trend.eligibleRideCount).toBe(1);
        expect(trend.recentDrift[0].driftPct).toBe(7.1);
        expect(trend.weeklyDriftPoints.some((w) => w.avgDriftPct != null)).toBe(true);
    });

    it('buildDriftProfilePortfolio aggregates threshold rides', () => {
        const portfolio = buildDriftProfilePortfolio([thresholdRide], 280, DRIFT_PROFILE.THRESHOLD, {
            referenceYmd: '2026-08-19',
            weeks: 12,
        });
        expect(portfolio.analyzedCount).toBe(1);
        expect(portfolio.avgDriftPct).toBe(7.1);
    });

    it('summarizeDriftProfile returns threshold headline', () => {
        const trend = buildDriftProfileTrend([thresholdRide], 280, DRIFT_PROFILE.THRESHOLD, {
            referenceYmd: '2026-08-19',
            weeks: 12,
        });
        const summary = summarizeDriftProfile(trend, DRIFT_PROFILE.THRESHOLD);
        expect(summary.headline).toMatch(/Threshold drift/i);
    });

    it('countDriftProfileSignals tracks per profile', () => {
        const counts = countDriftProfileSignals([steadyRide, thresholdRide], 280);
        expect(counts[DRIFT_PROFILE.STEADY].analyzed).toBe(1);
        expect(counts[DRIFT_PROFILE.THRESHOLD].analyzed).toBe(1);
    });
});
