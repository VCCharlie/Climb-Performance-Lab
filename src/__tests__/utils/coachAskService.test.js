import { describe, it, expect, vi, beforeEach } from 'vitest';
import { serializeCoachContextForLlm, buildCoachLlmUserMessage } from '../../utils/coach/coachLlmPrompt';
import { hasCoachLlmConfigured } from '../../services/coachLlmService';
import { askCoach } from '../../utils/coach/coachAskService';

describe('coachLlmPrompt', () => {
    it('serializeCoachContextForLlm strips to essential fields', () => {
        const ctx = {
            athlete: { ftp: 250 },
            fitness: { tsb: 5 },
            weeklyLoad: { targetTss: 250 },
            fluidWorkout: { name: 'Test', stimulus: 'sweetspot', mainSet: {}, totalMinutes: {}, rpeTarget: 'RPE 7' },
            extra: 'removed',
        };
        const out = serializeCoachContextForLlm(ctx);
        expect(out.athlete.ftp).toBe(250);
        expect(out.extra).toBeUndefined();
        expect(out.fluidWorkout.name).toBe('Test');
    });

    it('buildCoachLlmUserMessage includes question and context', () => {
        const msg = buildCoachLlmUserMessage('How is my form?', { fitness: { tsb: 3 } });
        expect(msg).toContain('How is my form?');
        expect(msg).toContain('coachContext');
        expect(msg).toContain('"tsb": 3');
    });
});

describe('coachLlmService', () => {
    it('hasCoachLlmConfigured detects key', () => {
        expect(hasCoachLlmConfigured({})).toBe(false);
        expect(hasCoachLlmConfigured({ geminiApiKey: 'abc' })).toBe(true);
    });
});

describe('coachAskService', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    it('falls back to local when no API key', async () => {
        const result = await askCoach('How is my form?', [], { ftp: 250 });
        expect(result.source).toBe('local');
        expect(result.answer).toMatch(/TSB/i);
    });
});
