/**
 * Local persistence for coach week completion and manual overrides.
 */

const STORAGE_KEY = 'coachWeekState_v1';

function isoWeekKey(ymd) {
    const [y, m, d] = ymd.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setHours(12, 0, 0, 0);
    const day = dt.getDay() || 7;
    dt.setDate(dt.getDate() + 4 - day);
    const yearStart = new Date(dt.getFullYear(), 0, 1);
    const week = Math.ceil((((dt - yearStart) / 86400000) + 1) / 7);
    return `${dt.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function readRaw() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function writeRaw(state) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        /* quota */
    }
}

/**
 * @param {string} mondayYmd
 * @returns {{ weekKey: string, completedDates: string[], overrides: Record<string, string>, moves: Record<string, string> }}
 */
export function readCoachWeekState(mondayYmd) {
    const weekKey = isoWeekKey(mondayYmd);
    const raw = readRaw();
    if (!raw || raw.weekKey !== weekKey) {
        return { weekKey, completedDates: [], overrides: {}, moves: {} };
    }
    return {
        weekKey,
        completedDates: Array.isArray(raw.completedDates) ? raw.completedDates : [],
        overrides: raw.overrides && typeof raw.overrides === 'object' ? raw.overrides : {},
        moves: raw.moves && typeof raw.moves === 'object' ? raw.moves : {},
    };
}

/**
 * @param {string} mondayYmd
 * @param {{ completedDates?: string[], overrides?: Record<string, string>, moves?: Record<string, string> }} patch
 */
export function writeCoachWeekState(mondayYmd, patch) {
    const current = readCoachWeekState(mondayYmd);
    const next = {
        weekKey: current.weekKey,
        completedDates: patch.completedDates ?? current.completedDates,
        overrides: patch.overrides ?? current.overrides,
        moves: patch.moves ?? current.moves,
    };
    writeRaw(next);
    return next;
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

    // If another session already targets toDate, swap back to fromDate
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
export function moveSessionToToday(mondayYmd, fromDateYmd, todayYmd) {
    return moveSession(mondayYmd, fromDateYmd, todayYmd);
}

export const COACH_WEEK_UPDATED_EVENT = 'cpl-coach-week-updated';

export function dispatchCoachWeekUpdated() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(COACH_WEEK_UPDATED_EVENT));
    }
}
