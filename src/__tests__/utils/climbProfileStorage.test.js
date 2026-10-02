import { describe, it, expect, beforeEach } from 'vitest';
import {
    saveStoredClimbProfile,
    getStoredClimbProfile,
    clearStoredClimbProfile,
    CLIMB_PROFILE_STORAGE_KEY,
} from '../../utils/climbProfileStorage.js';

describe('climbProfileStorage', () => {
    beforeEach(() => {
        localStorage.removeItem(CLIMB_PROFILE_STORAGE_KEY);
    });

    it('round-trips profile by climb id', () => {
        saveStoredClimbProfile({
            climbId: 'test_climb',
            source: 'gpx',
            points: [
                { distanceKm: 0, elevation: 100, gradient: 0, progress: 0 },
                { distanceKm: 1, elevation: 150, gradient: 5, progress: 100 },
            ],
            fileName: 'ride.gpx',
        });
        const loaded = getStoredClimbProfile('test_climb');
        expect(loaded?.fileName).toBe('ride.gpx');
        expect(loaded?.points.length).toBe(2);
        clearStoredClimbProfile('test_climb');
        expect(getStoredClimbProfile('test_climb')).toBeNull();
    });
});
