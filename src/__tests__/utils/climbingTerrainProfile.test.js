import { describe, it, expect } from 'vitest';
import {
    normalizeTerrainProfile,
    elevationTargetsForProfile,
    dayIndexInCalendarWeek,
    buildClimbingReadinessHints,
    lowVolumeBadgeLabel,
    TERRAIN_PROFILE_FLAT,
    TERRAIN_PROFILE_HILLY,
} from '../../utils/climbingTerrainProfile';

describe('climbingTerrainProfile', () => {
    it('normalizeTerrainProfile defaults invalid values to hilly', () => {
        expect(normalizeTerrainProfile(undefined)).toBe(TERRAIN_PROFILE_HILLY);
        expect(normalizeTerrainProfile('unknown')).toBe(TERRAIN_PROFILE_HILLY);
        expect(normalizeTerrainProfile(TERRAIN_PROFILE_FLAT)).toBe(TERRAIN_PROFILE_FLAT);
    });

    it('elevationTargetsForProfile scales flat lower than hilly', () => {
        const flat = elevationTargetsForProfile(TERRAIN_PROFILE_FLAT, 7);
        const hilly = elevationTargetsForProfile(TERRAIN_PROFILE_HILLY, 7);
        expect(flat.goodAt).toBeLessThan(hilly.goodAt);
        expect(flat.maxAt).toBeLessThan(hilly.maxAt);
    });

    it('dayIndexInCalendarWeek treats Monday as 0', () => {
        const monday = new Date('2026-08-03T12:00:00');
        expect(dayIndexInCalendarWeek(monday)).toBe(0);
    });

    it('early week with no rides suggests week just started', () => {
        const monday = new Date('2026-08-03T12:00:00');
        const hints = buildClimbingReadinessHints({
            terrainProfile: TERRAIN_PROFILE_FLAT,
            elevationScore: 10,
            z2Score: 50,
            tssScore: 50,
            tsb: 5,
            ftp: 250,
            rideCount: 0,
            referenceDate: monday,
            periodDays: 7,
        });
        expect(hints[0]).toMatch(/Week just started/i);
    });

    it('flat terrain uses coastal hint when not early week', () => {
        const thursday = new Date('2026-08-06T12:00:00');
        const hints = buildClimbingReadinessHints({
            terrainProfile: TERRAIN_PROFILE_FLAT,
            elevationScore: 20,
            z2Score: 50,
            tssScore: 50,
            tsb: 5,
            ftp: 250,
            rideCount: 1,
            referenceDate: thursday,
            periodDays: 7,
        });
        expect(hints.some((h) => /dune|flat terrain|trainer/i.test(h))).toBe(true);
    });

    it('lowVolumeBadgeLabel differs for flat terrain', () => {
        expect(lowVolumeBadgeLabel(TERRAIN_PROFILE_FLAT)).toMatch(/vertical stimulus/i);
        expect(lowVolumeBadgeLabel(TERRAIN_PROFILE_HILLY)).toMatch(/climbing volume/i);
    });
});
