/**
 * Week-plan calendar layout helpers for Coach fluid week UI.
 */

export const COACH_WEEK_VIEW_STORAGE_KEY = 'cpl.coachWeekView.v1';

export const COACH_WEEK_VIEW_MODES = {
    LIST: 'list',
    CALENDAR: 'calendar',
};

export const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Read persisted week view mode. Fail-safe: always falls back to list view.
 * @returns {'list' | 'calendar'}
 */
export function readCoachWeekViewMode() {
    try {
        const raw = typeof localStorage !== 'undefined'
            ? localStorage.getItem(COACH_WEEK_VIEW_STORAGE_KEY)
            : null;
        if (raw === COACH_WEEK_VIEW_MODES.CALENDAR) {
            return COACH_WEEK_VIEW_MODES.CALENDAR;
        }
    } catch {
        // localStorage unavailable or blocked
    }
    return COACH_WEEK_VIEW_MODES.LIST;
}

/**
 * Persist week view mode. Silently no-ops on failure.
 * @param {'list' | 'calendar'} mode
 */
export function writeCoachWeekViewMode(mode) {
    try {
        if (typeof localStorage === 'undefined') return;
        const safe = mode === COACH_WEEK_VIEW_MODES.CALENDAR
            ? COACH_WEEK_VIEW_MODES.CALENDAR
            : COACH_WEEK_VIEW_MODES.LIST;
        localStorage.setItem(COACH_WEEK_VIEW_STORAGE_KEY, safe);
    } catch {
        // ignore quota / privacy errors
    }
}

/**
 * Extract day-of-month from YYYY-MM-DD.
 * @param {string | null | undefined} ymd
 * @returns {number | null}
 */
export function dayOfMonthFromYmd(ymd) {
    if (!ymd || typeof ymd !== 'string') return null;
    const parts = ymd.split('-');
    if (parts.length !== 3) return null;
    const day = Number(parts[2]);
    return Number.isFinite(day) ? day : null;
}

/**
 * Map a fluid week plan to seven Mon–Sun calendar cells.
 * Sessions are expected in Monday-first order; gaps are padded when needed.
 *
 * @param {{ sessions?: object[] } | null | undefined} weekPlan
 * @returns {Array<{
 *   weekdayLabel: string,
 *   weekdayIndex: number,
 *   session: object | null,
 *   dateYmd: string | null,
 *   dayOfMonth: number | null,
 * }>}
 */
export function buildWeekCalendarCells(weekPlan) {
    const sessions = Array.isArray(weekPlan?.sessions) ? weekPlan.sessions : [];

    if (sessions.length === 0) {
        return WEEKDAY_HEADERS.map((weekdayLabel, weekdayIndex) => ({
            weekdayLabel,
            weekdayIndex,
            session: null,
            dateYmd: null,
            dayOfMonth: null,
        }));
    }

    return sessions.map((session, weekdayIndex) => ({
        weekdayLabel: WEEKDAY_HEADERS[weekdayIndex] || session?.day?.slice(0, 3) || '',
        weekdayIndex,
        session: session || null,
        dateYmd: session?.date || null,
        dayOfMonth: dayOfMonthFromYmd(session?.date),
    }));
}

/**
 * Short label for a calendar cell (stimulus or workout name).
 * @param {object | null | undefined} session
 * @returns {string}
 */
export function calendarCellLabel(session) {
    if (!session) return '';
    if (session.isUnavailable) return 'Blocked';
    if (session.completed) return 'Done';
    if (session.stimulus === 'rest' && session.plannedStimulus === 'rest') return 'Rest';
    if (session.workoutName) {
        const name = String(session.workoutName);
        return name.length > 14 ? `${name.slice(0, 12)}…` : name;
    }
    if (session.stimulus && session.stimulus !== 'rest') {
        return String(session.stimulus);
    }
    return 'Open';
}
