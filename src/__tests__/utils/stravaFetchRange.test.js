import { describe, it, expect } from 'vitest';
import {
    parseLocalYmd,
    formatLocalYmd,
    stravaListTimestampsForYmdRange,
    adjacentLocalDateKeys,
} from '../../utils/stravaFetchRange';

describe('stravaFetchRange', () => {
    it('parseLocalYmd uses local calendar date (not UTC midnight shift)', () => {
        const d = parseLocalYmd('2025-04-13');
        expect(d.getFullYear()).toBe(2025);
        expect(d.getMonth()).toBe(3);
        expect(d.getDate()).toBe(13);
        expect(d.getHours()).toBe(0);
    });

    it('stravaListTimestampsForYmdRange expands single day with ±1 day buffer', () => {
        const { afterTs, beforeTs } = stravaListTimestampsForYmdRange('2025-04-13', '2025-04-13');
        const start = parseLocalYmd('2025-04-12');
        const end = parseLocalYmd('2025-04-15');
        expect(afterTs).toBe(Math.floor(start.getTime() / 1000));
        expect(beforeTs).toBe(Math.floor(end.getTime() / 1000));
    });

    it('adjacentLocalDateKeys returns previous, same, and next day', () => {
        expect(adjacentLocalDateKeys('2025-04-13')).toEqual([
            '2025-04-12',
            '2025-04-13',
            '2025-04-14',
        ]);
    });

    it('formatLocalYmd round-trips parseLocalYmd', () => {
        const d = parseLocalYmd('2025-04-13');
        expect(formatLocalYmd(d)).toBe('2025-04-13');
    });
});
