import { describe, it, expect } from 'vitest';
import {
    buildStravaSyncMatchSummary,
    formatStravaSyncMatchSummary,
    countLinkedSiteRowsInRange,
    filterBikeStravaInRange,
} from '../../utils/stravaSyncMatchSummary.js';

describe('stravaSyncMatchSummary', () => {
    it('filterBikeStravaInRange keeps bike types on calendar days', () => {
        const list = [
            { id: 1, sport_type: 'Ride', start_date_local: '2025-04-13T10:00:00' },
            { id: 2, sport_type: 'Run', start_date_local: '2025-04-13T11:00:00' },
            { id: 3, sport_type: 'Ride', start_date_local: '2025-04-14T10:00:00' },
        ];
        expect(filterBikeStravaInRange(list, '2025-04-13', '2025-04-13').map((a) => a.id)).toEqual([1]);
    });

    it('countLinkedSiteRowsInRange counts rows with strava_id in range', () => {
        const rows = [
            { id: 'a', date: '2025-04-13T09:00:00', strava_id: '111' },
            { id: 'b', date: '2025-04-13T14:00:00' },
            { id: 'c', date: '2025-04-14T09:00:00', strava_id: '222' },
        ];
        expect(countLinkedSiteRowsInRange(rows, '2025-04-13', '2025-04-13')).toBe(1);
    });

    it('buildStravaSyncMatchSummary reports unmatched Strava when log has fewer rows', () => {
        const summary = buildStravaSyncMatchSummary({
            siteActivities: [{ id: 'i1', date: '2025-04-13T09:00:00', type: 'Ride', strava_id: '14163440910' }],
            stravaList: [
                { id: 14163153066, sport_type: 'Ride', start_date_local: '2025-04-13T14:00:00', distance: 37000 },
                { id: 14163440910, sport_type: 'VirtualRide', start_date_local: '2025-04-13T09:00:00', distance: 5400 },
            ],
            startYmd: '2025-04-13',
            endYmd: '2025-04-13',
            intervalsImported: 1,
        });

        expect(summary.stravaRideCount).toBe(2);
        expect(summary.linkedCount).toBe(1);
        expect(summary.unmatchedCount).toBe(1);
        expect(formatStravaSyncMatchSummary(summary)).toContain('1 from Intervals.icu');
        expect(formatStravaSyncMatchSummary(summary)).toContain('unmatched');
    });

    it('formatStravaSyncMatchSummary returns empty string when no parts', () => {
        expect(formatStravaSyncMatchSummary({ parts: [] })).toBe('');
    });
});
