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
            avg_hr: 140,
            load: 65,
            climbing: 400,
            moving_time: 5400,
        }, { profileFtp: 250, allActivities: [] });

        expect(insight.summary).toMatch(/aerobic/i);
        expect(insight.bullets.some((b) => b.includes('TSS'))).toBe(true);
        expect(insight.detail).toMatch(/steady|efficiency/i);
    });

    it('adds recovery note for high TSS rides', () => {
        const insight = buildRideInsights({
            id: '2',
            date: '2026-08-11',
            title: 'Long ride',
            type: 'Ride',
            norm_power: 220,
            avg_power: 200,
            load: 150,
            moving_time: 7200,
        }, { profileFtp: 250, allActivities: [] });

        expect(insight.detail).toMatch(/demanding|tomorrow/i);
    });
});

describe('getLatestRideActivity', () => {
    it('returns the ride with the most recent date', () => {
        const acts = [
            { id: 'old', type: 'Ride', date: '2026-08-10' },
            { id: 'new', type: 'Ride', date: '2026-08-12' },
            { id: 'walk', type: 'Walk', date: '2026-08-13' },
        ];
        expect(getLatestRideActivity(acts)?.id).toBe('new');
    });

    it('falls back to first ride-like activity when dates are missing', () => {
        const acts = [
            { id: 'w', type: 'Walk', date: '2026-08-11' },
            { id: 'r', type: 'Ride', date: '2026-08-10' },
        ];
        expect(getLatestRideActivity(acts)?.id).toBe('r');
    });
});
