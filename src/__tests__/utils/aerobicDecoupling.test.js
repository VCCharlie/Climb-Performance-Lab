import { describe, it, expect } from 'vitest';
import {
    computeDecouplingPercent,
    classifyDecouplingPercent,
    splitStreamHalves,
    analyzeDecouplingFromHalves,
    analyzeDecouplingFromStreams,
    isEligibleDecouplingRide,
    buildAerobicEfficiencyTrend,
    summarizeAerobicDecoupling,
    DECOUPLING_STATUS,
    AEROBIC_TREND_STATUS,
} from '../../utils/coach/aerobicDecoupling';

describe('aerobicDecoupling', () => {
    it('computeDecouplingPercent measures HR drift as positive %', () => {
        expect(computeDecouplingPercent(1.5, 1.4)).toBeCloseTo(6.67, 1);
        expect(computeDecouplingPercent(1.5, 1.5)).toBe(0);
        expect(computeDecouplingPercent(null, 1.4)).toBeNull();
    });

    it('classifyDecouplingPercent buckets thresholds', () => {
        expect(classifyDecouplingPercent(4)).toBe(DECOUPLING_STATUS.GOOD);
        expect(classifyDecouplingPercent(7)).toBe(DECOUPLING_STATUS.MODERATE);
        expect(classifyDecouplingPercent(12)).toBe(DECOUPLING_STATUS.HIGH);
    });

    it('splitStreamHalves and analyzeDecouplingFromStreams detect drift', () => {
        const power = [180, 180, 180, 180, 180, 180];
        const hr = [130, 131, 132, 140, 142, 145];
        const halves = splitStreamHalves(power, hr);
        expect(halves?.first.hr).toBeLessThan(halves?.second.hr);

        const analysis = analyzeDecouplingFromStreams(power, hr);
        expect(analysis?.decouplingPct).toBeGreaterThan(5);
        expect(analysis?.status).toBe(DECOUPLING_STATUS.MODERATE);
    });

    it('analyzeDecouplingFromHalves handles missing halves', () => {
        const analysis = analyzeDecouplingFromHalves({ power: 200, hr: 0 }, { power: 200, hr: 140 });
        expect(analysis.decouplingPct).toBeNull();
        expect(analysis.status).toBe(DECOUPLING_STATUS.UNKNOWN);
    });

    it('isEligibleDecouplingRide filters steady aerobic rides', () => {
        const steady = {
            type: 'Ride',
            moving_time: 5400,
            norm_power: 180,
            avg_power: 175,
            avg_hr: 135,
        };
        expect(isEligibleDecouplingRide(steady, 250)).toBe(true);

        const short = { ...steady, moving_time: 1800 };
        expect(isEligibleDecouplingRide(short, 250)).toBe(false);

        const hard = { ...steady, norm_power: 240 };
        expect(isEligibleDecouplingRide(hard, 250)).toBe(false);
    });

    it('buildAerobicEfficiencyTrend groups eligible rides by week', () => {
        const activities = [
            { date: '2026-08-04', type: 'Ride', moving_time: 5400, norm_power: 180, avg_power: 175, avg_hr: 130 },
            { date: '2026-08-06', type: 'Ride', moving_time: 5400, norm_power: 190, avg_power: 185, avg_hr: 135 },
            { date: '2026-08-11', type: 'Ride', moving_time: 5400, norm_power: 200, avg_power: 195, avg_hr: 132 },
        ];
        const trend = buildAerobicEfficiencyTrend(activities, 250, {
            referenceYmd: '2026-08-12',
            weeks: 4,
        });
        expect(trend.eligibleRideCount).toBe(3);
        expect(trend.weeklyPoints.some((w) => w.avgEf != null)).toBe(true);
    });

    it('summarizeAerobicDecoupling returns insufficient copy without data', () => {
        const summary = summarizeAerobicDecoupling(buildAerobicEfficiencyTrend([], 250));
        expect(summary.trendStatus).toBe(AEROBIC_TREND_STATUS.INSUFFICIENT);
        expect(summary.headline).toMatch(/Not enough/i);
    });
});
