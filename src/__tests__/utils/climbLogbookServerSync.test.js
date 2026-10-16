import { describe, expect, it } from 'vitest';
import {
    formatClimbLogbookSyncStatusLines,
    summarizeClimbLogbookPreview,
    validateClimbLogbookDateRange,
} from '../../utils/climbLogbookServerSync.js';

describe('climbLogbookServerSync', () => {
    it('validates date range', () => {
        expect(validateClimbLogbookDateRange('2022-06-04', '2022-06-04').ok).toBe(true);
        expect(validateClimbLogbookDateRange('2022-06-05', '2022-06-04').ok).toBe(false);
    });

    it('summarizes rides in range per route source', () => {
        const activities = [
            { id: 'a', date: '2022-06-04', strava_map: 'abc', intervals_map: 'def' },
            { id: 'b', date: '2022-06-03', intervals_map: 'ghi' },
            { id: 'c', date: '2022-06-04' },
        ];
        const cpl = summarizeClimbLogbookPreview(activities, '2022-06-04', '2022-06-04', 'cpl');
        expect(cpl.ridesInPeriod).toBe(2);
        expect(cpl.ridesWithRouteInBatch).toBe(1);
        expect(cpl.docsOutsidePeriod).toBe(1);

        const intervals = summarizeClimbLogbookPreview(activities, '2022-06-04', '2022-06-04', 'intervals');
        expect(intervals.ridesWithRouteInBatch).toBe(1);

        const strava = summarizeClimbLogbookPreview(activities, '2022-06-04', '2022-06-04', 'strava');
        expect(strava.ridesWithRouteInBatch).toBe(1);
    });

    it('formats server status lines', () => {
        const lines = formatClimbLogbookSyncStatusLines({
            state: 'completed',
            routeSource: 'cpl',
            jobStartDate: '2022-06-04',
            jobEndDate: '2022-06-04',
            ridesWithRouteInBatch: 1,
            matchesWritten: 0,
            message: 'Rides found but 0 climb matches — strict polyline check.',
            updatedAt: '2026-10-16T15:06:17.000Z',
        });
        expect(lines.some((l) => /Climb logbook sync/.test(l))).toBe(true);
        expect(lines.some((l) => /matchesWritten/.test(l))).toBe(true);
        expect(lines.some((l) => /strict polyline/.test(l))).toBe(true);
    });
});
