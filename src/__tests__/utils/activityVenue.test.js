import { describe, it, expect } from 'vitest';
import {
    isVirtualActivity,
    isZwiftClimb,
    activityVenue,
    climbVenue,
    pbMatchesVenueFilter,
    resolvePbVenue,
} from '../../utils/activityVenue';

describe('activityVenue', () => {
    it('detects virtual rides and trainer sessions', () => {
        expect(isVirtualActivity({ type: 'VirtualRide' })).toBe(true);
        expect(isVirtualActivity({ type: 'Ride', trainer: true })).toBe(true);
        expect(isVirtualActivity({ type: 'Ride' })).toBe(false);
    });

    it('maps climbs and activities to outdoor vs virtual', () => {
        expect(climbVenue({ country: 'ZWIFT' })).toBe('virtual');
        expect(climbVenue({ country: 'FR' })).toBe('outdoor');
        expect(activityVenue({ type: 'VirtualRide' })).toBe('virtual');
        expect(activityVenue({ type: 'Ride' })).toBe('outdoor');
    });

    it('filters PB display by venue', () => {
        const realClimb = { id: 'fr_alpe', country: 'FR' };
        const zwiftPb = { normPower: 300, venue: 'virtual' };
        const outdoorPb = { normPower: 280, venue: 'outdoor' };

        expect(pbMatchesVenueFilter(outdoorPb, realClimb, 'outdoor')).toBe(true);
        expect(pbMatchesVenueFilter(zwiftPb, realClimb, 'outdoor')).toBe(false);
        expect(pbMatchesVenueFilter(zwiftPb, realClimb, 'all')).toBe(true);
        expect(resolvePbVenue(outdoorPb, realClimb)).toBe('outdoor');
    });
});
