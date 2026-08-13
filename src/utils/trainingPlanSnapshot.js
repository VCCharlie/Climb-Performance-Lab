/**
 * Shared training-goal snapshot (Goal Planner → AI Coach → Recovery Advisor).
 * Persisted in localStorage so tabs stay linked without App.jsx state bloat.
 */

import { resolveTrainingGoalDisplayName } from './trainingGoalLink';
import { safeLocalStorageSet } from './safeStorage.js';

export const TRAINING_PLAN_STORAGE_KEY = 'cpl.trainingPlan.v1';
export const TRAINING_PLAN_CLEARED_AT_KEY = 'cpl.trainingPlan.clearedAt.v1';
export const TRAINING_PLAN_UPDATED_EVENT = 'cpl-training-plan-updated';

const MS_DAY = 86400000;

/**
 * @param {string} goalDateStr ISO YYYY-MM-DD
 * @param {Date} [today]
 * @returns {number}
 */
export function weeksToGoalDate(goalDateStr, today = new Date()) {
    if (!goalDateStr) return 0;
    const goal = new Date(goalDateStr);
    if (Number.isNaN(goal.getTime())) return 0;
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    goal.setHours(0, 0, 0, 0);
    const diff = goal.getTime() - start.getTime();
    return Math.max(0, Math.floor(diff / (7 * MS_DAY)));
}

/**
 * @param {object[]} planWeeks
 * @param {string} goalDateStr
 * @param {Date} [today]
 * @returns {object | null}
 */
export function resolveCurrentPlanWeek(planWeeks, goalDateStr, today = new Date()) {
    if (!Array.isArray(planWeeks) || planWeeks.length === 0) return null;
    const remaining = weeksToGoalDate(goalDateStr, today);
    if (remaining <= 0) return planWeeks[planWeeks.length - 1] || null;
    const weekNum = Math.max(1, Math.min(planWeeks.length, planWeeks.length - remaining + 1));
    return planWeeks.find((w) => w.weekNum === weekNum) || planWeeks[weekNum - 1] || null;
}

/**
 * @param {object} params
 * @param {string} params.goalDate
 * @param {string} [params.eventName]
 * @param {object} [params.goalInputs] — form fields for hydration (distance, elevation, …)
 * @param {object} planResult output of computeTrainingGoalPlan
 */
export function buildTrainingPlanSnapshot({ goalDate, eventName, goalInputs, planResult }) {
    if (!goalDate || planResult?.error || !planResult?.plan?.weeks?.length) {
        return null;
    }

    const weeks = planResult.plan.weeks;
    const currentWeek = resolveCurrentPlanWeek(weeks, goalDate);

    const normalizedInputs = goalInputs
        ? {
            source: goalInputs.source === 'climb' ? 'climb' : 'custom',
            distanceKm: Number(goalInputs.distanceKm) || 0,
            elevationM: Number(goalInputs.elevationM) || 0,
            durationHours: goalInputs.durationHours === '' || goalInputs.durationHours == null
                ? null
                : Number(goalInputs.durationHours),
            targetPctFtp: Number(goalInputs.targetPctFtp) || 75,
            climbSearch: (goalInputs.climbSearch || '').trim(),
            customEventName: (goalInputs.customEventName ?? eventName ?? '').trim(),
        }
        : null;

    const displayName = resolveTrainingGoalDisplayName({
        eventName,
        source: normalizedInputs?.source,
        climbSearch: normalizedInputs?.climbSearch,
        distanceKm: normalizedInputs?.distanceKm,
        elevationM: normalizedInputs?.elevationM,
        goalInputs: normalizedInputs,
    });

    return {
        version: 1,
        updatedAt: new Date().toISOString(),
        goalDate,
        eventName: displayName,
        goalInputs: normalizedInputs,
        weeksToEvent: planResult.weeksToEvent,
        recentWeeklyTss: planResult.recentWeeklyTss,
        estimatedEventTss: planResult.demand?.estimatedEventTss ?? null,
        planSummary: planResult.plan.summary || '',
        weeks,
        currentWeekNum: currentWeek?.weekNum ?? 1,
        currentWeekTargetTss: currentWeek?.targetTss ?? null,
        currentPhaseLabel: currentWeek?.phaseLabel ?? '',
        currentPhaseKey: currentWeek?.phaseKey ?? '',
        isTaperPhase: currentWeek?.phaseKey === 'taper',
    };
}

