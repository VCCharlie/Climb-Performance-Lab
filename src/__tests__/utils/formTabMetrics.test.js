import { describe, it, expect } from 'vitest';
import {
    calculateFitnessMetrics,
    getFitnessAtDate,
    buildFitnessSeriesForRange,
} from '../../utils/formTabMetrics';

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

    it('extends through endYmd with 0 TSS rest days so ATL decays', () => {
        const acts = [
            { date: '2026-08-10', load: 150 },
            { date: '2026-08-12', load: 140 },
        ];
        const stoppedAtLastRide = calculateFitnessMetrics(acts);
        const throughToday = calculateFitnessMetrics(acts, { endYmd: '2026-08-14' });

        expect(stoppedAtLastRide[stoppedAtLastRide.length - 1].date).toBe('2026-08-12');
        expect(throughToday[throughToday.length - 1].date).toBe('2026-08-14');
        expect(throughToday[throughToday.length - 1].atl).toBeLessThan(
            stoppedAtLastRide[stoppedAtLastRide.length - 1].atl,
        );
        expect(throughToday[throughToday.length - 1].tsb).toBeGreaterThan(
            stoppedAtLastRide[stoppedAtLastRide.length - 1].tsb,
        );
    });
});

describe('getFitnessAtDate / buildFitnessSeriesForRange', () => {
    it('aligns Recovery current TSB with Coach forecast TSB for the same as-of date', () => {
        const acts = [
            { date: '2026-07-01', load: 80 },
            { date: '2026-07-08', load: 120 },
            { date: '2026-07-15', load: 100 },
            { date: '2026-08-01', load: 150 },
            { date: '2026-08-05', load: 130 },
            { date: '2026-08-10', load: 140 },
        ];
        const asOfYmd = '2026-08-14';

        const coachStyle = getFitnessAtDate(acts, asOfYmd);
        const { current: recoveryStyle } = buildFitnessSeriesForRange(acts, {
            displayStartYmd: '2026-05-15',
            displayEndYmd: asOfYmd,
            asOfYmd,
        });

        expect(coachStyle?.tsb).toBe(recoveryStyle?.tsb);
        expect(coachStyle?.ctl).toBe(recoveryStyle?.ctl);
        expect(coachStyle?.atl).toBe(recoveryStyle?.atl);
    });

    it('limits day-loop to display window plus CTL warmup while keeping as-of metrics', () => {
        const acts = [];
        for (let i = 1; i <= 28; i += 1) {
            const day = String(i).padStart(2, '0');
            acts.push({ date: `2018-01-${day}`, load: 50 });
        }
        acts.push({ date: '2026-08-10', load: 150 });

        const bounded = buildFitnessSeriesForRange(acts, {
            displayStartYmd: '2026-08-01',
            displayEndYmd: '2026-08-14',
            asOfYmd: '2026-08-14',
        });
        const fullHistory = buildFitnessSeriesForRange(acts, {
            displayStartYmd: '2018-01-01',
            displayEndYmd: '2026-08-14',
            asOfYmd: '2026-08-14',
        });

        expect(bounded.chartData.length).toBeLessThan(fullHistory.chartData.length);
        expect(bounded.current?.tsb).toBe(fullHistory.current?.tsb);
    });
});
