import { describe, it, expect } from 'vitest';
import {
    migrateLegacySportTypeFilters,
    normalizeActiveSportTypes,
    toggleActiveSportType,
} from '../../utils/activitySportTypeFilters';

describe('activitySportTypeFilters', () => {
    it('migrates legacy boolean chips to activeSportTypes', () => {
        expect(migrateLegacySportTypeFilters({
            gravelRideChip: true,
            mtbRideChip: true,
        })).toEqual(['GravelRide', 'MountainBikeRide']);
    });

    it('prefers stored activeSportTypes over legacy flags', () => {
        expect(migrateLegacySportTypeFilters({
            activeSportTypes: ['Run'],
            gravelRideChip: true,
        })).toEqual(['Run']);
    });

    it('toggleActiveSportType adds and removes types in SPORT_TYPES order', () => {
        expect(toggleActiveSportType([], 'Ride')).toEqual(['Ride']);
        expect(toggleActiveSportType(['Ride', 'Run'], 'Ride')).toEqual(['Run']);
    });

    it('normalizeActiveSportTypes drops unknown values', () => {
        expect(normalizeActiveSportTypes(['Ride', 'Swim', 'Hike'])).toEqual(['Ride', 'Hike']);
    });
});
