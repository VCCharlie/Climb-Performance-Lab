import { describe, it, expect } from 'vitest';
import {
    applyManualClimbingCorrectionFlags,
    activityHasStravaLink,
    climbingWasManuallyEdited,
    hasProtectedClimbing,
    protectClimbingOnMerge,
    protectStravaLinkedGearOnMerge,
    protectStravaLinkedTitleOnMerge,
    protectStravaLinkedTypeOnMerge,
    shouldApplyStravaElevationPatch,
    protectZoneTimesFieldsOnMerge,
} from '../../utils/activityFieldRetention';

describe('activityFieldRetention', () => {
    it('detects manual climbing edits', () => {
        expect(climbingWasManuallyEdited({ climbing: 800 }, { climbing: 920 })).toBe(true);
        expect(climbingWasManuallyEdited({ climbing: 800 }, { climbing: 800 })).toBe(false);
    });

    it('marks manual climbing corrections', () => {
        const out = applyManualClimbingCorrectionFlags(
            { id: '1', climbing: 800 },
            { id: '1', climbing: 920 },
        );
        expect(out.climbing_user_corrected).toBe(true);
    });

    it('treats Strava and manual climbing as protected', () => {
        expect(hasProtectedClimbing({ climbing_from_strava: true })).toBe(true);
        expect(hasProtectedClimbing({ climbing_user_corrected: true })).toBe(true);
        expect(hasProtectedClimbing({ climbing: 500 })).toBe(false);
    });

    it('skips Strava elevation when climbing is protected unless forced', () => {
        const act = { climbing: 900, climbing_user_corrected: true };
        expect(shouldApplyStravaElevationPatch(act)).toBe(false);
        expect(shouldApplyStravaElevationPatch(act, { forceRefreshElevation: true })).toBe(true);
    });

    it('protectZoneTimesFieldsOnMerge keeps existing zone arrays', () => {
        const existing = {
            power_zone_sec: [0, 3600, 0, 0, 0, 0, 0],
            zone_times_source: 'intervals',
            zone_times_ftp: 250,
        };
        const out = { id: '1', avg_power: 200 };
        protectZoneTimesFieldsOnMerge({ id: '1', avg_power: 200 }, existing, out);
        expect(out.power_zone_sec[1]).toBe(3600);
        expect(out.zone_times_source).toBe('intervals');
    });

    it('activityHasStravaLink detects linked rows', () => {
        expect(activityHasStravaLink({ strava_id: '1234567890' })).toBe(true);
        expect(activityHasStravaLink({ strava_id: '123' })).toBe(false);
        expect(activityHasStravaLink({})).toBe(false);
    });

    it('protectStravaLinkedTitleOnMerge keeps custom Strava title over Intervals profile title', () => {
        const existing = {
            strava_id: '1234567890',
            title: 'Race with friends',
        };
        const incoming = { title: 'Wahoo ELEMNT' };
        const out = { ...incoming };
        protectStravaLinkedTitleOnMerge(incoming, existing, out);
        expect(out.title).toBe('Race with friends');
    });

    it('protectStravaLinkedTitleOnMerge keeps non-generic title even when it matches gear_name', () => {
        const existing = {
            strava_id: '1234567890',
            title: 'Canyon Endurace CF SL',
            gear_name: 'Canyon Endurace CF SL',
        };
        const incoming = { title: 'Evening Ride' };
        const out = { ...incoming };
        protectStravaLinkedTitleOnMerge(incoming, existing, out);
        expect(out.title).toBe('Canyon Endurace CF SL');
    });

    it('protectStravaLinkedTitleOnMerge allows Strava title to replace generic Morning Ride', () => {
        const existing = {
            strava_id: '1234567890',
            title: 'Morning Ride',
        };
        const incoming = { title: 'Epic gravel smash' };
        const out = { ...incoming };
        protectStravaLinkedTitleOnMerge(incoming, existing, out);
        expect(out.title).toBe('Epic gravel smash');
    });

    it('protectStravaLinkedTitleOnMerge allows Strava title to replace configured profile name AETHOS', () => {
        const profiles = ['SUPERIOR', 'AETHOS'];
        const existing = {
            strava_id: '1234567890',
            title: 'AETHOS',
        };
        const incoming = { title: 'Coffee ride with friends' };
        const out = { ...incoming };
        protectStravaLinkedTitleOnMerge(incoming, existing, out, { deviceProfileTitles: profiles });
        expect(out.title).toBe('Coffee ride with friends');
    });

    it('protectStravaLinkedTitleOnMerge keeps custom title when Intervals sends profile name', () => {
        const profiles = ['AETHOS'];
        const existing = {
            strava_id: '1234567890',
            title: 'Race with friends — Galibier',
        };
        const incoming = { title: 'AETHOS' };
        const out = { ...incoming };
        protectStravaLinkedTitleOnMerge(incoming, existing, out, { deviceProfileTitles: profiles });
        expect(out.title).toBe('Race with friends — Galibier');
    });

    it('protectStravaLinkedGearOnMerge keeps Strava gear when Intervals sends bike-computer gear', () => {
        const existing = {
            strava_id: '1234567890',
            gear_id: 'g999',
            gear_name: 'Gravel bike',
        };
        const incoming = { gear_id: 'wahoo', gear_name: 'Wahoo GPS' };
        const out = { ...incoming };
        protectStravaLinkedGearOnMerge(incoming, existing, out);
        expect(out.gear_id).toBe('g999');
        expect(out.gear_name).toBe('Gravel bike');
    });

    it('protectStravaLinkedTypeOnMerge keeps Strava sport type', () => {
        const existing = { strava_id: '1234567890', type: 'GravelRide' };
        const incoming = { type: 'Ride' };
        const out = { ...incoming };
        protectStravaLinkedTypeOnMerge(incoming, existing, out);
        expect(out.type).toBe('GravelRide');
    });

    it('protectClimbingOnMerge keeps linked Strava climbing without flag', () => {
        const existing = { strava_id: '1234567890', climbing: 890 };
        const incoming = { climbing: 1100 };
        const out = { ...incoming };
        protectClimbingOnMerge(incoming, existing, out);
        expect(out.climbing).toBe(890);
    });
});
