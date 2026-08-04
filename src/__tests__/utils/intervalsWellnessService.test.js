import { describe, it, expect } from 'vitest';
import {
    normalizeIntervalsWellnessRow,
    normalizeIntervalsWellnessRows,
} from '../../services/intervalsWellnessService';
import {
    buildFitnessHistoryForCoach,
    mergeIntervalsFitnessSnapshot,
} from '../../utils/coach/coachFitnessHistory';

describe('intervalsWellnessService', () => {
    it('normalizeIntervalsWellnessRow maps ctl/atl and computes tsb', () => {
        const row = normalizeIntervalsWellnessRow({
            id: '2026-08-01',
            ctl: 55.4,
            atl: 62.1,
            rampRate: 4.2,
            restingHR: 48,
        });
        expect(row.date).toBe('2026-08-01');
        expect(row.ctl).toBe(55.4);
        expect(row.atl).toBe(62.1);
        expect(row.tsb).toBe(-6.7);
        expect(row.rampRate).toBe(4.2);
        expect(row.restingHR).toBe(48);
    });

    it('normalizeIntervalsWellnessRows sorts by date', () => {
        const rows = normalizeIntervalsWellnessRows([
            { id: '2026-08-03', ctl: 50, atl: 55 },
            { id: '2026-08-01', ctl: 48, atl: 54 },
        ]);
        expect(rows[0].date).toBe('2026-08-01');
        expect(rows[1].date).toBe('2026-08-03');
    });
});

describe('coachFitnessHistory', () => {
    const series = [
        { date: '2026-07-01', ctl: 40, atl: 45, tsb: -5 },
        { date: '2026-07-02', ctl: 41, atl: 44, tsb: -3 },
        { date: '2026-07-03', ctl: 42, atl: 43, tsb: -1 },
        { date: '2026-07-04', ctl: 43, atl: 42, tsb: 1 },
        { date: '2026-07-05', ctl: 44, atl: 41, tsb: 3 },
    ];

    it('buildFitnessHistoryForCoach returns compact history', () => {
        const history = buildFitnessHistoryForCoach(series, { source: 'local', endYmd: '2026-07-05' });
        expect(history.source).toBe('local');
        expect(history.dailyLast14d).toHaveLength(5);
        expect(history.weeklyLast26w.length).toBeGreaterThan(0);
        expect(history.summary90d.negativeTsbDays).toBe(3);
    });

    it('mergeIntervalsFitnessSnapshot prefers intervals latest row', () => {
        const merged = mergeIntervalsFitnessSnapshot(
            { ctl: 40, atl: 50, tsb: -10, asOfDate: '2026-07-01' },
            [{ date: '2026-08-01', ctl: 55, atl: 60, tsb: -5 }],
        );
        expect(merged.ctl).toBe(55);
        expect(merged.source).toBe('intervals.icu');
        expect(merged.asOfDate).toBe('2026-08-01');
    });
});
