/**
 * Links the event training goal (Goals tab) to the fluid week plan (Coach tab).
 * Yearly volume goals (km / hours / elevation) stay separate — see volumeGoals.js.
 */

import { weeklyTssTarget, todayYmd } from './coach/coachHelpers';
import { isoWeekKey } from './coach/coachWeekState';
import {
    hydrateTrainingPlanSnapshot,
    readTrainingPlanSnapshot,
    resolveCurrentPlanWeek,
    weeksToGoalDate,
} from './trainingPlanSnapshot';

/**
 * @param {object | null} snapshot
 * @param {Date} [referenceDate]
 * @returns {boolean}
 */
export function isTrainingGoalActive(snapshot, referenceDate = new Date()) {
    if (!snapshot?.goalDate || !snapshot?.weeks?.length) return false;

    const goal = new Date(`${snapshot.goalDate}T23:59:59`);
    if (Number.isNaN(goal.getTime())) return false;

    const ref = new Date(referenceDate);
    ref.setHours(0, 0, 0, 0);
    return goal >= ref;
}

/**
 * Read + hydrate the active event goal for a reference calendar date.
 * @param {string} [referenceYmd] ISO YYYY-MM-DD — week being planned (defaults to today)
 * @returns {object | null}
 */
export function getActiveTrainingGoal(referenceYmd) {
    const raw = readTrainingPlanSnapshot();
    if (!raw) return null;

    const refDate = referenceYmd
        ? new Date(`${referenceYmd}T12:00:00`)
        : new Date();

    const hydrated = hydrateTrainingPlanSnapshot(raw, refDate);
    if (!isTrainingGoalActive(hydrated, refDate)) return null;

    const planWeek = resolveCurrentPlanWeek(hydrated.weeks, hydrated.goalDate, refDate);
    if (!planWeek) return null;

    const displayName = trainingGoalDisplayNameFromSnapshot(hydrated);

    return {
        ...hydrated,
        displayName,
        eventName: displayName,
        currentWeekNum: planWeek.weekNum,
        currentWeekTargetTss: planWeek.targetTss,
        currentPhaseLabel: planWeek.phaseLabel,
        currentPhaseKey: planWeek.phaseKey,
        isTaperPhase: planWeek.phaseKey === 'taper',
        weeksToEvent: weeksToGoalDate(hydrated.goalDate, refDate),
    };
}

/** User-facing labels for weekly TSS target sources. */
export const WEEKLY_TSS_TARGET_SOURCE_LABELS = {
    manual: 'Manual',
    'event-goal': 'Event goal',
    'hours-budget': 'Hours budget',
};

/**
 * Resolve manual TSS override for the ISO week containing referenceYmd.
 * @param {object} [userSettings]
 * @param {string} [referenceYmd]
 * @returns {{ weekKey: string, targetTss: number } | null}
 */
export function getWeeklyTssOverride(userSettings, referenceYmd = todayYmd()) {
    const weekKey = isoWeekKey(referenceYmd);
    const raw = userSettings?.weeklyTssOverrides?.[weekKey];
    const targetTss = Math.round(Number(raw));
    if (!Number.isFinite(targetTss) || targetTss <= 0) return null;
    return { weekKey, targetTss };
}

/**
 * Resolve weekly TSS + phase for the fluid week planner.
 * Manual override > event goal > hours-budget table.
 *
 * @param {object} params
 * @param {object} [params.userSettings]
 * @param {string} [params.referenceYmd]
 * @returns {{
 *   targetTss: number,
 *   source: 'manual' | 'event-goal' | 'hours-budget',
 *   weekKey: string,
 *   phaseKey: string | null,
 *   phaseLabel: string | null,
 *   trainingGoal: object | null,
 *   hoursBudgetTss: number,
 * }}
 */
