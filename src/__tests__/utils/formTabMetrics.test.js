import { describe, it, expect } from 'vitest';
import { calculateFitnessMetrics } from '../../utils/formTabMetrics';

describe('calculateFitnessMetrics', () => {
    it('computes CTL/ATL/TSB across rest days with YMD iteration', () => {
        const acts = [
            { date: '2026-01-01', load: 100 },
            { date: '2026-01-03', load: 50 },
        ];
        const rows = calculateFitnessMetrics(acts);
        expect(rows.length).toBe(3);
        expect(rows[0].date).toBe('2026-01-01');
        expect(rows[1].date).toBe('2026-01-02');
        expect(rows[1].ctl).toBeLessThan(rows[0].ctl);
        expect(rows[2].date).toBe('2026-01-03');
    });

    it('returns empty array when no TSS', () => {
        expect(calculateFitnessMetrics([{ date: '2026-01-01', load: 0 }])).toEqual([]);
    });
});
