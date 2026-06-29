import { describe, expect, it } from 'vitest';
import {
    mergeActivitiesPreservingEnrichment,
    prepareProtectedActivityUpserts,
} from '../../utils/activityUpsert';

describe('activity upsert helpers', () => {
    it('prepares Settings sync payloads without wiping enriched fields', () => {
        const existing = {
            id: '100',
            date: '2026-05-01',
            title: 'Alpine training ride',
            strava_id: '123',
            strava_map: 'encoded-route',
            gear_id: 'bike-1',
            gear_name: 'Race Bike',
            avg_hr: 148,
            strava_kom_summary: { label: 'PR · KOM#2' },
        };
        const incoming = {
            id: '100',
            date: '2026-05-01',
            title: 'Morning Ride',
            avg_hr: 0,
            norm_power: 252,
            load: 91,
        };

        expect(prepareProtectedActivityUpserts([existing], [incoming])).toEqual([
            {
                ...existing,
                norm_power: 252,
                load: 91,
            },
        ]);
    });

    it('merges local imports while preserving existing enrichment', () => {
        const existing = {
            id: '100',
            title: 'Alpine training ride',
            strava_id: '123',
            gear_name: 'Race Bike',
            avg_hr: 148,
        };
        const incoming = {
            id: '100',
            title: 'Morning Ride',
            avg_hr: 0,
            norm_power: 252,
        };

        expect(mergeActivitiesPreservingEnrichment([existing], [incoming])).toEqual([
            {
                ...existing,
                norm_power: 252,
            },
        ]);
    });
});
