import { describe, it, expect } from 'vitest';
import { computeCtlWeekOverWeekDelta } from '../../utils/coach/coachWeekCtlDelta';

describe('computeCtlWeekOverWeekDelta', () => {
    it('returns null without activities', () => {
        expect(computeCtlWeekOverWeekDelta([], '2026-08-03')).toBeNull();
    });

    it('computes delta when load history spans two weeks', () => {
        const activities = [];
        for (let i = 0; i < 21; i += 1) {
            const day = String(i + 1).padStart(2, '0');
            activities.push({
                id: `a${i}`,
                date: `2026-07-${day}`,
                load: 80,
            });
        }
        for (let i = 0; i < 7; i += 1) {
            const day = String(i + 1).padStart(2, '0');
            activities.push({
                id: `b${i}`,
                date: `2026-08-${day}`,
                load: 100,
            });
        }

        const result = computeCtlWeekOverWeekDelta(activities, '2026-08-03', '2026-08-07');
        expect(result).not.toBeNull();
        expect(result.ctlEnd).toBeGreaterThan(0);
        expect(result.delta).toBeGreaterThan(0);
    });
});
