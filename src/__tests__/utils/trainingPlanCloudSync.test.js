import { describe, it, expect } from 'vitest';
import {
    resolveTrainingPlanOnSync,
    shouldApplyRemoteTrainingPlan,
    shouldPushLocalTrainingPlan,
    TRAINING_PLAN_LOCAL_GRACE_MS,
} from '../../utils/trainingPlanCloudSync';

const sampleSnapshot = {
    version: 1,
    updatedAt: '2026-08-03T10:00:00.000Z',
    goalDate: '2026-09-15',
    eventName: 'Gran Fondo',
    weeks: [{ weekNum: 1, targetTss: 220, phaseKey: 'base', phaseLabel: 'Base' }],
    currentWeekTargetTss: 220,
    currentPhaseKey: 'base',
    currentPhaseLabel: 'Base',
};

describe('trainingPlanCloudSync', () => {
    it('prefers cloud when local is empty', () => {
        const result = resolveTrainingPlanOnSync(null, null, sampleSnapshot, sampleSnapshot.updatedAt);
        expect(result.source).toBe('cloud');
        expect(result.snapshot?.eventName).toBe('Gran Fondo');
    });

    it('prefers newer local snapshot', () => {
        const local = {
            ...sampleSnapshot,
            eventName: 'Local event',
            updatedAt: '2026-08-03T12:00:00.000Z',
        };
        const cloud = {
            ...sampleSnapshot,
            eventName: 'Cloud event',
            updatedAt: '2026-08-03T10:00:00.000Z',
        };
        const result = resolveTrainingPlanOnSync(local, null, cloud, cloud.updatedAt);
        expect(result.source).toBe('local');
        expect(result.snapshot?.eventName).toBe('Local event');
    });

    it('applies cloud clear when cloudUpdatedAt is newer', () => {
        const local = {
            ...sampleSnapshot,
            updatedAt: '2026-08-03T08:00:00.000Z',
        };
        const result = resolveTrainingPlanOnSync(
            local,
            null,
            null,
            '2026-08-03T12:00:00.000Z',
        );
        expect(result.source).toBe('cloud');
        expect(result.snapshot).toBeNull();
    });

    it('shouldApplyRemoteTrainingPlan respects local grace window', () => {
        const now = Date.parse('2026-08-03T12:00:00.000Z');
        const local = {
            ...sampleSnapshot,
            updatedAt: '2026-08-03T11:59:58.500Z',
        };
        const remote = {
            snapshot: { ...sampleSnapshot, eventName: 'Cloud event', updatedAt: '2026-08-03T12:00:00.000Z' },
            updatedAt: '2026-08-03T12:00:00.000Z',
        };
        expect(shouldApplyRemoteTrainingPlan(local, null, remote, now)).toBe(false);
        expect(now - Date.parse(local.updatedAt)).toBeLessThan(TRAINING_PLAN_LOCAL_GRACE_MS);
    });

    it('shouldPushLocalTrainingPlan allows push when local clear is newer than cloud snapshot', () => {
        const remote = {
            snapshot: sampleSnapshot,
            updatedAt: sampleSnapshot.updatedAt,
        };
        expect(
            shouldPushLocalTrainingPlan(null, '2026-08-03T12:00:00.000Z', remote),
        ).toBe(true);
    });

    it('shouldPushLocalTrainingPlan blocks stale local from overwriting newer cloud', () => {
        const local = {
            ...sampleSnapshot,
            eventName: 'Stale local',
            updatedAt: '2026-08-03T08:00:00.000Z',
        };
        const remote = {
            snapshot: { ...sampleSnapshot, eventName: 'Cloud wins' },
            updatedAt: '2026-08-03T10:00:00.000Z',
        };
        expect(shouldPushLocalTrainingPlan(local, null, remote)).toBe(false);
    });
});
