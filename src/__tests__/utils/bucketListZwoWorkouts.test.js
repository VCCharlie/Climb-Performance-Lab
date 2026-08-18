import { describe, it, expect } from 'vitest';
import {
    estimateClimbEffortSeconds,
    buildClimbPrepZwoWorkout,
    listBucketListPrepWorkouts,
    countBucketListPrepWorkouts,
} from '../../utils/bucketListZwoWorkouts';

const alpe = {
    id: 'alpe',
    name: 'Alpe du Zwift',
    lengthKm: 12.2,
    elevation: 1035,
    avgGrade: 8.5,
    country: 'ZWIFT',
};

describe('bucketListZwoWorkouts', () => {
    it('estimateClimbEffortSeconds uses elevation and grade', () => {
        const sec = estimateClimbEffortSeconds(alpe);
        expect(sec).toBeGreaterThan(2400);
        expect(sec).toBeLessThan(5000);
    });

    it('buildClimbPrepZwoWorkout returns hill-repeat structure', () => {
        const workout = buildClimbPrepZwoWorkout(alpe);
        expect(workout.title).toContain('Alpe du Zwift');
        expect(workout.zwoSteps.length).toBeGreaterThanOrEqual(3);
        const intervals = workout.zwoSteps.find((s) => s.type === 'IntervalsT');
        expect(intervals).toBeTruthy();
        expect(intervals.repeat).toBeGreaterThanOrEqual(2);
        expect(intervals.onPower).toBeGreaterThanOrEqual(0.82);
    });

    it('listBucketListPrepWorkouts filters by planned/want status', () => {
        const climbs = [alpe, { id: 'x', name: 'Other', lengthKm: 5, elevation: 300, avgGrade: 6 }];
        const status = { alpe: 'planned', x: 'done' };
        const workouts = listBucketListPrepWorkouts(climbs, status);
        expect(workouts.length).toBe(1);
        expect(workouts[0].climbId).toBe('alpe');
        expect(countBucketListPrepWorkouts(climbs, status)).toBe(1);
    });
});
