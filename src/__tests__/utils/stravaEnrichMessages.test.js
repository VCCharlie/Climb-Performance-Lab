import { describe, it, expect } from 'vitest';
import { buildStravaEnrichFailureMessage } from '../../utils/stravaEnrichMessages';

describe('buildStravaEnrichFailureMessage', () => {
    it('suggests reconnect when scope lacks private read and API returns nothing', () => {
        const msg = buildStravaEnrichFailureMessage(
            {
                updates: [],
                bikeActivitiesFound: 0,
                stravaTotalFetched: 0,
            },
            { stravaConfig: { has_private_read: false } },
        );
        expect(msg).toContain('Reconnect Strava');
        expect(msg).toContain('private');
    });

    it('reports bike rides found but no match', () => {
        const msg = buildStravaEnrichFailureMessage({
            updates: [],
            bikeActivitiesFound: 2,
            stravaTotalFetched: 2,
            matchCount: 0,
            linkedCount: 0,
            ridesProcessed: 0,
        });
        expect(msg).toContain('2 Strava bike ride');
        expect(msg).toContain('none matched');
    });

    it('returns null when updates exist', () => {
        expect(buildStravaEnrichFailureMessage({ updates: [{ id: '1', data: {} }] })).toBeNull();
    });
});
