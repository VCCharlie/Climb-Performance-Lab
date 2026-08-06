import { describe, it, expect } from 'vitest';
import { resolveCoachWeekOnSync, shouldApplyRemoteCoachWeek } from '../../utils/coach/coachWeekCloudSync';

describe('coachWeekCloudSync', () => {
    const weekKey = '2026-W32';

    it('prefers cloud when local is empty for current week', () => {
        const cloud = {
            weekKey,
            unavailableDates: ['2026-08-05'],
            completedDates: [],
            overrides: {},
            moves: {},
            updatedAt: '2026-08-03T10:00:00.000Z',
        };
        const result = resolveCoachWeekOnSync(null, cloud, weekKey);
        expect(result.source).toBe('cloud');
        expect(result.state.unavailableDates).toEqual(['2026-08-05']);
    });

    it('prefers newer timestamp when both sides have data', () => {
        const local = {
            weekKey,
            unavailableDates: ['2026-08-06'],
            completedDates: [],
            overrides: {},
            moves: {},
            updatedAt: '2026-08-03T12:00:00.000Z',
        };
        const cloud = {
            weekKey,
            unavailableDates: ['2026-08-05'],
            completedDates: [],
            overrides: {},
            moves: {},
            updatedAt: '2026-08-03T10:00:00.000Z',
        };
        const result = resolveCoachWeekOnSync(local, cloud, weekKey);
        expect(result.source).toBe('local');
        expect(result.state.unavailableDates).toEqual(['2026-08-06']);
    });

    it('ignores cloud data from another week', () => {
        const cloud = {
            weekKey: '2026-W20',
            unavailableDates: ['2026-05-14'],
            updatedAt: '2026-05-12T10:00:00.000Z',
        };
        const result = resolveCoachWeekOnSync(null, cloud, weekKey);
        expect(result.state.unavailableDates).toEqual([]);
    });

    it('shouldApplyRemoteCoachWeek respects local grace window', () => {
        const now = Date.parse('2026-08-03T12:00:00.000Z');
        const local = {
            weekKey,
            unavailableDates: ['2026-08-06'],
            updatedAt: '2026-08-03T11:59:58.500Z',
        };
        const cloud = {
            weekKey,
            unavailableDates: ['2026-08-05'],
            updatedAt: '2026-08-03T12:00:00.000Z',
        };
        expect(shouldApplyRemoteCoachWeek(local, cloud, weekKey, now)).toBe(false);
    });
});
