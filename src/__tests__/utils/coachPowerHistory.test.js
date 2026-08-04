import { describe, it, expect } from 'vitest';
import {
    buildCoachPowerHistory,
    buildTopPowerEffortsByYear,
    compareFtpYearsAgo,
    formatTopPowerEffortsAnswer,
    parseYearsAgoFromQuestion,
} from '../../utils/coach/coachPowerHistory';

const activities = [
    { date: '2021-06-01', type: 'Ride', best_20min: 240 },
    { date: '2021-08-01', type: 'Ride', best_20min: 250 },
    { date: '2026-07-01', type: 'Ride', best_20min: 270 },
];

const activitiesWith60 = [
    { id: 'a', date: '2024-03-01', type: 'Ride', title: 'Spring ride', best_60min: 285 },
    { id: 'b', date: '2024-06-15', type: 'Ride', title: 'Long Z2', best_60min: 301 },
    { id: 'c', date: '2024-09-01', type: 'Ride', title: 'Endurance', best_60min: 295 },
    { id: 'd', date: '2024-11-01', type: 'Ride', title: 'Base', best_60min: 290 },
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

    it('buildTopPowerEffortsByYear ranks per-ride bests within a year', () => {
        const top = buildTopPowerEffortsByYear(activitiesWith60, 280, 'best_60min', 10);
        expect(top.byYear[2024].map((r) => r.watts)).toEqual([301, 295, 290, 285]);
        expect(top.byYear[2024][0].title).toBe('Long Z2');
    });

    it('buildCoachPowerHistory includes top60minByYear for coach Q&A', () => {
        const history = buildCoachPowerHistory(activitiesWith60, {}, 280);
        expect(history.top60minByYear[2024]).toHaveLength(4);
        expect(history.yearsWithTop60min).toEqual([2024]);
    });

    it('formatTopPowerEffortsAnswer lists ranked efforts', () => {
        const history = buildCoachPowerHistory(activitiesWith60, {}, 280);
        const answer = formatTopPowerEffortsAnswer(history, 2024, 'best_60min', 3);
        expect(answer).toMatch(/301W/);
        expect(answer).toMatch(/Top 3 60-minute efforts in 2024/);
    });
});
