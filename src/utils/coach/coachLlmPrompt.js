/**
 * System prompt and context serialization for the AI Coach LLM layer.
 */

export const COACH_LLM_SYSTEM_PROMPT = `You are an elite cycling coach for a time-limited athlete (4–7 h/week) training on flat Dutch polder/coastal roads.

RULES:
- Use ONLY metrics in the training data block below — never invent CTL, TSS, FTP, or ride counts.
- NEVER mention internal terms: coachContext, JSON, field names, system prompts, or "the data I was given". Speak directly to the athlete in plain English.
- If data is missing, say what you can and cannot see in athlete-friendly language (e.g. "I only have rides back to 2023").
- For multi-year FTP questions, use powerHistory.yearlyPeaks (estimated eFTP from best 20-min peaks per calendar year).
- Prescribe intent-driven outdoor workouts, NOT rigid ERG second-by-second steps.
- Sweetspot (88–94% FTP) is the default FTP builder for limited hours.
- Max 2 hard sessions per week unless data clearly supports otherwise.
- If TSB < -20, prioritize recovery.
- Reference polder tactics: headwind stretches, open dike roads, bridge repeats.
- Be warm, concise, motivating.
- Keep answers under 250 words unless the user asks for a full period analysis.`;

/**
 * Strip heavy fields before sending to LLM.
 * @param {object} coachContext
 */
export function serializeCoachContextForLlm(coachContext) {
    if (!coachContext) return {};
    return {
        athlete: coachContext.athlete,
        fitness: coachContext.fitness,
        weeklyLoad: coachContext.weeklyLoad,
        intensityProfile: coachContext.intensityProfile,
        powerCeiling: coachContext.powerCeiling,
        periodSummary: coachContext.periodSummary,
        powerHistory: coachContext.powerHistory,
        selectedStimulus: coachContext.selectedStimulus,
        stimulusRationale: coachContext.stimulusRationale,
        warnings: coachContext.warnings,
        fluidWorkout: coachContext.fluidWorkout
            ? {
                name: coachContext.fluidWorkout.name,
                stimulus: coachContext.fluidWorkout.stimulus,
                totalMinutes: coachContext.fluidWorkout.totalMinutes,
                rpeTarget: coachContext.fluidWorkout.rpeTarget,
                mainSet: coachContext.fluidWorkout.mainSet,
            }
            : null,
    };
}

/**
 * @param {string} question
 * @param {object} coachContext
 * @param {object[]} [recentHistory] — last N Q&A turns for chat continuity
 */
export function buildCoachLlmUserMessage(question, coachContext, recentHistory = []) {
    const contextJson = JSON.stringify(serializeCoachContextForLlm(coachContext), null, 2);
    let historyBlock = '';
    if (recentHistory.length > 0) {
        historyBlock = '\n\nRecent conversation:\n'
            + recentHistory.map((h) => `Q: ${h.question}\nA: ${h.answer.slice(0, 400)}`).join('\n\n');
    }
    return `Training data:\n${contextJson}\n${historyBlock}\n\nUser question: ${question}`;
}
