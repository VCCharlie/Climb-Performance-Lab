import { describe, it, expect } from 'vitest';
import {
    DEFAULT_CRR,
    DEFAULT_CDA,
    DEFAULT_GRAVITY,
    DEFAULT_AIR_DENSITY,
    DEFAULT_DRIVETRAIN_EFFICIENCY,
    DEFAULT_DRIVETRAIN_LOSS_FRACTION,
    DEFAULT_PHYSICS_SETTINGS,
    mergePhysicsSettings,
    resolvePhysicsParams,
} from '../../utils/physicsConstants.js';

describe('physicsConstants', () => {
    it('exports expected default values', () => {
        expect(DEFAULT_CRR).toBe(0.004);
        expect(DEFAULT_CDA).toBe(0.32);
        expect(DEFAULT_GRAVITY).toBe(9.81);
        expect(DEFAULT_AIR_DENSITY).toBe(1.225);
        expect(DEFAULT_DRIVETRAIN_EFFICIENCY).toBe(0.975);
        expect(DEFAULT_DRIVETRAIN_LOSS_FRACTION).toBeCloseTo(0.025, 5);
    });

    it('mergePhysicsSettings fills missing keys from defaults', () => {
        expect(mergePhysicsSettings(null)).toEqual(DEFAULT_PHYSICS_SETTINGS);
        expect(mergePhysicsSettings({ cda: 0.3 })).toEqual({
            ...DEFAULT_PHYSICS_SETTINGS,
            cda: 0.3,
        });
    });

    it('mergePhysicsSettings rejects invalid numbers', () => {
        expect(mergePhysicsSettings({ crr: -1, cda: 0, drivetrainLossFraction: 2 }).crr).toBe(DEFAULT_CRR);
    });

    it('resolvePhysicsParams reads userSettings.physics', () => {
        const params = resolvePhysicsParams({ physics: { crr: 0.005 } });
        expect(params.crr).toBe(0.005);
        expect(params.cda).toBe(DEFAULT_CDA);
    });
});
