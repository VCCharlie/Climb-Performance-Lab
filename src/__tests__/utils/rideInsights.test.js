import { describe, it, expect } from 'vitest';
import {
    activityVariabilityIndex,
    activityEfficiencyFactor,
    buildRideInsights,
    getLatestRideActivity,
} from '../../utils/rideInsights';

describe('activityVariabilityIndex', () => {
    it('returns NP / avg power', () => {
        expect(activityVariabilityIndex(200, 180)).toBeCloseTo(1.11, 2);
    });

    it('returns null for missing values', () => {
        expect(activityVariabilityIndex(0, 180)).toBe(null);
    });
});

describe('buildRideInsights', () => {
    it('builds narrative for endurance ride', () => {
        const insight = buildRideInsights({
            id: '1',
            date: '2026-08-10',
            title: 'Z2 Endurance',
            type: 'Ride',
            norm_power: 180,
            avg_power: 175,
            load: 65,
            climbing: 400,
            moving_time: 5400,
        }, { profileFtp: 250, allActivities: [] });

        expect(insight.summary).toMatch(/aerobic/i);
        expect(insight.bullets.some((b) => b.includes('TSS'))).toBe(true);
    });
});

describe('getLatestRideActivity', () => {
    it('returns first ride-like activity in list order', () => {
        const acts = [
            { id: 'w', type: 'Walk', date: '2026-08-11' },
            { id: 'r', type: 'Ride', date: '2026-08-10' },
        ];
        expect(getLatestRideActivity(acts)?.id).toBe('r');
    });
});