export function resolveFluidWeekTarget({ userSettings, referenceYmd }) {
    const weeklyHours = Number(userSettings?.weeklyHoursTarget) || 5;
    const hoursBudgetTss = weeklyTssTarget(weeklyHours);
    const trainingGoal = getActiveTrainingGoal(referenceYmd);
    const weekKey = isoWeekKey(referenceYmd || todayYmd());
    const manualOverride = getWeeklyTssOverride(userSettings, referenceYmd);

    const goalPayload = trainingGoal
        ? {
            ...trainingGoal,
            displayName: trainingGoalDisplayNameFromSnapshot(trainingGoal),
        }
        : null;

    if (manualOverride) {
        return {
            targetTss: manualOverride.targetTss,
            source: 'manual',
            weekKey: manualOverride.weekKey,
            phaseKey: trainingGoal?.currentPhaseKey || null,
            phaseLabel: trainingGoal?.currentPhaseLabel || null,
            trainingGoal: goalPayload,
            hoursBudgetTss,
        };
    }

    if (!trainingGoal?.currentWeekTargetTss) {
        return {
            targetTss: hoursBudgetTss,
            source: 'hours-budget',
            weekKey,
            phaseKey: null,
            phaseLabel: null,
            trainingGoal: null,
            hoursBudgetTss,
        };
    }

    return {
        targetTss: trainingGoal.currentWeekTargetTss,
        source: 'event-goal',
        weekKey,
        phaseKey: trainingGoal.currentPhaseKey || null,
        phaseLabel: trainingGoal.currentPhaseLabel || null,
        trainingGoal: goalPayload,
        hoursBudgetTss,
    };
}

/**
 * Human-readable event goal title (custom name, climb, or distance fallback).
 * @param {object} params
 */
export function resolveTrainingGoalDisplayName({
    eventName,
    source,
    climbSearch,
    distanceKm,
    elevationM,
    goalInputs,
    snapshot,
} = {}) {
    const inputs = goalInputs || snapshot?.goalInputs || {};
    const customRaw = (
        eventName
        ?? inputs.customEventName
        ?? snapshot?.goalInputs?.customEventName
        ?? ''
    ).trim();
    const storedName = (snapshot?.eventName || '').trim();
    const custom = customRaw || (storedName && !/^training goal$/i.test(storedName) ? storedName : '');

    if (custom && !/^training goal$/i.test(custom)) {
        return custom;
    }

    const climb = (climbSearch ?? inputs.climbSearch ?? '').trim();
    if (climb) return climb;

    const km = Number(distanceKm ?? inputs.distanceKm) || 0;
    const elev = Number(elevationM ?? inputs.elevationM) || 0;
    if (km > 0 && elev > 0) return `${km} km · ${elev} m`;
    if (km > 0) return `${km} km event`;

    return storedName || custom || 'Training goal';
}

/**
 * @param {object | null} snapshot
 * @returns {string}
 */
export function trainingGoalDisplayNameFromSnapshot(snapshot) {
    if (!snapshot) return 'Training goal';
    return resolveTrainingGoalDisplayName({ snapshot });
}

/**
 * Form defaults restored from a stored snapshot (Goals tab hydration).
 * @param {object | null} snapshot
 * @returns {object | null}
 */
export function trainingGoalFormDefaultsFromSnapshot(snapshot) {
    if (!snapshot?.goalDate) return null;

    const inputs = snapshot.goalInputs || {};
    const customEventName = (inputs.customEventName || '').trim();
    const eventName = customEventName
        || (snapshot.eventName === 'Training goal' ? '' : (snapshot.eventName || ''));

    return {
        goalDate: snapshot.goalDate,
        eventName,
        source: inputs.source === 'climb' ? 'climb' : 'custom',
        climbSearch: inputs.climbSearch || eventName || '',
        distanceKm: inputs.distanceKm != null ? String(inputs.distanceKm) : '',
        elevationM: inputs.elevationM != null ? String(inputs.elevationM) : '',
        durationHours: inputs.durationHours != null && inputs.durationHours !== ''
            ? String(inputs.durationHours)
            : '',
        targetPctFtp: Number(inputs.targetPctFtp) || 75,
    };
}
