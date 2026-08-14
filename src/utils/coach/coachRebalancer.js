/**
 * Fluid week rebalancing when actual training diverges from plan.
 */

const STIMULUS_LADDER = ['vo2', 'threshold', 'sweetspot', 'endurance', 'recovery'];

/**
 * Cap session intensity for training phase (event goal periodisation).
 * @param {object[]} sessions — week skeleton rows
 * @param {string | null | undefined} phaseKey — base | build | specific | taper
 * @param {{ elevationM?: number }} [goalProfile]
 * @param {{ preserveIntensity?: boolean }} [options]
 * @returns {object[]}
 */
export function applyPhaseToWeekSkeleton(sessions, phaseKey, goalProfile = {}, options = {}) {
    if (!sessions?.length || !phaseKey) return sessions;

    const elevationM = Number(goalProfile.elevationM) || 0;
    const preserveIntensity = Boolean(options.preserveIntensity);

    return sessions.map((row) => {
        let stimulus = row.stimulus;

        if (phaseKey === 'taper') {
            if (stimulus === 'vo2' || stimulus === 'threshold') stimulus = 'endurance';
            else if (stimulus === 'sweetspot') stimulus = 'endurance';
        } else if (phaseKey === 'base') {
            if (stimulus === 'vo2') stimulus = 'sweetspot';
            else if (stimulus === 'threshold' && !preserveIntensity) stimulus = 'sweetspot';
        } else if (phaseKey === 'specific') {
            if (elevationM >= 800 && row.day === 'Saturday' && stimulus === 'endurance') {
                stimulus = 'sweetspot';
            }
        }

        if (stimulus === row.stimulus) return row;

        const sessionLabel = {
            endurance: 'Z2 base',
            sweetspot: 'Sweetspot quality',
            threshold: 'Threshold work',
            vo2: 'VO2 intervals',
            recovery: 'Recovery spin',
            rest: 'Rest',
        }[stimulus] || row.session;

        return {
            ...row,
            stimulus,
            session: sessionLabel,
            phaseNote: `Adjusted for ${phaseKey} phase`,
        };
    });
}

/**
 * @param {string} stimulus
 * @returns {string}
 */
export function downgradeStimulus(stimulus) {
    const i = STIMULUS_LADDER.indexOf(stimulus);
    if (i < 0) return 'endurance';
    return i < STIMULUS_LADDER.length - 1 ? STIMULUS_LADDER[i + 1] : 'recovery';
}

/**
 * @param {object} plan
 * @param {object} actual
 * @param {string} todayYmd — ISO date YYYY-MM-DD
 * @returns {object[]}
 */
export function rebalanceWeek(plan, actual, todayYmd) {
    const targetTss = plan.targetTss || 250;
    const tssDelta = (actual.tssThisWeek || 0) - targetTss;
    const remainingDays = (plan.sessions || []).filter((s) => s.date >= todayYmd);

    if (tssDelta > targetTss * 0.15) {
        return remainingDays.map((s) => ({
            ...s,
            stimulus: downgradeStimulus(s.stimulus),
            note: 'Extra load detected this week — easing remaining sessions.',
        }));
    }

    if (tssDelta < -targetTss * 0.2 && (actual.currentTsb ?? 0) > -10) {
        const updated = [...remainingDays];
        const restSlot = updated.find((s) => s.stimulus === 'rest' || s.stimulus === 'recovery');
        if (restSlot) {
            const intensityBiased = actual.intensityBias === 'intensity';
            restSlot.stimulus = intensityBiased ? 'sweetspot' : 'endurance';
            restSlot.note = intensityBiased
                ? 'Room for an extra quality ride if recovery allows.'
                : 'Room for an extra Z2 ride if you feel good.';
        }
        return updated;
    }

    if ((actual.hardSessionsThisWeek || 0) >= 2) {
        return remainingDays.map((s) =>
            ['sweetspot', 'threshold', 'vo2'].includes(s.stimulus)
                ? { ...s, stimulus: 'endurance', note: 'Quality already banked this week.' }
                : s
        );
    }

    return remainingDays;
}

/**
 * Build a simple week skeleton from weekly hours target.
 * @param {number} weeklyHours
 * @param {string} startYmd — Monday of current week (ISO)
 */
export function buildWeekSkeleton(weeklyHours, startYmd) {
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const sessions = [];

    if (weeklyHours <= 4) {
        sessions.push(
            { day: 'Tuesday', date: addDay(startYmd, 1), stimulus: 'endurance', session: 'Z2 base' },
            { day: 'Thursday', date: addDay(startYmd, 3), stimulus: 'sweetspot', session: 'Sweetspot quality' },
            { day: 'Saturday', date: addDay(startYmd, 5), stimulus: 'endurance', session: 'Long Z2' },
        );
    } else if (weeklyHours <= 6) {
        sessions.push(
            { day: 'Tuesday', date: addDay(startYmd, 1), stimulus: 'endurance', session: 'Z2 base' },
            { day: 'Thursday', date: addDay(startYmd, 3), stimulus: 'sweetspot', session: 'Sweetspot quality' },
            { day: 'Saturday', date: addDay(startYmd, 5), stimulus: 'endurance', session: 'Long Z2' },
            { day: 'Sunday', date: addDay(startYmd, 6), stimulus: 'recovery', session: 'Optional recovery' },
        );
    } else {
        sessions.push(
            { day: 'Tuesday', date: addDay(startYmd, 1), stimulus: 'endurance', session: 'Z2 base' },
            { day: 'Thursday', date: addDay(startYmd, 3), stimulus: 'sweetspot', session: 'Sweetspot quality' },
            { day: 'Friday', date: addDay(startYmd, 4), stimulus: 'recovery', session: 'Rest or easy spin' },
            { day: 'Saturday', date: addDay(startYmd, 5), stimulus: 'endurance', session: 'Long Z2' },
            { day: 'Sunday', date: addDay(startYmd, 6), stimulus: 'vo2', session: 'Light VO2 or extra Z2' },
        );
    }

    return dayNames.map((day, idx) => {
        const match = sessions.find((s) => s.day === day);
        return match || { day, date: addDay(startYmd, idx), stimulus: 'rest', session: 'Rest' };
    });
}

function addDay(ymd, days) {
    const [y, m, d] = ymd.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
}
