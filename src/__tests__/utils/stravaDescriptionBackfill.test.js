import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    activityNeedsStravaDescription,
    pickActivitiesNeedingStravaDescription,
    buildStravaDescriptionBackfillUpdates,
} from '../../utils/stravaDescriptionBackfill';

describe('stravaDescriptionBackfill', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('activityNeedsStravaDescription when strava_id and empty description', () => {
        expect(activityNeedsStravaDescription({ strava_id: '123', title: 'Ride' })).toBe(true);
        expect(activityNeedsStravaDescription({ strava_id: '123', description: 'Cols' })).toBe(false);
        expect(activityNeedsStravaDescription({ title: 'Ride' })).toBe(false);
    });

    it('pickActivitiesNeedingStravaDescription respects onlyIds', () => {
        const acts = [
            { id: 'a1', strava_id: '1' },
            { id: 'a2', strava_id: '2', description: 'done' },
            { id: 'a3', strava_id: '3' },
        ];
        const picked = pickActivitiesNeedingStravaDescription(acts, ['a1', 'a3']);
        expect(picked.map((a) => a.id)).toEqual(['a1', 'a3']);
    });

    it('buildStravaDescriptionBackfillUpdates stores description only', async () => {
        fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ description: 'MyCols: Alpe d Huez' }),
        });

        const result = await buildStravaDescriptionBackfillUpdates(
            [{ id: 'site1', strava_id: '999' }],
            'token',
            { maxPerRun: 10 },
        );

        expect(result.filled).toBe(1);
        expect(result.updates[0].data).toEqual({ description: 'MyCols: Alpe d Huez' });
        expect(String(fetch.mock.calls[0][0])).not.toContain('include_all_efforts');
    });
});
