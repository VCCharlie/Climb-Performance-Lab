import { describe, it, expect } from 'vitest';
import {
    weatherLookupQueryForClimb,
    weatherCountryLabel,
    canResolveWeatherForClimb,
    WEATHER_CLIMB_LOCATIONS,
} from '../../utils/weatherClimbLocations';

describe('weatherClimbLocations', () => {
    it('weatherCountryLabel maps ISO codes to English names', () => {
        expect(weatherCountryLabel('FR')).toBe('France');
        expect(weatherCountryLabel('it')).toBe('Italy');
        expect(weatherCountryLabel('XX')).toBe('XX');
    });

    it('uses curated location query for known climbs', () => {
        expect(weatherLookupQueryForClimb({ id: 'fr_alpe', name: "Alpe d'Huez", country: 'FR' }))
            .toBe(WEATHER_CLIMB_LOCATIONS.fr_alpe.q);
    });

    it('uses lat/lon when present on climb', () => {
        expect(weatherLookupQueryForClimb({
            id: 'fr_test',
            name: 'Test Col',
            country: 'FR',
            lat: 45.09,
            lon: 6.07,
        })).toBe('45.09,6.07');
    });

    it('builds name + country label fallback for outdoor climbs', () => {
        expect(weatherLookupQueryForClimb({
            id: 'fr_unknown',
            name: 'Col du Soulor',
            country: 'FR',
            region: 'Pyrénées',
        })).toBe('Col du Soulor, Pyrénées, France');
    });

    it('canResolveWeatherForClimb rejects Zwift and accepts outdoor climbs', () => {
        expect(canResolveWeatherForClimb({ country: 'ZWIFT', name: 'Alpe du Zwift' })).toBe(false);
        expect(canResolveWeatherForClimb({ country: 'FR', name: 'Some Col' })).toBe(true);
        expect(canResolveWeatherForClimb({ country: 'IT', lat: 46.5, lon: 10.4 })).toBe(true);
    });
});
