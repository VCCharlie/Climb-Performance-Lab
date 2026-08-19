import { describe, it, expect } from 'vitest';
import {
    getRideDriftProfile,
    isEligibleThresholdDriftRide,
    isEligibleRaceDriftRide,
    buildDriftPatch,
    extractDriftPatch,
    driftColumnAppliesToRide,
    describeRideDriftEligibility,
    DRIFT_PROFILE,
} from '../../utils/coach/rideDurability';

const steadyBase = {
    type: 'Ride',
    moving_time: 5400,
    norm_power: 180,
    avg_power: 175,
    avg_hr: 135,
};

describe('rideDurability', () => {
    it('prefers steady profile over threshold when IF is in Z2 band', () => {
        expect(getRideDriftProfile(steadyBase, 250)).toBe(DRIFT_PROFILE.STEADY);
    });

    it('classifies threshold tempo rides', () => {
        const threshold = {
            ...steadyBase,
            norm_power: 220,
            avg_power: 210,
            avg_hr: 155,
        };
        expect(isEligibleThresholdDriftRide(threshold, 250)).toBe(true);
        expect(getRideDriftProfile(threshold, 250)).toBe(DRIFT_PROFILE.THRESHOLD);
    });

    it('classifies variable race-style rides', () => {
        const race = {
            ...steadyBase,
            norm_power: 255,
            avg_power: 190,
            avg_hr: 165,
        };
        expect(isEligibleRaceDriftRide(race, 250)).toBe(true);
        expect(getRideDriftProfile(race, 250)).toBe(DRIFT_PROFILE.RACE);
    });

    it('buildDriftPatch maps threshold fields', () => {
        const patch = buildDriftPatch({
            decouplingPct: 7.2,
            efFirst: 1.4,
            efSecond: 1.3,
            status: 'moderate',
        }, DRIFT_PROFILE.THRESHOLD, 'strava');
        expect(patch?.threshold_drift_pct).toBe(7.2);
        expect(patch?.threshold_drift_source).toBe('strava');
    });

    it('classifies hard group rides with IF ~0.87 and VI ~1.28 as threshold', () => {
        const orientExpress = {
            type: 'Ride',
            moving_time: 9244,
            norm_power: 243,
            avg_power: 190,
            avg_hr: 132,
        };
        expect(getRideDriftProfile(orientExpress, 280)).toBe(DRIFT_PROFILE.THRESHOLD);
        expect(driftColumnAppliesToRide('threshold_drift_pct', orientExpress, 280)).toBe(true);
        expect(driftColumnAppliesToRide('decoupling_pct', orientExpress, 280)).toBe(false);
    });

    it('describeRideDriftEligibility explains pending threshold rides', () => {
        const ride = {
            type: 'Ride',
            moving_time: 9244,
            norm_power: 243,
            avg_power: 190,
            avg_hr: 132,
        };
        const info = describeRideDriftEligibility(ride, 280);
        expect(info.status).toBe('pending');
        expect(info.profile).toBe(DRIFT_PROFILE.THRESHOLD);
    });

    it('extractDriftPatch returns first available profile patch', () => {
        expect(extractDriftPatch({
            threshold_drift_pct: 5.5,
            threshold_drift_source: 'intervals',
        })?.threshold_drift_pct).toBe(5.5);
    });
});
