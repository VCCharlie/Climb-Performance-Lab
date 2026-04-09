import { describe, it, expect } from 'vitest';
import {
    getDashboardWindowBounds,
    filterActivitiesInBounds,
    previousWindowBounds,
    compareDaysBeforeWindow,
} from '../../utils/dashboardActivityWindow';

describe('getDashboardWindowBounds', () => {
    it('returns 1M window ending on reference date', () => {
        const ref = new Date('2026-06-15T12:00:00Z');
        const b = getDashboardWindowBounds('1M', '', '', ref);
        expect(b).not.toBeNull();
        expect(b.end.getFullYear()).toBe(2026);
        expect(b.end.getMonth()).toBe(5);
        expect(b.end.getDate()).toBe(15);
        expect(b.start.getFullYear()).toBe(2026);
        expect(b.start.getMonth()).toBe(4);
        expect(b.start.getDate()).toBe(15);
    });
});

describe('filterActivitiesInBounds', () => {
    it('includes only activities in range', () => {
        const acts = [
            { date: '2026-01-01', id: 1 },
            { date: '2026-06-01', id: 2 },
            { date: '2027-01-01', id: 3 },
        ];
        const bounds = {
            start: new Date('2026-05-01'),
            end: new Date('2026-12-31T23:59:59.999'),
        };
        const f = filterActivitiesInBounds(acts, bounds);
        expect(f.map((a) => a.id)).toEqual([2]);
    });
});

describe('previousWindowBounds', () => {
    it('shifts window back by same length', () => {
        const bounds = {
            start: new Date('2026-06-01'),
            end: new Date('2026-06-30T23:59:59.999'),
        };
        const prev = previousWindowBounds(bounds);
        expect(prev).not.toBeNull();
        const len = bounds.end.getTime() - bounds.start.getTime();
        expect(prev.end.getTime() - prev.start.getTime()).toBe(len);
        expect(prev.end.getTime()).toBeLessThan(bounds.start.getTime());
    });
});

describe('compareDaysBeforeWindow', () => {
    it('covers N calendar days before start', () => {
        const bounds = {
            start: new Date('2026-06-10T00:00:00'),
            end: new Date('2026-06-15T23:59:59.999'),
        };
        const prev = compareDaysBeforeWindow(bounds, 3);
        expect(prev.start.getDate()).toBe(7);
        expect(prev.end.getDate()).toBe(9);
    });
});
