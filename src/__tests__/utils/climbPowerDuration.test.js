import { describe, it, expect } from 'vitest';
import {
    sustainablePowerAtDuration,
    estimateClimbWithPowerCurve,
} from '../../utils/climbPowerDuration';

const climb = {
    id: 'test-climb',
    lengthKm: 10,
    elevation: 800,
    avgGrade: 8,
};

const userSettings = { weight: 70, bikeWeight: 8, ftp: 300 };

describe('climbPowerDuration', () => {
    it('returns null power when no activities', () => {
        expect(sustainablePowerAtDuration([], 300, 3600)).toEqual({
            watts: null,
            sourceActivityId: null,
        });
    });

    it('picks strongest interpolated power at duration', () => {
        const activities = [
            {
                id: 'a1',
                date: '2026-01-01',
                best_20min: 280,
                best_60min: 250,
                moving_time: 7200,
            },
            {
                id: 'a2',
                date: '2026-02-01',
                best_20min: 310,
                best_60min: 270,
                moving_time: 7200,
            },
        ];
        const { watts, sourceActivityId } = sustainablePowerAtDuration(activities, 300, 1200);
        expect(watts).toBeGreaterThan(250);
        expect(sourceActivityId).toBeTruthy();
    });

    it('refines climb estimate when power curve data exists', () => {
        const activities = [
            {
                id: 'a1',
                date: '2026-01-01',
                best_20min: 320,
                best_60min: 290,
                moving_time: 7200,
            },
        ];
        const result = estimateClimbWithPowerCurve({
            selectedClimb: climb,
            userSettings,
            activities,
            intensityFraction: 0.85,
        });
        expect(result.ftpEstimate.watts).toBeGreaterThan(0);
        expect(result.usedPowerCurve).toBe(true);
        expect(result.curveEstimate?.seconds).toBeGreaterThan(0);
    });
});
