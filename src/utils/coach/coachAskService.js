/**
 * Orchestrates LLM coach answers with rule-based fallback.
 */

import { buildCoachContext } from './coachPayloadBuilder';
import { answerCoachQuestion } from './coachQaEngine';
import { askCoachLlm, hasCoachLlmConfigured } from '../../services/coachLlmService';

/**
 * @param {string} question
 * @param {object[]} activities
 * @param {object} userSettings
 * @param {object} [options]
 * @param {object[]} [options.recentHistory]
 * @returns {Promise<{ title: string, answer: string, source: 'llm' | 'local' }>}
 */
export async function askCoach(question, activities, userSettings, options = {}) {
    const weeklyHours = Number(options.weeklyHoursTarget)
        || Number(userSettings?.weeklyHoursTarget)
        || 5;
    const coachContext = buildCoachContext(activities, userSettings, { weeklyHoursTarget: weeklyHours });

    if (hasCoachLlmConfigured(userSettings)) {
        try {
            return await askCoachLlm(
                userSettings.geminiApiKey,
                question,
                coachContext,
                options.recentHistory || [],
            );
        } catch (err) {
            const local = answerCoachQuestion(question, activities, userSettings, { weeklyHoursTarget: weeklyHours });
            return {
                ...local,
                source: 'local',
                answer: `${local.answer}\n\n(AI unavailable: ${err.message}. Showing local analysis.)`,
            };
        }
    }

    const local = answerCoachQuestion(question, activities, userSettings, { weeklyHoursTarget: weeklyHours });
    return { ...local, source: 'local' };
}

export { hasCoachLlmConfigured };
