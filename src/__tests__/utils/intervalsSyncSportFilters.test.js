import { describe, it, expect } from 'vitest';
import {
    buildDefaultIntervalsSyncSportFilters,
    mergeIntervalsSyncSportFilters,
} from '../../utils/intervalsSyncSportFilters';
import { CYCLING_SPORT_TYPES, SPORT_TYPES } from '../../config';

describe('intervalsSyncSportFilters', () => {
    it('enables cycling types only by default', () => {
        const filters = buildDefaultIntervalsSyncSportFilters();
        for (const type of CYCLING_SPORT_TYPES) {
            expect(filters[type]).toBe(true);
        }
        expect(filters.Run).toBe(false);
        expect(filters.Walk).toBe(false);
        expect(filters.Hike).toBe(false);
    });

    it('mergeIntervalsSyncSportFilters keeps saved toggles', () => {
        const merged = mergeIntervalsSyncSportFilters({ Run: true, Ride: false });
        expect(merged.Run).toBe(true);
        expect(merged.Ride).toBe(false);
        expect(merged.VirtualRide).toBe(true);
    });

    it('covers every SPORT_TYPES key', () => {
        const filters = buildDefaultIntervalsSyncSportFilters();
        expect(Object.keys(filters).sort()).toEqual([...SPORT_TYPES].sort());
    });
});
