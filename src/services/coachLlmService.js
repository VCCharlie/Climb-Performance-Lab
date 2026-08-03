/**
 * Gemini API client for Ask the Coach (optional — requires user API key in Settings).
 */

import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { COACH_LLM_SYSTEM_PROMPT, buildCoachLlmUserMessage } from '../utils/coach/coachLlmPrompt';

/** Ordered fallback — first available wins (2.0 Flash shut down June 2026). */
export const COACH_GEMINI_MODELS = [
    import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-3.1-flash-lite',
].filter((m, i, arr) => m && arr.indexOf(m) === i);

function geminiGenerateUrl(model) {
    return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

/**
 * @param {string} apiKey
 * @param {string} userMessage
 * @param {string} model
 */
async function callGemini(apiKey, userMessage, model) {
    const response = await fetchWithTimeout(
        `${geminiGenerateUrl(model)}?key=${encodeURIComponent(apiKey)}`,
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
        const err = new Error(msg);
        err.status = response.status;
        throw err;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text || !String(text).trim()) {
        throw new Error('Empty response from Gemini');
    }
    return String(text).trim();
}

function isModelUnavailableError(err) {
    const msg = String(err?.message || '').toLowerCase();
    return (
        err?.status === 404
        || msg.includes('no longer available')
        || msg.includes('not found')
        || msg.includes('is not supported')
    );
}

/**
 * Strip internal jargon the model sometimes echoes back to users.
 * @param {string} text
 */
export function sanitizeCoachLlmAnswer(text) {
    let out = String(text || '').trim();
    out = out.replace(/\bcoachContext\b/gi, 'your training data');
    out = out.replace(/`coachContext`/gi, 'your training data');
    out = out.replace(
        /I cannot answer that question because your (?:`)?(?:coachContext|training data)(?:`)?[^.]*\./gi,
        '',
    );
    out = out.replace(
        /\(I cannot provide an analysis[^)]*\)/gi,
        '',
    );
    out = out.replace(/\n{3,}/g, '\n\n').trim();
    return out;
}

/**
 * @param {string} apiKey
 * @param {string} question
 * @param {object} coachContext
 * @param {object[]} [recentHistory]
 * @returns {Promise<{ title: string, answer: string, source: 'llm', model: string }>}
 */
export async function askCoachLlm(apiKey, question, coachContext, recentHistory = []) {
    const key = String(apiKey || '').trim();
    if (!key) {
        throw new Error('Gemini API key not configured');
    }

    const userMessage = buildCoachLlmUserMessage(question, coachContext, recentHistory);
    const models = COACH_GEMINI_MODELS;
    let lastError = null;

    for (const model of models) {
        try {
            const answer = sanitizeCoachLlmAnswer(await callGemini(key, userMessage, model));
            const titleLine = answer.split('\n').find((l) => l.trim()) || 'Coach response';
            return {
                title: titleLine.replace(/^#+\s*/, '').slice(0, 80),
                answer,
                source: 'llm',
                model,
            };
        } catch (err) {
            lastError = err;
            if (!isModelUnavailableError(err)) {
                throw err;
            }
        }
    }

    throw lastError || new Error('No Gemini model available');
}

export function hasCoachLlmConfigured(userSettings) {
    return Boolean(String(userSettings?.geminiApiKey || '').trim());
}
