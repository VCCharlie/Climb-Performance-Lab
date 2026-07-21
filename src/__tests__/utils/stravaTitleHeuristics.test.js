import { describe, it, expect } from 'vitest';
import {
    normalizeBikeComputerProfileTitles,
    titleMatchesConfiguredProfile,
    parseBikeComputerProfileTitlesInput,
} from '../../utils/bikeComputerProfileTitles';
import {
    isGenericActivityTitle,
    shouldPreferStravaTitle,
    activityLikelyNeedsStravaTitle,
} from '../../utils/stravaTitleHeuristics';

describe('bikeComputerProfileTitles', () => {
    it('parses comma-separated profile names', () => {
        expect(parseBikeComputerProfileTitlesInput('SUPERIOR, AETHOS')).toEqual(['SUPERIOR', 'AETHOS']);
        expect(normalizeBikeComputerProfileTitles(['SUPERIOR', 'superior', 'AETHOS'])).toEqual(['SUPERIOR', 'AETHOS']);
    });

    it('matches configured profile names case-insensitively', () => {
        expect(titleMatchesConfiguredProfile('aethos', ['SUPERIOR', 'AETHOS'])).toBe(true);
        expect(titleMatchesConfiguredProfile('Sunday ride', ['AETHOS'])).toBe(false);
    });
});

describe('stravaTitleHeuristics', () => {
    const profiles = ['SUPERIOR', 'AETHOS'];

    it('detects generic titles', () => {
        expect(isGenericActivityTitle('Morning Ride')).toBe(true);
        expect(isGenericActivityTitle('Alpine loop')).toBe(false);
    });

    it('prefers Strava title for configured bike-computer profile names', () => {
        expect(shouldPreferStravaTitle('SUPERIOR', 'Long climb', { deviceProfileTitles: profiles })).toBe(true);
        expect(shouldPreferStravaTitle('AETHOS', 'Coffee ride', { deviceProfileTitles: profiles })).toBe(true);
    });

    it('does not replace a custom title that is not in the profile list', () => {
        expect(shouldPreferStravaTitle('Team training block', 'Different Strava name', { deviceProfileTitles: profiles })).toBe(false);
        expect(shouldPreferStravaTitle('NEW BIKE', 'Strava name', { deviceProfileTitles: profiles })).toBe(false);
    });

    it('flags activities that likely need a Strava title when profile is configured', () => {
        expect(activityLikelyNeedsStravaTitle({ title: 'SUPERIOR' }, profiles)).toBe(true);
        expect(activityLikelyNeedsStravaTitle({ title: 'Long Sunday ride' }, profiles)).toBe(false);
    });
});
