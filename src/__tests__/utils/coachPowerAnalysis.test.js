import { describe, it, expect } from 'vitest';
import { splitCoachAnswerLead, stripMarkdownBold } from '../../utils/coach/coachAnswerFormat';
import {
    buildMultiYearPowerAnalysis,
    buildPowerYearlyAnalysis,
    flagAnomalousEfforts,
    formatMultiYearPowerAnalysisReport,
    matchesMultiYearPowerAnalysisQuestion,
} from '../../utils/coach/coachPowerAnalysis';

describe('coachAnswerFormat', () => {
    it('splits first sentence as lead', () => {
        const { lead, body } = splitCoachAnswerLead('Hello world. More text here.\n\nSecond paragraph.');
        expect(lead).toBe('Hello world.');
        expect(body).toContain('More text here.');
        expect(body).toContain('Second paragraph.');
    });

    it('strips markdown bold markers', () => {
        expect(stripMarkdownBold('**Bold** text')).toBe('Bold text');
    });
});

describe('coachPowerAnalysis', () => {
    const activities = [];
    for (let i = 0; i < 10; i += 1) {
        activities.push({
            id: `2024-${i}`,
            date: `2024-${String(i + 1).padStart(2, '0')}-15`,
            type: 'Ride',
            best_60min: 280 + i,
        });
    }
    activities.push({
        id: '2018-peak',
        date: '2018-06-01',
        type: 'Ride',
        best_60min: 301,
    });

    it('matches multi-year top-10 analysis questions', () => {
        const q = 'top 10 highest 60-minute FTP values for each of the past 10 years';
        expect(matchesMultiYearPowerAnalysisQuestion(q)).toBe(true);
    });

    it('buildMultiYearPowerAnalysis computes yearly averages', () => {
        const analysis = buildMultiYearPowerAnalysis(activities, 280, {
            field: 'best_60min',
            limit: 10,
            yearSpan: 10,
            endYear: 2026,
        });
        const y2024 = analysis.yearly.find((r) => r.year === 2024);
        expect(y2024?.avg).toBeGreaterThan(280);
        expect(analysis.trend.length).toBeGreaterThan(0);
    });

    it('formatMultiYearPowerAnalysisReport includes table rows', () => {
        const analysis = buildMultiYearPowerAnalysis(activities, 280, { yearSpan: 10, endYear: 2026 });
        const report = formatMultiYearPowerAnalysisReport(analysis);
        expect(report).toMatch(/2024/);
        expect(report).toMatch(/Trend/);
    });

    it('flagAnomalousEfforts marks high outliers', () => {
        const efforts = [
            { watts: 270 }, { watts: 268 }, { watts: 267 }, { watts: 266 },
            { watts: 265 }, { watts: 264 }, { watts: 263 }, { watts: 262 },
            { watts: 261 }, { watts: 320 },
        ];
        const flagged = flagAnomalousEfforts(efforts);
        expect(flagged.find((r) => r.watts === 320)?.anomaly).toBe(true);
    });

    it('buildPowerYearlyAnalysis separates avg from trailing trend', () => {
        const rides = [];
        for (let y = 2022; y <= 2026; y += 1) {
            for (let i = 0; i < 5; i += 1) {
                rides.push({
                    date: `${y}-0${i + 1}-10`,
                    type: 'Ride',
                    best_60min: 250 + (y - 2022) * 5 + i,
                });
            }
        }
        const analysis = buildPowerYearlyAnalysis(rides, { field: 'best_60min', topN: 5, years: 5, trendWindow: 3 });
        const y2024 = analysis.yearly.find((r) => r.year === 2024);
        expect(y2024?.avg).toBeTruthy();
        expect(y2024?.trend).toBeTruthy();
        expect(y2024.trend).not.toBe(y2024.avg);
    });

    it('buildPowerYearlyAnalysis respects manual exclusions', () => {
        const rides = [
            { date: '2026-01-01', type: 'Ride', best_60min: 400, title: 'Outlier' },
            { date: '2026-02-01', type: 'Ride', best_60min: 280 },
            { date: '2026-03-01', type: 'Ride', best_60min: 275 },
        ];
        const key = '2026-01-01:best_60min:400';
        const withExclusion = buildPowerYearlyAnalysis(rides, {
            field: 'best_60min',
            topN: 3,
            years: 2,
            excludedKeys: new Set([key]),
            autoDetectAnomalies: false,
        });
        const y2026 = withExclusion.yearly.find((r) => r.year === 2026);
        expect(y2026?.avg).toBeLessThan(400);
    });
});
