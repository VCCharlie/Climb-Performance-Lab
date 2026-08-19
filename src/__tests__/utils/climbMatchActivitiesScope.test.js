import { describe, it, expect } from 'vitest';
import { selectActivitiesForClimbMatch } from '../../utils/climbMatchActivitiesScope';

const acts = [
    { id: 'a1', title: 'Ride A' },
    { id: 'a2', title: 'Ride B' },
    { id: 'a3', title: 'Ride C' },
];

describe('selectActivitiesForClimbMatch', () => {
    it('returns all log rows when not grouped', () => {
        const result = selectActivitiesForClimbMatch(
            acts,
            false,
            null,
            { direction: 'desc' },
            () => true,
            () => true,
        );
        expect(result.map((a) => a.id)).toEqual(['a1', 'a2', 'a3']);
    });

    it('returns only expanded year/month rows when grouped', () => {
        const grouped = {
            '2026': {
                March: [{ id: 'a1', title: 'Ride A' }],
                April: [{ id: 'a2', title: 'Ride B' }],
            },
            '2025': {
                January: [{ id: 'a3', title: 'Ride C' }],
            },
        };

        const result = selectActivitiesForClimbMatch(
            acts,
            true,
            grouped,
            { direction: 'desc' },
            (year) => year === '2026',
            (year, month) => year === '2026' && month === 'March',
        );

        expect(result.map((a) => a.id)).toEqual(['a1']);
    });

    it('returns empty when grouped but nothing expanded', () => {
        const grouped = {
            '2026': { March: [{ id: 'a1' }] },
        };

        const result = selectActivitiesForClimbMatch(
            acts,
            true,
            grouped,
            { direction: 'desc' },
            () => false,
            () => false,
        );

        expect(result).toEqual([]);
    });
});
