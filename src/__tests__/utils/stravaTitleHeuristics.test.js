import { describe, it, expect } from 'vitest';
import {
    isGenericActivityTitle,
    isBikeComputerProfileTitle,
    shouldPreferStravaTitle,
    activityLikelyNeedsStravaTitle,
    titleMatchesGearName,
} from '../../utils/stravaTitleHeuristics';

describe('stravaTitleHeuristics', () => {
    it('detects generic titles', () => {
        expect(isGenericActivityTitle('Morning Ride')).toBe(true);
        expect(isGenericActivityTitle('')).toBe(true);
        expect(isGenericActivityTitle('Alpine loop')).toBe(false);
    });

    it('detects bike-computer profile default titles', () => {
        expect(isBikeComputerProfileTitle('SUPERIOR')).toBe(true);
        expect(isBikeComputerProfileTitle('AETHOS')).toBe(true);
        expect(isBikeComputerProfileTitle('Alpine loop')).toBe(false);
        expect(isBikeComputerProfileTitle('superior')).toBe(false);
    });

    it('prefers Strava title for device profile names', () => {
        expect(shouldPreferStravaTitle('SUPERIOR', 'Long climb with friends')).toBe(true);
        expect(shouldPreferStravaTitle('AETHOS', 'Coffee ride')).toBe(true);
    });

    it('does not replace a custom Intervals title', () => {
        expect(shouldPreferStravaTitle('Team training block', 'Different Strava name')).toBe(false);
    });

    it('prefers Strava when title matches gear name', () => {
        expect(shouldPreferStravaTitle('AETHOS', 'Sunday endurance', { gearName: 'AETHOS' })).toBe(true);
        expect(titleMatchesGearName('AETHOS', 'Aethos')).toBe(true);
    });

    it('flags activities that likely need a Strava title in auto-enrich', () => {
        expect(activityLikelyNeedsStravaTitle({ title: 'SUPERIOR' })).toBe(true);
        expect(activityLikelyNeedsStravaTitle({ title: 'Long Sunday ride' })).toBe(false);
    });
});
