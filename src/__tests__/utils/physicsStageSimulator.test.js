import { describe, it, expect } from 'vitest';
import {
    simulatePhysicsStage,
    stageWattsFromIntensity,
    formatStageDuration,
} from '../../utils/physicsStageSimulator';

const user = { weight: 70, bikeWeight: 8, ftp: 250 };

const climbA = { id: 'a', name: 'Col A', lengthKm: 8, elevation: 600, avgGrade: 7.5, country: 'FR' };
const climbB = { id: 'b', name: 'Col B', lengthKm: 5, elevation: 400, avgGrade: 8, country: 'IT' };

describe('physicsStageSimulator', () => {
    it('formatStageDuration formats hours and minutes', () => {
        expect(formatStageDuration(90)).toBe('1:30');
        expect(formatStageDuration(3661)).toBe('1:01:01');
    });

    it('stageWattsFromIntensity scales FTP', () => {
        expect(stageWattsFromIntensity(250, 0.85)).toBe(213);
    });

    it('returns null for empty climb list', () => {
        expect(simulatePhysicsStage({ climbs: [], userSettings: user, watts: 200 })).toBeNull();
    });

    it('simulates multiple climbs with recovery between', () => {
        const result = simulatePhysicsStage({
            climbs: [climbA, climbB],
            userSettings: user,
            watts: stageWattsFromIntensity(user.ftp, 0.85),
            recoveryMinutesById: { a: 20 },
            defaultRecoveryMinutes: 15,
        });

        expect(result).not.toBeNull();
        expect(result.segments.length).toBe(2);
        expect(result.totals.climbCount).toBe(2);
        expect(result.totals.totalElevationM).toBe(1000);
        expect(result.totals.totalClimbSeconds).toBeGreaterThan(0);
        expect(result.totals.totalRecoverySeconds).toBe(20 * 60);
        expect(result.totals.totalTss).toBeGreaterThan(0);
        expect(result.segments[0].recoveryMinutes).toBe(20);
        expect(result.segments[1].recoveryMinutes).toBe(0);
        expect(result.segments[1].startOffsetSeconds).toBeGreaterThan(result.segments[0].startOffsetSeconds);
    });

    it('higher stage watts shortens climb times', () => {
        const low = simulatePhysicsStage({
            climbs: [climbA],
            userSettings: user,
            watts: 180,
        });
        const high = simulatePhysicsStage({
            climbs: [climbA],
            userSettings: user,
            watts: 240,
        });
        expect(high.totals.totalClimbSeconds).toBeLessThan(low.totals.totalClimbSeconds);
    });
});
