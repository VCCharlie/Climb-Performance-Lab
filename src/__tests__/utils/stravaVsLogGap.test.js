import { describe, it, expect } from 'vitest';
import {
    buildGapBikeSportTypes,
    stravaActivityMatchesGapTypes,
    stravaLocalDateYmd,
    siteDateToYmd,
    ymdInRangeInclusive,
    computeStravaVsLogGap,
    defaultGapRangeYtd,
} from '../../utils/stravaVsLogGap';

const ride = (id, ymd, m) => ({
    id,
    sport_type: 'Ride',
    type: 'Ride',
    start_date_local: `${ymd}T10:00:00`,
    distance: m,
    moving_time: 3600,
    name: `Ride ${id}`,
});

describe('buildGapBikeSportTypes', () => {
    it('excludes e-bike by default set composition', () => {
        const without = buildGapBikeSportTypes(false);
        expect(without.has('EBikeRide')).toBe(false);
        const withE = buildGapBikeSportTypes(true);
        expect(withE.has('EBikeRide')).toBe(true);
    });
});

describe('ymdInRangeInclusive', () => {
    it('includes boundaries', () => {
        expect(ymdInRangeInclusive('2025-06-15', '2025-01-01', '2025-12-31')).toBe(true);
        expect(ymdInRangeInclusive('2025-01-01', '2025-01-01', '2025-12-31')).toBe(true);
        expect(ymdInRangeInclusive('2024-12-31', '2025-01-01', '2025-12-31')).toBe(false);
    });
});

describe('computeStravaVsLogGap', () => {
    it('flags strict missing by Strava id and sums km', () => {
        const strava = [
            ride(1, '2025-03-01', 5000),
            ride(2, '2025-03-02', 10000),
        ];
        const site = [
            { id: 'x', strava_id: '1', type: 'Ride', date: '2025-03-01', distance: 5 },
        ];
        const r = computeStravaVsLogGap(strava, site, '2025-01-01', '2025-12-31', {
            includeEbikeRide: false,
            useFuzzyMatch: false,
        });
        expect(r.stravaRideCount).toBe(2);
        expect(r.logRideCount).toBe(1);
        expect(r.strictMissingCount).toBe(1);
        expect(r.strictMissing[0].id).toBe(2);
        expect(r.stravaTotalKm).toBeCloseTo(15);
        expect(r.logTotalKm).toBeCloseTo(5);
        expect(r.deltaKm).toBeCloseTo(10);
        expect(r.strictMissingKm).toBeCloseTo(10);
    });

    it('filters by date range', () => {
        const strava = [ride(1, '2024-06-01', 5000), ride(2, '2025-06-01', 5000)];
        const r = computeStravaVsLogGap(strava, [], '2025-01-01', '2025-12-31', {});
        expect(r.stravaRideCount).toBe(1);
    });

    it('includes EBikeRide when option on', () => {
        const ebike = {
            id: 9,
            sport_type: 'EBikeRide',
            type: 'EBikeRide',
            start_date_local: '2025-04-01T08:00:00',
            distance: 3000,
            moving_time: 600,
            name: 'Commute',
        };
        const rOff = computeStravaVsLogGap([ebike], [], '2025-01-01', '2025-12-31', {
            includeEbikeRide: false,
        });
        expect(rOff.stravaRideCount).toBe(0);
        const rOn = computeStravaVsLogGap([ebike], [], '2025-01-01', '2025-12-31', {
            includeEbikeRide: true,
        });
        expect(rOn.stravaRideCount).toBe(1);
        expect(rOn.strictMissingCount).toBe(1);
    });
});

describe('defaultGapRangeYtd', () => {
    it('returns Jan 1 through today', () => {
        const ref = new Date(2025, 4, 4);
        const { startYmd, endYmd } = defaultGapRangeYtd(ref);
        expect(startYmd).toBe('2025-01-01');
        expect(endYmd).toBe('2025-05-04');
    });
});

describe('siteDateToYmd', () => {
    it('strips time from ISO date', () => {
        expect(siteDateToYmd('2025-01-15T12:00:00Z')).toBe('2025-01-15');
        expect(siteDateToYmd('not-a-date')).toBe('');
    });
});
