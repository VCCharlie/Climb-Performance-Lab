import { describe, it, expect } from 'vitest';
import {
    isVirtualActivity,
    isZwiftClimb,
    activityVenue,
    climbVenue,
    pbMatchesVenueFilter,
    resolvePbVenue,
    resolveActivityType,
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

    it('resolveActivityType treats Rouvy titles as virtual', () => {
        expect(resolveActivityType({ type: 'Ride', title: 'Rouvy - Col du Tourmalet' })).toBe('VirtualRide');
        expect(isVirtualActivity({ type: 'Ride', title: 'Rouvy - Col du Tourmalet' })).toBe(true);
    });

    it('resolvePbVenue prefers linked activity venue over climb country', () => {
        const climb = { id: 'fr_alpe', country: 'FR' };
        const pb = { normPower: 250, activityId: '1' };
        const virtualAct = { id: '1', type: 'VirtualRide', title: 'Rouvy ride' };
        expect(resolvePbVenue(pb, climb, virtualAct)).toBe('virtual');
        expect(pbMatchesVenueFilter(pb, climb, 'outdoor', virtualAct)).toBe(false);
    });
});
