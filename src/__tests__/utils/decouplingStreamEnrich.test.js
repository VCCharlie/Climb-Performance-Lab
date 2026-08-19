import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    buildDecouplingPatch,
    fetchDecouplingPatchForActivity,
    enrichActivitiesWithDecoupling,
} from '../../utils/decouplingStreamEnrich';

vi.mock('../../utils/intervalsStreamFetch', () => ({
    fetchIntervalsActivityStreams: vi.fn(),
}));

vi.mock('../../utils/stravaStreamFetch', () => ({
    fetchStravaActivityStreams: vi.fn(),
}));

import { fetchIntervalsActivityStreams } from '../../utils/intervalsStreamFetch';
import { fetchStravaActivityStreams } from '../../utils/stravaStreamFetch';

const steadyRide = {
    id: '12345',
    type: 'Ride',
    date: '2026-08-10',
    title: 'Z2 endurance',
    moving_time: 5400,
    norm_power: 180,
    avg_power: 175,
    avg_hr: 135,
};

const driftStreams = {
    time: [0, 60, 120, 180, 240, 300, 360, 420],
    watts: [180, 180, 180, 180, 180, 180, 180, 180],
    heartrate: [130, 131, 132, 133, 140, 142, 143, 145],
};

describe('decouplingStreamEnrich', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        fetchIntervalsActivityStreams.mockReset();
        fetchStravaActivityStreams.mockReset();
    });

    it('buildDecouplingPatch rounds summary fields', () => {
        const patch = buildDecouplingPatch({
            decouplingPct: 6.789,
            efFirst: 1.3846,
            efSecond: 1.2903,
            status: 'moderate',
        }, 'intervals');

        expect(patch).toEqual({
            decoupling_pct: 6.8,
            decoupling_ef_first: 1.38,
            decoupling_ef_second: 1.29,
            decoupling_status: 'moderate',
            decoupling_source: 'intervals',
            decoupling_analyzed_at: expect.any(String),
        });
    });

    it('fetchDecouplingPatchForActivity uses Intervals streams', async () => {
        fetchIntervalsActivityStreams.mockResolvedValueOnce(driftStreams);

        const patch = await fetchDecouplingPatchForActivity(steadyRide, {
            intervalsConfig: { apiKey: 'test-key' },
            profileFtp: 250,
        });

        expect(fetchIntervalsActivityStreams).toHaveBeenCalledWith('12345', { apiKey: 'test-key' });
        expect(patch?.decoupling_pct).toBeGreaterThan(0);
        expect(patch?.decoupling_source).toBe('intervals');
    });

    it('fetchDecouplingPatchForActivity skips when cached decoupling exists', async () => {
        const patch = await fetchDecouplingPatchForActivity(
            { ...steadyRide, decoupling_pct: 4.2 },
            { intervalsConfig: { apiKey: 'test-key' }, profileFtp: 250 },
        );

        expect(patch).toBeNull();
        expect(fetchIntervalsActivityStreams).not.toHaveBeenCalled();
    });

    it('fetchDriftPatchForActivity classifies threshold rides', async () => {
        fetchIntervalsActivityStreams.mockResolvedValueOnce(driftStreams);

        const thresholdRide = {
            ...steadyRide,
            id: '22345',
            norm_power: 220,
            avg_power: 210,
            avg_hr: 155,
        };

        const patch = await fetchDecouplingPatchForActivity(thresholdRide, {
            intervalsConfig: { apiKey: 'test-key' },
            profileFtp: 250,
        });

        expect(patch?.threshold_drift_pct).toBeGreaterThan(0);
        expect(patch?.decoupling_pct).toBeUndefined();
    });

    it('fetchDecouplingPatchForActivity falls back to Strava streams', async () => {
        fetchIntervalsActivityStreams.mockResolvedValueOnce(null);
        fetchStravaActivityStreams.mockResolvedValueOnce(driftStreams);

        const patch = await fetchDecouplingPatchForActivity(
            { ...steadyRide, strava_id: '987654321' },
            { profileFtp: 250, stravaToken: 'strava-token' },
        );

        expect(fetchStravaActivityStreams).toHaveBeenCalledWith('987654321', 'strava-token');
        expect(patch?.decoupling_source).toBe('strava');
    });

    it('enrichActivitiesWithDecoupling limits fetches and writes summary fields', async () => {
        fetchIntervalsActivityStreams.mockResolvedValue(driftStreams);

        const activities = [
            { ...steadyRide, id: '12345', date: '2026-08-12' },
            { ...steadyRide, id: '12346', date: '2026-08-11' },
            { ...steadyRide, id: '12347', date: '2026-08-10', decoupling_pct: 3.1 },
        ];

        const result = await enrichActivitiesWithDecoupling(activities, {
            intervalsConfig: { apiKey: 'test-key' },
            profileFtp: 250,
            maxFetches: 1,
            delayMs: 0,
        });

        expect(fetchIntervalsActivityStreams).toHaveBeenCalledTimes(1);
        const enriched = result.find((a) => a.id === '12345');
        expect(enriched?.decoupling_pct).toBeGreaterThan(0);
        expect(result.find((a) => a.id === '12346')?.decoupling_pct).toBeUndefined();
        expect(result.find((a) => a.id === '12347')?.decoupling_pct).toBe(3.1);
    });
});