/**
 * Validate and normalize a stored training plan snapshot.
 * @param {object | null | undefined} raw
 * @returns {object | null}
 */
export function normalizeTrainingPlanSnapshot(raw) {
    if (!raw || typeof raw !== 'object' || !raw.goalDate) return null;
    if (!Array.isArray(raw.weeks) || raw.weeks.length === 0) return null;

    const goalInputs = raw.goalInputs && typeof raw.goalInputs === 'object'
        ? {
            source: raw.goalInputs.source === 'climb' ? 'climb' : 'custom',
            distanceKm: Number(raw.goalInputs.distanceKm) || 0,
            elevationM: Number(raw.goalInputs.elevationM) || 0,
            durationHours: raw.goalInputs.durationHours == null || raw.goalInputs.durationHours === ''
                ? null
                : Number(raw.goalInputs.durationHours),
            targetPctFtp: Number(raw.goalInputs.targetPctFtp) || 75,
            climbSearch: (raw.goalInputs.climbSearch || '').trim(),
            customEventName: (raw.goalInputs.customEventName || '').trim(),
        }
        : null;

    const base = {
        version: raw.version ?? 1,
        updatedAt: raw.updatedAt || new Date().toISOString(),
        goalDate: String(raw.goalDate).slice(0, 10),
        goalInputs,
        weeksToEvent: Number(raw.weeksToEvent) || 0,
        recentWeeklyTss: Number(raw.recentWeeklyTss) || 0,
        estimatedEventTss: raw.estimatedEventTss == null ? null : Number(raw.estimatedEventTss),
        planSummary: raw.planSummary || '',
        weeks: raw.weeks,
        currentWeekNum: raw.currentWeekNum ?? 1,
        currentWeekTargetTss: raw.currentWeekTargetTss ?? null,
        currentPhaseLabel: raw.currentPhaseLabel || '',
        currentPhaseKey: raw.currentPhaseKey || '',
        isTaperPhase: raw.currentPhaseKey === 'taper',
    };

    return {
        ...base,
        eventName: resolveTrainingGoalDisplayName({ snapshot: { ...base, eventName: raw.eventName } }),
    };
}

/**
 * @returns {object | null}
 */
export function readTrainingPlanSnapshot() {
    if (typeof localStorage === 'undefined') return null;
    try {
        const raw = localStorage.getItem(TRAINING_PLAN_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return normalizeTrainingPlanSnapshot(parsed);
    } catch {
        return null;
    }
}

/**
 * ISO timestamp of the last local clear (for cloud last-write-wins).
 * @returns {string | null}
 */
export function readTrainingPlanClearedAt() {
    if (typeof localStorage === 'undefined') return null;
    try {
        return localStorage.getItem(TRAINING_PLAN_CLEARED_AT_KEY);
    } catch {
        return null;
    }
}

/**
 * Apply snapshot to localStorage and notify listeners (cloud pull or login merge).
 * @param {object | null} snapshot
 */
export function applyTrainingPlanToLocal(snapshot) {
    if (!snapshot) {
        if (typeof localStorage !== 'undefined') {
            try {
                localStorage.removeItem(TRAINING_PLAN_STORAGE_KEY);
                localStorage.removeItem(TRAINING_PLAN_CLEARED_AT_KEY);
            } catch {
                /* ignore */
            }
        }
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(TRAINING_PLAN_UPDATED_EVENT, { detail: { source: 'cloud' } }));
        }
        return;
    }

    const normalized = normalizeTrainingPlanSnapshot(snapshot);
    if (!normalized) {
        applyTrainingPlanToLocal(null);
        return;
    }

    safeLocalStorageSet(TRAINING_PLAN_STORAGE_KEY, JSON.stringify(normalized));
    if (typeof localStorage !== 'undefined') {
        try {
            localStorage.removeItem(TRAINING_PLAN_CLEARED_AT_KEY);
        } catch {
            /* ignore */
        }
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(TRAINING_PLAN_UPDATED_EVENT, { detail: { source: 'cloud' } }));
    }
}

