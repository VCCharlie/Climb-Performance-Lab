import { describe, it, expect } from 'vitest';
import { buildFuelingHandoff } from '../../utils/raceFuelingHandoff';

describe('buildFuelingHandoff', () => {
    it('returns null without race strategy', () => {
        expect(buildFuelingHandoff(null, 0.85, [])).toBeNull();
    });

    it('maps duration, intensity, carbs and altitude from climbs', () => {
        const handoff = buildFuelingHandoff(
            {
                totalTime: 245.7,
                carbsPerHour: 72.3,
                totalCarbs: 295,
            },
            0.88,
            [{ elevation: 1860 }, { elevation: 1200 }],
        );

        expect(handoff.duration).toBe(246);
        expect(handoff.intensity).toBe(0.88);
        expect(handoff.carbsPerHour).toBe(72);
        expect(handoff.totalCarbs).toBe(295);
        expect(handoff.altitude).toBeGreaterThan(0);
        expect(handoff.fromRacePacing).toBe(true);
        expect(handoff.climbCount).toBe(2);
        expect(Array.isArray(handoff.climbTimeline)).toBe(true);
    });

    it('includes climb-order timeline from race strategy details', () => {
        const handoff = buildFuelingHandoff(
            {
                totalTime: 120,
                carbsPerHour: 60,
                totalCarbs: 120,
                climbDetails: [
                    {
                        climb: { name: 'Test Climb' },
                        timeMinutes: 45,
                        cumulativeTime: 75,
                        recovery: 30,
                    },
                ],
            },
            0.85,
            [{ elevation: 900 }],
        );

        expect(handoff.climbTimeline.some((e) => e.climbName === 'Test Climb')).toBe(true);
    });
});
