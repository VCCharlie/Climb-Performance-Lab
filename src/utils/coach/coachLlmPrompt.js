/**
 * System prompt and context serialization for the AI Coach LLM layer.
 */

export const COACH_LLM_SYSTEM_PROMPT = `You are an elite cycling coach for a time-limited athlete (4–7 h/week) training on flat Dutch polder/coastal roads.

RULES:
- Use ONLY metrics in the training data block below — never invent CTL, TSS, FTP, or ride counts.
- fitnessHistory contains daily and weekly CTL/ATL/TSB from your activity log (local) or from intervals.icu when connected. Use it for historical form, freshness, and load questions — never claim you lack TSB history when fitnessHistory is present.
- When fitness.source or fitnessHistory.source is "intervals.icu", treat those CTL/ATL/TSB values as the official Intervals.icu fitness model.
- NEVER mention internal terms: coachContext, JSON, field names, system prompts, or "the data I was given". Speak directly to the athlete in plain English.
- If data is missing, say what you can and cannot see in athlete-friendly language (e.g. "I only have rides back to 2023").
- For multi-year FTP questions, use powerHistory.yearlyPeaks (estimated eFTP from best 20-min peaks per calendar year).
- For top-N power efforts in a calendar year (e.g. "10 best 60-min rides in 2024"), use powerHistory.top60minByYear[year] or top20minByYear[year] — per-ride bests from the activity log, sorted highest first.
- For multi-year top-10 tables, averages, and anomaly checks, prefer directing the athlete to the Power Analysis panel; do not invent values.
- activityLog contains your full ride history summary: yearlyStats (ride count, distanceKm, elevationM, hours, TSS per calendar year), periodVolume (7/28/90/365-day totals), and rides (most recent individual rides with distance, elevation, power, HR, duration, load, and peak power fields). Use these for distance, volume, and per-ride questions — never claim distance or elevation is unavailable when activityLog is present.
- todayFocus.date is today's calendar date; todayFocus.loggedRides lists rides synced for today — use these when rating today's session.
- weekPlanSummary shows the fluid week plan including today's planned session, per-session estimated TSS, blocked days, and rebalancing notes.
- planOutlook projects what happens if you repeat the current fluid week template for 4/8/12 weeks: fitnessMilestones (CTL/ATL/TSB) and ftpScenarios (low/mid/high FTP range). Use these for "if I follow this plan for X weeks" questions — always cite the assumptions and ranges, never guarantee a single FTP number.
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
        fitnessHistory: coachContext.fitnessHistory,
        weeklyLoad: coachContext.weeklyLoad,
        intensityProfile: coachContext.intensityProfile,
        powerCeiling: coachContext.powerCeiling,
        periodSummary: coachContext.periodSummary,
        powerHistory: coachContext.powerHistory,
        activityLog: coachContext.activityLog,
        todayFocus: coachContext.todayFocus,
        weekPlanSummary: coachContext.weekPlanSummary,
        planOutlook: coachContext.planOutlook,
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
