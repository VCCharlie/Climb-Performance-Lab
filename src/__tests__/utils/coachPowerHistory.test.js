import { describe, it, expect } from 'vitest';
import {
    buildCoachPowerHistory,
    compareFtpYearsAgo,
    parseYearsAgoFromQuestion,
} from '../../utils/coach/coachPowerHistory';

const activities = [
    { date: '2021-06-01', type: 'Ride', best_20min: 240 },
    { date: '2021-08-01', type: 'Ride', best_20min: 250 },
    { date: '2026-07-01', type: 'Ride', best_20min: 270 },
];

describe('coachPowerHistory', () => {
    it('buildCoachPowerHistory aggregates yearly peaks', () => {
        const history = buildCoachPowerHistory(activities, { weight: 75 }, 260);
        expect(history.yearlyPeaks.length).toBe(2);
        expect(history.yearlyPeaks.find((r) => r.year === 2021)?.eftp20).toBe(238);
        expect(history.yearlyPeaks.find((r) => r.year === 2026)?.eftp20).toBe(257);
    });

    it('parseYearsAgoFromQuestion extracts duration', () => {
        expect(parseYearsAgoFromQuestion('How is my FTP compared to 5 years ago?')).toBe(5);
        expect(parseYearsAgoFromQuestion('FTP ten years ago')).toBe(10);
    });

    it('compareFtpYearsAgo reports delta when data exists', () => {
        const history = buildCoachPowerHistory(activities, {}, 260);
        const result = compareFtpYearsAgo(history, 5, 260);
        expect(result.ok).toBe(true);
        expect(result.eftpThen).toBe(238);
        expect(result.delta).toBeGreaterThan(0);
    });

    it('compareFtpYearsAgo explains missing years', () => {
        const history = buildCoachPowerHistory(activities, {}, 260);
        const result = compareFtpYearsAgo(history, 10, 260);
        expect(result.ok).toBe(false);
        expect(result.message).toMatch(/don't have power data/i);
    });
});