/**
 * @returns {object | null}
 */
export function readTrainingPlanSnapshotRaw() {
    if (typeof localStorage === 'undefined') return null;
    try {
        const raw = localStorage.getItem(TRAINING_PLAN_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || !parsed.goalDate) return null;
        return parsed;
    } catch {
        return null;
    }
}

/**
 * @param {object | null} snapshot
 * @returns {boolean}
 */
export function writeTrainingPlanSnapshot(snapshot) {
    if (!snapshot) {
        if (typeof localStorage !== 'undefined') {
            try {
                localStorage.removeItem(TRAINING_PLAN_STORAGE_KEY);
            } catch {
                /* ignore */
            }
        }
        safeLocalStorageSet(TRAINING_PLAN_CLEARED_AT_KEY, new Date().toISOString());
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(TRAINING_PLAN_UPDATED_EVENT));
        }
        return true;
    }

    const normalized = normalizeTrainingPlanSnapshot(snapshot);
    if (!normalized) return false;

    if (typeof localStorage !== 'undefined') {
        try {
            localStorage.removeItem(TRAINING_PLAN_CLEARED_AT_KEY);
        } catch {
            /* ignore */
        }
    }

    const stored = safeLocalStorageSet(TRAINING_PLAN_STORAGE_KEY, JSON.stringify(normalized));
    if (stored && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(TRAINING_PLAN_UPDATED_EVENT));
    }
    return stored;
}

/**
 * Re-resolve current week fields from stored weeks + goal date (time may have passed).
 * @param {object} snapshot
 * @param {Date} [today]
 */
export function hydrateTrainingPlanSnapshot(snapshot, today = new Date()) {
    if (!snapshot?.goalDate || !snapshot?.weeks?.length) return snapshot;
    const currentWeek = resolveCurrentPlanWeek(snapshot.weeks, snapshot.goalDate, today);
    if (!currentWeek) return snapshot;
    return {
        ...snapshot,
        weeksToEvent: weeksToGoalDate(snapshot.goalDate, today),
        currentWeekNum: currentWeek.weekNum,
        currentWeekTargetTss: currentWeek.targetTss,
        currentPhaseLabel: currentWeek.phaseLabel,
        currentPhaseKey: currentWeek.phaseKey,
        isTaperPhase: currentWeek.phaseKey === 'taper',
    };
}

/**
 * Taper-phase recovery warning when form is still negative.
 * @param {object | null} snapshot hydrated snapshot
 * @param {number | null} tsb
 */
export function buildTaperRecoveryWarning(snapshot, tsb) {
    if (!snapshot?.isTaperPhase || tsb == null) return null;
    if (tsb >= -5) return null;

    const eventLabel = snapshot.eventName || 'your event';
    const weeksLeft = snapshot.weeksToEvent ?? 0;

    return {
        type: 'warning',
        title: 'Taper but still fatigued',
        message:
            weeksLeft <= 1
                ? `${eventLabel} is very soon and your TSB is still ${tsb} (negative). Prioritize sleep and easy spins — skip any leftover hard sessions.`
                : `You are in a taper phase for ${eventLabel}, but TSB is ${tsb}. Reduce intensity further this week so you arrive fresher.`,
    };
}
