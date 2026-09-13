import { describe, expect, it } from 'vitest';
import {
    mergeActivitiesDirectUpsert,
    mergeActivitiesPreservingEnrichment,
    prepareProtectedActivityUpserts,
    prepareProtectedActivityUpsertsFromCurrent,
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

    it('prepares protected upserts from the current activity snapshot at call time', () => {
        const staleExisting = {
            id: '100',
            title: 'Morning Ride',
            avg_hr: 0,
        };
        const currentExisting = {
            id: '100',
            title: 'Strava enriched ride',
            strava_id: '123',
            gear_id: 'bike-1',
            gear_name: 'Race Bike',
            avg_hr: 151,
        };
        const incoming = {
            id: '100',
            title: 'Morning Ride',
            avg_hr: 0,
            load: 88,
        };
        let current = [staleExisting];
        const getCurrent = () => current;

        current = [currentExisting];

        expect(prepareProtectedActivityUpsertsFromCurrent(getCurrent, [incoming])).toEqual([
            {
                ...currentExisting,
                load: 88,
            },
        ]);
    });

    it('direct upsert applies user edits on Strava-linked rows without protection', () => {
        const existing = {
            id: '100',
            title: 'Old title',
            type: 'Ride',
            strava_id: '12345678',
            climbing: 500,
            climbing_user_corrected: true,
        };
        const incoming = {
            id: '100',
            title: 'Corrected 2017 climb',
            type: 'VirtualRide',
            climbing: 820,
            climbing_user_corrected: true,
        };

        expect(mergeActivitiesDirectUpsert([existing], [incoming])).toEqual([
            {
                id: '100',
                title: 'Corrected 2017 climb',
                type: 'VirtualRide',
                strava_id: '12345678',
                climbing: 820,
                climbing_user_corrected: true,
            },
        ]);
    });

    it('preserving enrichment still blocks Strava-linked type overwrite on sync-shaped import', () => {
        const existing = {
            id: '100',
            type: 'VirtualRide',
            strava_id: '12345678',
        };
        const incoming = {
            id: '100',
            type: 'Ride',
        };

        expect(mergeActivitiesPreservingEnrichment([existing], [incoming])).toEqual([
            {
                id: '100',
                type: 'VirtualRide',
                strava_id: '12345678',
            },
        ]);
    });
});
