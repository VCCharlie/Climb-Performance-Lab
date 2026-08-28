import { describe, it, expect } from 'vitest';
import { buildWeeklyTssBudgetSummary } from '../../utils/weeklyTssBudget';
import { isoWeekKey } from '../../utils/coach/coachWeekState';

describe('weeklyTssBudget', () => {
    it('computes remaining TSS for the calendar week', () => {
        const summary = buildWeeklyTssBudgetSummary({
            activities: [
                { id: '1', date: '2026-08-26', load: 80 },
                { id: '2', date: '2026-08-27', load: 60 },
            ],
            userSettings: { weeklyHoursTarget: 5 },
            referenceYmd: '2026-08-28',
        });
        expect(summary.actualTss).toBe(140);
        expect(summary.targetTss).toBeGreaterThan(0);
        expect(summary.remainingTss).toBe(Math.max(0, summary.targetTss - 140));
    });

    it('uses manual override with highest priority', () => {
        const referenceYmd = '2026-08-28';
        const weekKey = isoWeekKey(referenceYmd);

        const summary = buildWeeklyTssBudgetSummary({
            activities: [{ id: '1', date: '2026-08-26', load: 100 }],
            userSettings: {
                weeklyHoursTarget: 5,
                weeklyTssOverrides: { [weekKey]: 320 },
            },
            referenceYmd,
        });

        expect(summary.weekKey).toBe(weekKey);
        expect(summary.targetSource).toBe('manual');
        expect(summary.targetTss).toBe(320);
        expect(summary.remainingTss).toBe(220);
    });

    it('exposes ISO week key on the summary', () => {
        const referenceYmd = '2026-08-28';
        const summary = buildWeeklyTssBudgetSummary({
            activities: [],
            userSettings: { weeklyHoursTarget: 6 },
            referenceYmd,
        });

        expect(summary.weekKey).toBe(isoWeekKey(referenceYmd));
    });
});
