import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    activityNeedsDecouplingBackfill,
    activityCanFetchDecouplingStreams,
    pickActivitiesNeedingDecouplingBackfill,
    buildDecouplingBackfillUpdates,
} from '../../utils/decouplingStreamBackfill';

vi.mock('../../utils/decouplingStreamEnrich', () => ({
    enrichActivitiesWithDecoupling: vi.fn(),
}));

import { enrichActivitiesWithDecoupling } from '../../utils/decouplingStreamEnrich';

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

describe('decouplingStreamBackfill', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        enrichActivitiesWithDecoupling.mockReset();
    });

    it('activityNeedsDecouplingBackfill requires eligible ride without cached decoupling', () => {
        expect(activityNeedsDecouplingBackfill(steadyRide, 250)).toBe(true);
        expect(activityNeedsDecouplingBackfill({ ...steadyRide, decoupling_pct: 4.2 }, 250)).toBe(false);
        expect(activityNeedsDecouplingBackfill({ ...steadyRide, moving_time: 1200 }, 250)).toBe(false);
    });

    it('activityCanFetchDecouplingStreams checks Intervals or Strava access', () => {
        expect(activityCanFetchDecouplingStreams(steadyRide, {
            intervalsConfig: { apiKey: 'key' },
            hasStravaToken: false,
        })).toBe(true);
        expect(activityCanFetchDecouplingStreams(
            { ...steadyRide, id: 'strava_1', strava_id: '999' },
            { hasStravaToken: true },
        )).toBe(true);
        expect(activityCanFetchDecouplingStreams(steadyRide, { hasStravaToken: false })).toBe(false);
    });

    it('pickActivitiesNeedingDecouplingBackfill sorts newest first and respects onlyIds', () => {
        const activities = [
            { ...steadyRide, id: '1', date: '2026-08-08' },
            { ...steadyRide, id: '2', date: '2026-08-12' },
            { ...steadyRide, id: '3', date: '2026-08-11', decoupling_pct: 3.1 },
        ];
        const picked = pickActivitiesNeedingDecouplingBackfill(activities, 250, ['1'], {
            intervalsConfig: { apiKey: 'key' },
            hasStravaToken: false,
        });
        expect(picked).toHaveLength(1);
        expect(picked[0].id).toBe('1');
    });

    it('buildDecouplingBackfillUpdates returns blockedReason without FTP', async () => {
        const result = await buildDecouplingBackfillUpdates([steadyRide], {
            profileFtp: 0,
            intervalsConfig: { apiKey: 'key' },
        });
        expect(result.blockedReason).toBe('missing_ftp');
        expect(result.updates).toHaveLength(0);
    });

    it('buildDecouplingBackfillUpdates builds updates from enrich results', async () => {
        enrichActivitiesWithDecoupling.mockResolvedValue([
            {
                ...steadyRide,
                decoupling_pct: 6.2,
                decoupling_status: 'moderate',
                decoupling_source: 'intervals',
                decoupling_analyzed_at: '2026-08-19',
            },
        ]);

        const result = await buildDecouplingBackfillUpdates([steadyRide], {
            profileFtp: 250,
            intervalsConfig: { apiKey: 'key' },
            maxPerRun: 8,
        });

        expect(enrichActivitiesWithDecoupling).toHaveBeenCalledTimes(1);
        expect(result.enriched).toBe(1);
        expect(result.updates[0].data.decoupling_pct).toBe(6.2);
        expect(result.updates[0].data.decoupling_source).toBe('intervals');
    });
});
