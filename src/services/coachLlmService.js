/**
 * Gemini API client for Ask the Coach (optional — requires user API key in Settings).
 */

import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { COACH_LLM_SYSTEM_PROMPT, buildCoachLlmUserMessage } from '../utils/coach/coachLlmPrompt';

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * @param {string} apiKey
 * @param {string} question
 * @param {object} coachContext
 * @param {object[]} [recentHistory]
 * @returns {Promise<{ title: string, answer: string, source: 'llm' }>}
 */
export async function askCoachLlm(apiKey, question, coachContext, recentHistory = []) {
    const key = String(apiKey || '').trim();
    if (!key) {
        throw new Error('Gemini API key not configured');
    }

    const userMessage = buildCoachLlmUserMessage(question, coachContext, recentHistory);

    const response = await fetchWithTimeout(
        `${GEMINI_URL}?key=${encodeURIComponent(key)}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: COACH_LLM_SYSTEM_PROMPT }],
                },
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: userMessage }],
                    },
                ],
                generationConfig: {
                    temperature: 0.65,
                    maxOutputTokens: 1024,
                },
            }),
        },
        45000,
    );

    if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        const msg = errBody?.error?.message || `Gemini API HTTP ${response.status}`;
        throw new Error(msg);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text || !String(text).trim()) {
        throw new Error('Empty response from Gemini');
    }

    const answer = String(text).trim();
    const titleLine = answer.split('\n').find((l) => l.trim()) || 'Coach response';

    return {
        title: titleLine.replace(/^#+\s*/, '').slice(0, 80),
        answer,
        source: 'llm',
    };
}

export function hasCoachLlmConfigured(userSettings) {
    return Boolean(String(userSettings?.geminiApiKey || '').trim());
}
