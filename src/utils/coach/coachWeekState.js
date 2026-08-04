/**
 * Local persistence for coach week completion and manual overrides.
 * v2: stores multiple ISO weeks so week 1 and week 2 plans do not overwrite each other.
 */

import { todayYmd } from './coachHelpers';

const STORAGE_KEY_V2 = 'coachWeekState_v2';
const STORAGE_KEY_V1 = 'coachWeekState_v1';

export function isoWeekKey(ymd) {
    const [y, m, d] = ymd.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setHours(12, 0, 0, 0);
    const day = dt.getDay() || 7;
    dt.setDate(dt.getDate() + 4 - day);
    const yearStart = new Date(dt.getFullYear(), 0, 1);
    const week = Math.ceil((((dt - yearStart) / 86400000) + 1) / 7);
    return `${dt.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function getMondayYmd(referenceYmd) {
    const [y, m, d] = referenceYmd.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const day = dt.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    dt.setDate(dt.getDate() + diff);
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
}

function emptyWeekState(weekKey) {
    return {
        weekKey,
        completedDates: [],
        overrides: {},
        moves: {},
        unavailableDates: [],
        availableDates: [],
        sessionMatches: {},
        updatedAt: null,
    };
}

/**
 * @param {object | null | undefined} raw
 * @returns {{ weekKey: string, completedDates: string[], overrides: Record<string, string>, moves: Record<string, string>, unavailableDates: string[], availableDates: string[], sessionMatches: Record<string, object>, updatedAt: string | null }}
 */
export function normalizeCoachWeekState(raw) {
    return {
        weekKey: raw?.weekKey || '',
        completedDates: Array.isArray(raw?.completedDates) ? raw.completedDates : [],
        overrides: raw?.overrides && typeof raw.overrides === 'object' ? raw.overrides : {},
        moves: raw?.moves && typeof raw.moves === 'object' ? raw.moves : {},
        unavailableDates: Array.isArray(raw?.unavailableDates) ? raw.unavailableDates : [],
        availableDates: Array.isArray(raw?.availableDates) ? raw.availableDates : [],
        sessionMatches: raw?.sessionMatches && typeof raw.sessionMatches === 'object' ? raw.sessionMatches : {},
        updatedAt: raw?.updatedAt || null,
    };
}

function readStorageRoot() {
    try {
        const rawV2 = localStorage.getItem(STORAGE_KEY_V2);
        if (rawV2) {
            const parsed = JSON.parse(rawV2);
            if (parsed?.version === 2 && parsed.weeks && typeof parsed.weeks === 'object') {
                return parsed;
            }
        }

        const rawV1 = localStorage.getItem(STORAGE_KEY_V1);
        if (rawV1) {
            const parsed = JSON.parse(rawV1);
            if (parsed?.weekKey) {
                return {
                    version: 2,
                    weeks: {
                        [parsed.weekKey]: normalizeCoachWeekState(parsed),
                    },
                };
            }
        }
    } catch {
        /* corrupt storage */
    }

    return { version: 2, weeks: {} };
}

function writeStorageRoot(root) {
    try {
        localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(root));
        localStorage.removeItem(STORAGE_KEY_V1);
    } catch {
        /* quota */
    }
}

function readWeekFromRoot(root, weekKey) {
    const stored = root.weeks?.[weekKey];
    return stored ? normalizeCoachWeekState(stored) : emptyWeekState(weekKey);
}

/** Full local payload for cloud sync — current ISO week only (backward compatible). */
export function readRawCoachWeekForSync() {
    const mondayYmd = getMondayYmd(todayYmd());
    const weekKey = isoWeekKey(mondayYmd);
    const state = readCoachWeekState(mondayYmd);
    return {
        ...state,
        weekKey,
        updatedAt: state.updatedAt || new Date().toISOString(),
    };
}

/**
 * @param {object | null | undefined} raw
 */
export function readRawCoachWeekForSyncFromRoot(raw) {
    if (!raw) return readRawCoachWeekForSync();
    if (raw.version === 2 && raw.weeks) {
        const mondayYmd = getMondayYmd(todayYmd());
        const weekKey = isoWeekKey(mondayYmd);
        const state = readWeekFromRoot(raw, weekKey);
        return {
            ...state,
            weekKey,
            updatedAt: state.updatedAt || new Date().toISOString(),
        };
    }
    if (raw.weekKey) {
        return normalizeCoachWeekState(raw);
    }
    return readRawCoachWeekForSync();
}

export function applyCoachWeekStateToLocal(state) {
    const next = normalizeCoachWeekState(state);
    const root = readStorageRoot();
    root.weeks[next.weekKey] = {
        ...next,
        updatedAt: next.updatedAt || new Date().toISOString(),
    };
    writeStorageRoot(root);
    return next;
}

/**
 * @param {string} mondayYmd
 * @returns {{ weekKey: string, completedDates: string[], overrides: Record<string, string>, moves: Record<string, string>, unavailableDates: string[], availableDates: string[] }}
 */
export function readCoachWeekState(mondayYmd) {
    const weekKey = isoWeekKey(mondayYmd);
    const root = readStorageRoot();
    return readWeekFromRoot(root, weekKey);
}

/**
 * @param {string} mondayYmd
 * @param {{ completedDates?: string[], overrides?: Record<string, string>, moves?: Record<string, string>, unavailableDates?: string[], availableDates?: string[] }} patch
 */
export function writeCoachWeekState(mondayYmd, patch) {
    const weekKey = isoWeekKey(mondayYmd);
    const root = readStorageRoot();
    const current = readWeekFromRoot(root, weekKey);
    const next = {
        weekKey,
        completedDates: patch.completedDates ?? current.completedDates,
        overrides: patch.overrides ?? current.overrides,
        moves: patch.moves ?? current.moves,
        unavailableDates: patch.unavailableDates ?? current.unavailableDates,
        availableDates: patch.availableDates ?? current.availableDates,
        sessionMatches: patch.sessionMatches ?? current.sessionMatches,
        updatedAt: new Date().toISOString(),
    };
    root.weeks[weekKey] = next;
    writeStorageRoot(root);
    return next;
}

/**
 * Persist auto-detected session ↔ activity matches for cross-device stability.
 * @param {string} mondayYmd
 * @param {Record<string, { activityId?: string, activityDate: string, matchedStimulus: string }>} matches
 */
export function mergeSessionMatches(mondayYmd, matches) {
    const current = readCoachWeekState(mondayYmd);
    const nextMatches = { ...current.sessionMatches };
    let changed = false;

    for (const [sessionDate, match] of Object.entries(matches || {})) {
        if (!match?.activityDate) continue;
        const prev = nextMatches[sessionDate];
        if (
            !prev
            || prev.activityDate !== match.activityDate
            || prev.matchedStimulus !== match.matchedStimulus
            || prev.activityId !== match.activityId
        ) {
            nextMatches[sessionDate] = {
                activityId: match.activityId || prev?.activityId || null,
                activityDate: match.activityDate,
                matchedStimulus: match.matchedStimulus,
            };
            changed = true;
        }
    }

    if (!changed) return current;
    return writeCoachWeekState(mondayYmd, { sessionMatches: nextMatches });
}

export function toggleSessionComplete(mondayYmd, dateYmd) {
    const state = readCoachWeekState(mondayYmd);
    const set = new Set(state.completedDates);
    if (set.has(dateYmd)) set.delete(dateYmd);
    else set.add(dateYmd);
    return writeCoachWeekState(mondayYmd, { completedDates: [...set] });
}

export function setSessionOverride(mondayYmd, dateYmd, stimulus) {
    const state = readCoachWeekState(mondayYmd);
    const overrides = { ...state.overrides };
    if (!stimulus || stimulus === 'clear') {
        delete overrides[dateYmd];
    } else {
        overrides[dateYmd] = stimulus;
    }
    return writeCoachWeekState(mondayYmd, { overrides });
}

/**
 * Move a planned session from one calendar day to another (e.g. Tuesday sweetspot → Monday).
 * @param {string} mondayYmd
 * @param {string} fromDateYmd — original planned date
 * @param {string} toDateYmd — day you will execute it
 */
export function moveSession(mondayYmd, fromDateYmd, toDateYmd) {
    const state = readCoachWeekState(mondayYmd);
    const moves = { ...state.moves };

    if (fromDateYmd === toDateYmd) {
        delete moves[fromDateYmd];
        return writeCoachWeekState(mondayYmd, { moves });
    }

    const conflictingFrom = Object.keys(moves).find(
        (k) => moves[k] === toDateYmd && k !== fromDateYmd,
    );
    if (conflictingFrom) {
        moves[conflictingFrom] = fromDateYmd;
    }

    moves[fromDateYmd] = toDateYmd;
    return writeCoachWeekState(mondayYmd, { moves });
}

export function clearSessionMove(mondayYmd, fromDateYmd) {
    const state = readCoachWeekState(mondayYmd);
    const moves = { ...state.moves };
    delete moves[fromDateYmd];
    return writeCoachWeekState(mondayYmd, { moves });
}

/**
 * Move a future session to today (convenience).
 */
export function moveSessionToToday(mondayYmd, fromDateYmd, todayYmdValue) {
    return moveSession(mondayYmd, fromDateYmd, todayYmdValue);
}

/**
 * Toggle a day as unavailable for training (auto-reschedules sessions in the week plan).
 */
export function toggleUnavailableDate(mondayYmd, dateYmd) {
    const state = readCoachWeekState(mondayYmd);
    const set = new Set(state.unavailableDates);
    const available = new Set(state.availableDates);

    if (set.has(dateYmd)) set.delete(dateYmd);
    else {
        set.add(dateYmd);
        available.delete(dateYmd);
    }

    const moves = { ...state.moves };
    delete moves[dateYmd];
    Object.keys(moves).forEach((from) => {
        if (moves[from] === dateYmd) delete moves[from];
    });

    return writeCoachWeekState(mondayYmd, {
        unavailableDates: [...set],
        availableDates: [...available],
        moves,
    });
}

export function clearUnavailableDates(mondayYmd) {
    return writeCoachWeekState(mondayYmd, { unavailableDates: [] });
}

/**
 * Toggle a rest day as explicitly open for training (used when plan says rest but you can ride).
 */
export function toggleAvailableDate(mondayYmd, dateYmd) {
    const state = readCoachWeekState(mondayYmd);
    const available = new Set(state.availableDates);
    const unavailable = new Set(state.unavailableDates);

    if (available.has(dateYmd)) {
        available.delete(dateYmd);
    } else {
        available.add(dateYmd);
        unavailable.delete(dateYmd);
    }

    return writeCoachWeekState(mondayYmd, {
        availableDates: [...available],
        unavailableDates: [...unavailable],
    });
}

export function clearAvailableDates(mondayYmd) {
    return writeCoachWeekState(mondayYmd, { availableDates: [] });
}

export const COACH_WEEK_UPDATED_EVENT = 'cpl-coach-week-updated';

export function dispatchCoachWeekUpdated() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(COACH_WEEK_UPDATED_EVENT));
    }
}
