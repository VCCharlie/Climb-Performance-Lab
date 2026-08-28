import { describe, it, expect } from 'vitest';
import { buildWeeklyTssBudgetSummary } from '../../utils/weeklyTssBudget';

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
});
