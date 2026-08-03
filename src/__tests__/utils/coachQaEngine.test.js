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

    it('returns fallback for unknown questions', () => {
        const result = answerCoachQuestion('xyzzy unknown', activities, { ftp: 250 });
        expect(result.answer).toMatch(/quick question/i);
    });
});
