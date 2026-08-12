/**
 * Volume-aware trimming for the fluid week plan.
 * Eases future sessions only when the week is already at or above the TSS target.
 */

const SESSION_TSS_ESTIMATE = {
    recovery: 35,
    endurance: 75,
    sweetspot: 70,
    threshold: 75,
    vo2: 65,
};

function estimateSessionTss(stimulus) {
    return SESSION_TSS_ESTIMATE[stimulus] ?? 60;
}

function isWorkout(stimulus) {
    return stimulus && stimulus !== 'rest';
}

/**
 * Cancel lower-priority future workouts when the week is already at/above target TSS.
 * @param {Map<string, object>} plan — date → session assignment
 * @param {object[]} skeletonRows
 * @param {{ actualTss: number, targetTss: number, calendarYmd: string }} options
 * @returns {Map<string, object>}
 */
export function trimPlannedVolume(plan, skeletonRows, { actualTss, targetTss, calendarYmd }) {
    const next = new Map(plan);
    if (actualTss < targetTss) return next;

    const trimOrder = (a, b) => {
        const aRelocated = a.relocatedFromDate ? 0 : 1;
        const bRelocated = b.relocatedFromDate ? 0 : 1;
        if (aRelocated !== bRelocated) return aRelocated - bRelocated;
        const rank = { recovery: 0, endurance: 1, sweetspot: 2, threshold: 3, vo2: 4 };
        return (rank[a.stimulus] ?? 1) - (rank[b.stimulus] ?? 1);
    };

    const stillPlanned = () => skeletonRows
        .map((row) => {
            const slot = next.get(row.date);
            if (!slot || row.date <= calendarYmd || !isWorkout(slot.plannedStimulus) || slot.unavailable) {
                return null;
            }
            return {
                date: row.date,
                day: row.day,
                stimulus: slot.plannedStimulus,
                relocatedFromDate: slot.relocatedFromDate || null,
                estimate: estimateSessionTss(slot.plannedStimulus),
            };
        })
        .filter(Boolean)
        .sort(trimOrder);

    let plannedRemainingTss = stillPlanned().reduce((sum, w) => sum + w.estimate, 0);
    let overBudget = actualTss + plannedRemainingTss - targetTss;

    while (overBudget > 0 && stillPlanned().length > 0) {
        const drop = stillPlanned()[0];
        const slot = next.get(drop.date);
        next.set(drop.date, {
            ...slot,
            plannedStimulus: 'rest',
            note: null,
            relocatedFromDate: null,
            volumeSkipped: true,
            volumeSkipReason: 'Weekly TSS target already reached — this session was eased.',
        });
        overBudget -= drop.estimate;
        plannedRemainingTss -= drop.estimate;
    }

    return next;
}
