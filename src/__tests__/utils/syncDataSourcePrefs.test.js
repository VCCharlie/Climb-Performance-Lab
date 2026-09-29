import { describe, it, expect } from 'vitest';
import {
    DEFAULT_SYNC_DATA_SOURCE_PREFS,
    mergeSyncDataSourcePrefs,
    resolveSyncDataSourcePrefs,
    formatSyncDataSourcePrefsSummary,
    normalizeFieldDataSource,
} from '../../utils/syncDataSourcePrefs.js';
import { protectEnrichedFieldsOnMerge } from '../../utils/firestoreActivityMerge.js';
import { shouldApplyStravaElevationPatch } from '../../utils/activityFieldRetention.js';
import { applyStravaElevationToActivity } from '../../utils/stravaElevation.js';

describe('syncDataSourcePrefs', () => {
    it('defaults to Strava for all fields on legacy saves', () => {
        expect(mergeSyncDataSourcePrefs(null)).toEqual(DEFAULT_SYNC_DATA_SOURCE_PREFS);
    });

    it('normalizes invalid values to strava', () => {
        expect(normalizeFieldDataSource('garmin')).toBe('strava');
        expect(normalizeFieldDataSource('intervals')).toBe('intervals');
    });

    it('resolveSyncDataSourcePrefs reads nested settings', () => {
        const prefs = resolveSyncDataSourcePrefs({
            syncDataSourcePrefs: { elevation: 'intervals' },
        });
        expect(prefs.elevation).toBe('intervals');
        expect(prefs.title).toBe('strava');
    });

    it('formatSyncDataSourcePrefsSummary lists sources', () => {
        const text = formatSyncDataSourcePrefsSummary(DEFAULT_SYNC_DATA_SOURCE_PREFS);
        expect(text).toContain('elevation Strava');
        expect(text).toContain('title Strava');
    });
});

describe('data source prefs in merge pipeline', () => {
    const stravaLinked = {
        strava_id: '1234567890',
        title: 'Alpine loop',
        climbing: 900,
        climbing_from_strava: true,
        gear_name: 'Road bike',
        type: 'VirtualRide',
    };

    it('intervals elevation pref allows Intervals climbing to replace Strava', () => {
        const incoming = { id: '1', climbing: 750, title: 'Wahoo ELEMNT' };
        const out = protectEnrichedFieldsOnMerge(incoming, stravaLinked, {
            dataSourcePrefs: { ...DEFAULT_SYNC_DATA_SOURCE_PREFS, elevation: 'intervals' },
        });
        expect(out.climbing).toBe(750);
    });

    it('strava elevation pref keeps Strava climbing on merge', () => {
        const incoming = { id: '1', climbing: 750 };
        const out = protectEnrichedFieldsOnMerge(incoming, stravaLinked, {
            dataSourcePrefs: DEFAULT_SYNC_DATA_SOURCE_PREFS,
        });
        expect(out.climbing).toBe(900);
        expect(out.climbing_from_strava).toBe(true);
    });

    it('intervals title pref accepts specific Intervals title on Strava-linked row', () => {
        const incoming = { id: '1', title: 'Alpe du Zwift' };
        const out = protectEnrichedFieldsOnMerge(incoming, stravaLinked, {
            dataSourcePrefs: { ...DEFAULT_SYNC_DATA_SOURCE_PREFS, title: 'intervals' },
        });
        expect(out.title).toBe('Alpe du Zwift');
    });

    it('intervals elevation pref skips Strava elevation patch', () => {
        expect(shouldApplyStravaElevationPatch(
            { climbing: 500 },
            { dataSourcePrefs: { ...DEFAULT_SYNC_DATA_SOURCE_PREFS, elevation: 'intervals' } },
        )).toBe(false);
        const out = applyStravaElevationToActivity(
            { id: '1', climbing: 500 },
            { total_elevation_gain: 812 },
            { dataSourcePrefs: { ...DEFAULT_SYNC_DATA_SOURCE_PREFS, elevation: 'intervals' } },
        );
        expect(out.climbing).toBe(500);
    });

    it('manual climbing correction still wins with intervals elevation pref', () => {
        const existing = { ...stravaLinked, climbing: 920, climbing_user_corrected: true };
        const incoming = { id: '1', climbing: 750 };
        const out = protectEnrichedFieldsOnMerge(incoming, existing, {
            dataSourcePrefs: { ...DEFAULT_SYNC_DATA_SOURCE_PREFS, elevation: 'intervals' },
        });
        expect(out.climbing).toBe(920);
        expect(out.climbing_user_corrected).toBe(true);
    });
});
