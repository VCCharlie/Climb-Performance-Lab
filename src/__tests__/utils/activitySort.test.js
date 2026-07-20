import { describe, it, expect } from 'vitest';
import { compareActivitiesForSort } from '../../utils/activitySort';

function sortActs(acts, key, direction = 'desc') {
    return [...acts].sort((a, b) => compareActivitiesForSort(a, b, { key, direction }));
}

describe('compareActivitiesForSort', () => {
    it('sorts distance numerically when values mix strings and numbers', () => {
        const acts = [
            { id: '1', distance: '80.8' },
            { id: '2', distance: '73.4' },
            { id: '3', distance: 150.2 },
            { id: '4', distance: 145.6 },
            { id: '5', distance: '130.30' },
        ];

        const sorted = sortActs(acts, 'distance', 'desc');
        expect(sorted.map((a) => a.id)).toEqual(['3', '4', '5', '1', '2']);
    });

    it('sorts distance ascending with mixed types', () => {
        const acts = [
            { id: '1', distance: '80.8' },
            { id: '2', distance: 150.2 },
        ];
        const sorted = sortActs(acts, 'distance', 'asc');
        expect(sorted.map((a) => a.id)).toEqual(['1', '2']);
    });

    it('sorts moving_time from HH:MM:SS strings and second counts', () => {
        const acts = [
            { id: 'short', moving_time: '1:00:00' },
            { id: 'long', moving_time: 9000 },
            { id: 'mid', moving_time: '2:00:00' },
        ];
        const sorted = sortActs(acts, 'moving_time', 'desc');
        expect(sorted.map((a) => a.id)).toEqual(['long', 'mid', 'short']);
    });

    it('sorts date strings lexicographically', () => {
        const acts = [
            { id: 'a', date: '2020-01-01' },
            { id: 'b', date: '2026-03-22' },
            { id: 'c', date: '2015-07-10' },
        ];
        const sorted = sortActs(acts, 'date', 'desc');
        expect(sorted.map((a) => a.id)).toEqual(['b', 'a', 'c']);
    });
});
