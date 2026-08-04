import { describe, it, expect } from 'vitest';
import { answerCoachQuestion, COACH_QUICK_QUESTIONS } from '../../utils/coach/coachQaEngine';

const activities = [
    { id: '1', date: '2026-07-28', moving_time: 3600, load: 70, norm_power: 175, avg_power: 165, type: 'Ride' },
    { id: '2', date: '2026-07-31', moving_time: 4200, load: 90, norm_power: 225, avg_power: 210, type: 'Ride', best_20min: 230 },
];

describe('coachQaEngine', () => {
    it('exposes quick questions', () => {
        expect(COACH_QUICK_QUESTIONS.length).toBeGreaterThan(5);
    });

    it('answers form question with TSB', () => {
        const result = answerCoachQuestion('How is my form today?', activities, { ftp: 250 });
        expect(result.title).toContain('form');
        expect(result.answer).toMatch(/TSB/i);
    });

    it('answers period analysis question', () => {
        const result = answerCoachQuestion('Analyze my training over the last 4 weeks', activities, { ftp: 250 });
        expect(result.title).toMatch(/4-week/i);
        expect(result.answer.length).toBeGreaterThan(50);
    });

    it('answers rate today ride question using activity log', () => {
        const today = new Date();
        const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const todayActivities = [
            ...activities,
            { id: '3', date: ymd, moving_time: 3600, load: 42, norm_power: 170, type: 'Ride', title: 'Easy spin' },
        ];
        const result = answerCoachQuestion(
            "Rate my today's easy ride in view of the plan I'm following",
            todayActivities,
            { ftp: 250, weeklyHoursTarget: 5 },
        );
        expect(result.title).toMatch(/today/i);
        expect(result.answer).toMatch(/Easy spin|Verdict/i);
        expect(result.answer).not.toMatch(/quick question/i);
    });

    it('answers historical FTP comparison', () => {
        const historicalActivities = [
            { id: '1', date: '2021-06-01', moving_time: 3600, load: 70, norm_power: 200, type: 'Ride', best_20min: 250 },
            { id: '2', date: '2026-07-01', moving_time: 3600, load: 80, norm_power: 230, type: 'Ride', best_20min: 270 },
        ];
        const result = answerCoachQuestion(
            'How is my FTP compared to 5 years ago?',
            historicalActivities,
            { ftp: 260 },
        );
        expect(result.title).toMatch(/FTP over time/i);
        expect(result.answer).toMatch(/2021|years ago/i);
        expect(result.answer).not.toMatch(/coachContext/i);
    });

    it('answers top 10 best 60-minute efforts for a calendar year', () => {
        const yearActivities = [
            { id: 'a', date: '2024-06-15', type: 'Ride', title: 'Long Z2', best_60min: 301 },
            { id: 'b', date: '2024-03-01', type: 'Ride', title: 'Spring ride', best_60min: 285 },
            { id: 'c', date: '2024-09-01', type: 'Ride', title: 'Endurance', best_60min: 295 },
        ];
        const result = answerCoachQuestion(
            'What are 10 best 60-minute FTP values from 2024?',
            yearActivities,
            { ftp: 280 },
        );
        expect(result.source).toBe('structured');
        expect(result.answer).toMatch(/301W/);
        expect(result.answer).toMatch(/295W/);
        expect(result.answer).not.toMatch(/only have access to your yearly peak/i);
    });

    it('answers multi-year top-10 analysis locally', () => {
        const acts = [
            { id: 'a', date: '2024-06-01', type: 'Ride', best_60min: 301 },
            { id: 'b', date: '2023-06-01', type: 'Ride', best_60min: 290 },
        ];
        const result = answerCoachQuestion(
            'Top 10 highest 60-minute values for each of the past 10 years with yearly averages',
            acts,
            { ftp: 280 },
        );
        expect(result.source).toBe('structured');
        expect(result.answer).toMatch(/2024/);
        expect(result.answer).toMatch(/Trend/);
    });

    it('returns fallback for unknown questions', () => {
        const result = answerCoachQuestion('xyzzy unknown', activities, { ftp: 250 });
        expect(result.answer).toMatch(/quick question/i);
    });
});
