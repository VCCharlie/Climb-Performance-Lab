/**
 * Reschedule week sessions when the athlete marks days as unavailable.
 */

import { daysApartYmd } from './coachSessionMatcher';

const STIMULUS_RANK = {
    recovery: 0,
    endurance: 1,
    sweetspot: 2,
    threshold: 3,
    vo2: 4,
};

function isWorkout(stimulus) {
    return stimulus && stimulus !== 'rest';
}

/**
 * @param {object[]} skeletonRows — 7-day skeleton with date, day, session
 * @param {Map<string, object>} basePlan — date → { plannedStimulus, note, originalStimulus, ... }
 * @param {string[]} unavailableDates
 * @param {string} referenceYmd
 * @param {string[]} [availableDates]
 */
export function applyAvailabilityRelocation(skeletonRows, basePlan, unavailableDates, referenceYmd, availableDates = []) {
    const unavailable = new Set((unavailableDates || []).filter(Boolean));
    const available = new Set((availableDates || []).filter(Boolean));
    if (unavailable.size === 0) {
        return {
            assignment: null,
            relocations: [],
            dropped: [],
            availabilityNote: null,
        };
    }

    /** @type {Map<string, object>} */
    const assignment = new Map();
    /** @type {object[]} */
    const displaced = [];

    for (const row of skeletonRows) {
        const base = basePlan.get(row.date);
        const stimulus = base?.plannedStimulus || row.stimulus;

        if (unavailable.has(row.date)) {
            if (isWorkout(stimulus)) {
                displaced.push({
                    fromDate: row.date,
                    fromDay: row.day,
                    stimulus,
                    session: row.session,
                    note: base?.note || null,
                    originalStimulus: base?.originalStimulus || row.stimulus,
                });
            }
            assignment.set(row.date, {
                plannedStimulus: 'rest',
                unavailable: true,
                originalStimulus: base?.originalStimulus || row.stimulus,
                note: null,
            });
        } else {
            assignment.set(row.date, {
                plannedStimulus: stimulus,
                note: base?.note || null,
                originalStimulus: base?.originalStimulus || row.stimulus,
                unavailable: false,
            });
        }
    }

    displaced.sort((a, b) => {
        const byDate = a.fromDate.localeCompare(b.fromDate);
        if (byDate !== 0) return byDate;
        return (STIMULUS_RANK[b.stimulus] ?? 0) - (STIMULUS_RANK[a.stimulus] ?? 0);
    });

    const relocations = [];
    const dropped = [];
    const pending = [...displaced];

    while (pending.length > 0) {
        const item = pending.shift();
        const slotDate = pickRelocationSlot(skeletonRows, assignment, unavailable, available, item, referenceYmd);

        if (!slotDate) {
            dropped.push(item);
            continue;
        }

        const existing = assignment.get(slotDate);
        if (isWorkout(existing?.plannedStimulus)) {
            pending.push({
                fromDate: slotDate,
                fromDay: skeletonRows.find((r) => r.date === slotDate)?.day || slotDate,
                stimulus: existing.plannedStimulus,
                session: skeletonRows.find((r) => r.date === slotDate)?.session,
                note: existing.note,
                originalStimulus: existing.originalStimulus,
                bumped: true,
            });
        }

        assignment.set(slotDate, {
            plannedStimulus: item.stimulus,
            note: item.note,
            originalStimulus: item.originalStimulus,
            relocatedFromDate: item.fromDate,
            unavailable: false,
        });
        relocations.push({
            fromDate: item.fromDate,
            toDate: slotDate,
            stimulus: item.stimulus,
            fromDay: item.fromDay,
            toDay: skeletonRows.find((r) => r.date === slotDate)?.day || slotDate,
        });
    }

    let availabilityNote = null;
    if (relocations.length > 0) {
        const summary = relocations
            .map((r) => `${r.fromDay} → ${r.toDay}`)
            .join(', ');
        availabilityNote = `Sessions rescheduled around your blocked days: ${summary}.`;
    }
    if (dropped.length > 0) {
        const names = dropped.map((d) => `${d.fromDay} (${d.stimulus})`).join(', ');
        availabilityNote = `${availabilityNote ? `${availabilityNote} ` : ''}`
            + `Could not fit this week: ${names}.`;
    }

    return {
        assignment,
        relocations,
        dropped,
        availabilityNote,
    };
}

/**
 * @param {object[]} skeletonRows
 * @param {Map<string, object>} assignment
 * @param {Set<string>} unavailable
 * @param {Set<string>} available
 * @param {object} item
 * @param {string} referenceYmd
 */
function pickRelocationSlot(skeletonRows, assignment, unavailable, available, item, referenceYmd) {
    const candidates = skeletonRows
        .map((row) => row.date)
        .filter((date) => !unavailable.has(date))
        .filter((date) => date >= referenceYmd)
        .sort((a, b) => compareSlotPreference(a, b, item.fromDate, available));

    for (const date of candidates) {
        const slot = assignment.get(date);
        if (!slot) continue;
        if (!isWorkout(slot.plannedStimulus)) {
            return date;
        }
    }

    for (const date of candidates) {
        const slot = assignment.get(date);
        if (!slot || slot.relocatedFromDate) continue;

        // Do not bump today's native workout — keep the planned session for today.
        if (date === referenceYmd && isWorkout(slot.plannedStimulus) && !available.has(date)) {
            continue;
        }

        const slotRank = STIMULUS_RANK[slot.plannedStimulus] ?? 0;
        const itemRank = STIMULUS_RANK[item.stimulus] ?? 0;
        if (itemRank > slotRank) {
            return date;
        }
    }

    return null;
}

function compareSlotPreference(a, b, fromDate, available = new Set()) {
    const aOpen = available.has(a) ? 0 : 1;
    const bOpen = available.has(b) ? 0 : 1;
    if (aOpen !== bOpen) return aOpen - bOpen;
    const aBefore = a < fromDate ? 0 : 1;
    const bBefore = b < fromDate ? 0 : 1;
    if (aBefore !== bBefore) return aBefore - bBefore;

    const distA = daysApartYmd(a, fromDate);
    const distB = daysApartYmd(b, fromDate);
    if (distA !== distB) return distA - distB;

    return a.localeCompare(b);
}
