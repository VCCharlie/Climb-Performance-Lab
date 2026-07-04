/**
 * Coachplan op basis van SWOT-metrics: concrete acties, weekindeling, koppelbare .zwo-workouts.
 */

export const COACH_GOAL_OPTIONS = [
    { id: 'auto', label: 'Automatic (data + SWOT)' },
    { id: 'general', label: 'General fitness' },
    { id: 'climb', label: 'Climbing / elevation' },
    { id: 'ceiling', label: 'Ceiling (FTP / VO2)' },
    { id: 'endurance', label: 'Endurance / long rides' },
    { id: 'recovery', label: 'Recovery / rest' },
];

export const COACH_WORKOUT_LIBRARY = {
    z2_recovery_spin: {
        id: 'z2_recovery_spin',
        title: 'Z2: easy endurance spin',
        duration: '60–75 min',
        focus: 'Zone 2 (65% FTP)',
        description: 'Easy pedaling, you can hold a conversation. Builds aerobic base without extra stress.',
        type: 'endurance',
        zwoSteps: [
            { type: 'Warmup', duration: 600, powerLow: 0.50, powerHigh: 0.60 },
            { type: 'SteadyState', duration: 3000, power: 0.65 },
            { type: 'Cooldown', duration: 600, powerLow: 0.60, powerHigh: 0.50 },
        ],
    },
    z2_long_endurance: {
        id: 'z2_long_endurance',
        title: 'Z2: long endurance',
        duration: '3h – 3h30',
        focus: 'Zone 2',
        description: 'Long, easy endurance. Do not sneak into harder zones; fat oxidation and capillaries.',
        type: 'endurance',
        zwoSteps: [
            { type: 'Warmup', duration: 900, powerLow: 0.50, powerHigh: 0.65 },
            { type: 'SteadyState', duration: 3600, power: 0.65 },
            { type: 'SteadyState', duration: 3600, power: 0.65 },
            { type: 'SteadyState', duration: 1800, power: 0.60 },
            { type: 'Cooldown', duration: 900, powerLow: 0.60, powerHigh: 0.50 },
        ],
    },
    sweetspot_2x20: {
        id: 'sweetspot_2x20',
        title: 'Sweetspot 2×20 min',
        duration: '1h 30m',
        focus: '2× 20m @ 90% FTP',
        description: 'Classic block to extend time above threshold without going all out.',
        type: 'interval',
        zwoSteps: [
            { type: 'Warmup', duration: 1200, powerLow: 0.50, powerHigh: 0.75 },
            { type: 'SteadyState', duration: 1200, power: 0.90 },
            { type: 'SteadyState', duration: 300, power: 0.55 },
            { type: 'SteadyState', duration: 1200, power: 0.90 },
            { type: 'Cooldown', duration: 1200, powerLow: 0.70, powerHigh: 0.50 },
        ],
    },
    vo2_4x5: {
        id: 'vo2_4x5',
        title: 'VO2: 4×5 min',
        duration: '1h 30m',
        focus: '4× 5m @ 108% FTP',
        description: 'Short blocks around VO2max. One quality day per week is enough to start.',
        type: 'interval',
        zwoSteps: [
            { type: 'Warmup', duration: 1200, powerLow: 0.50, powerHigh: 0.75 },
            { type: 'SteadyState', duration: 300, power: 1.08 },
            { type: 'SteadyState', duration: 300, power: 0.55 },
            { type: 'SteadyState', duration: 300, power: 1.08 },
            { type: 'SteadyState', duration: 300, power: 0.55 },
            { type: 'SteadyState', duration: 300, power: 1.08 },
            { type: 'SteadyState', duration: 300, power: 0.55 },
            { type: 'SteadyState', duration: 300, power: 1.08 },
            { type: 'Cooldown', duration: 900, powerLow: 0.60, powerHigh: 0.40 },
        ],
    },
    tempo_hills: {
        id: 'tempo_hills',
        title: 'Tempo / hill ride',
        duration: '1h 30m – 2h',
        focus: 'Zone 3 (Tempo)',
        description: 'Outdoors or hill simulation: repeatable climbs at tempo, no sprinting.',
        type: 'interval',
        zwoSteps: [
            { type: 'Warmup', duration: 900, powerLow: 0.50, powerHigh: 0.70 },
            { type: 'SteadyState', duration: 900, power: 0.80 },
            { type: 'SteadyState', duration: 300, power: 0.55 },
            { type: 'SteadyState', duration: 900, power: 0.80 },
            { type: 'SteadyState', duration: 300, power: 0.55 },
            { type: 'SteadyState', duration: 900, power: 0.80 },
            { type: 'Cooldown', duration: 900, powerLow: 0.60, powerHigh: 0.50 },
        ],
    },
    active_recovery: {
        id: 'active_recovery',
        title: 'Active recovery',
        duration: '45–60 min',
        focus: 'Zone 1',
        description: 'Very light. Slightly higher cadence, no acid buildup.',
        type: 'recovery',
        zwoSteps: [{ type: 'SteadyState', duration: 2700, power: 0.50 }],
    },
    over_under_block: {
        id: 'over_under_block',
        title: 'Over-unders around FTP',
        duration: '1h 20m',
        focus: '3× (2m above / 2m below FTP)',
        description: 'Trains lactate clearance under load. Harder than sweetspot.',
        type: 'interval',
        zwoSteps: [
            { type: 'Warmup', duration: 1200, powerLow: 0.50, powerHigh: 0.75 },
            { type: 'IntervalsT', repeat: 3, onDuration: 120, offDuration: 120, onPower: 1.05, offPower: 0.90 },
            { type: 'SteadyState', duration: 300, power: 0.55 },
            { type: 'IntervalsT', repeat: 3, onDuration: 120, offDuration: 120, onPower: 1.05, offPower: 0.90 },
            { type: 'SteadyState', duration: 300, power: 0.55 },
            { type: 'IntervalsT', repeat: 3, onDuration: 120, offDuration: 120, onPower: 1.05, offPower: 0.90 },
            { type: 'Cooldown', duration: 1200, powerLow: 0.70, powerHigh: 0.50 },
        ],
    },
};

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function pickFocus(goalId, flags) {
    if (flags.noData) return 'no_data';
    if (goalId === 'recovery') return 'recovery';
    if (goalId === 'climb') return 'climb';
    if (goalId === 'ceiling') return 'ceiling';
    if (goalId === 'endurance') return 'endurance';
    if (goalId === 'general') return 'balanced';

    if (flags.intensityOverload) return 'recovery_balance';
    if (flags.lowFrequency) return 'consistency';
    if (flags.intensityGap || flags.weakShortPower) return 'ceiling';
    if (flags.fewLongRides) return 'endurance';
    if (flags.lowElevationOpportunity) return 'climb';
    if (flags.mostlyVirtual) return 'outdoor_transfer';
    if (flags.lowWeeklyLoad) return 'volume';
    if (flags.loadTrendDown) return 'rebuild';
    if (flags.loadTrendUp) return 'consolidate';
    return 'balanced';
}

function blueprintForFocus(focus) {
    const w = COACH_WORKOUT_LIBRARY;
    const z2 = w.z2_recovery_spin;
    const z2l = w.z2_long_endurance;
    const sst = w.sweetspot_2x20;
    const vo2 = w.vo2_4x5;
    const tempo = w.tempo_hills;
    const ou = w.over_under_block;
    const rec = w.active_recovery;

    switch (focus) {
        case 'no_data':
            return DAY_NAMES.map((day) => ({
                day,
                session: '—',
                detail: 'No data: add activities in this window first.',
                workoutId: null,
            }));
        case 'recovery':
        case 'recovery_balance':
            return [
                { day: 'Monday', session: 'Rest or walking', detail: 'No cycling or max. 30 min very easy.', workoutId: null },
                { day: 'Tuesday', session: 'Active recovery', detail: rec.title, workoutId: 'active_recovery' },
                { day: 'Wednesday', session: 'Rest', detail: 'Prioritize sleep; no structured load.', workoutId: null },
                { day: 'Thursday', session: 'Short Z2', detail: z2.title, workoutId: 'z2_recovery_spin' },
                { day: 'Friday', session: 'Rest', detail: 'Prepare for the weekend.', workoutId: null },
                { day: 'Saturday', session: 'Light Z2 endurance', detail: 'Max. 90 min, strictly easy.', workoutId: 'z2_recovery_spin' },
                { day: 'Sunday', session: 'Optional Z2', detail: 'Only if you feel fresh.', workoutId: null },
            ];
        case 'consistency':
        case 'volume':
            return [
                { day: 'Monday', session: 'Z2', detail: 'Fixed commitment: keep 60 min achievable.', workoutId: 'z2_recovery_spin' },
                { day: 'Tuesday', session: 'Z2', detail: 'Slightly longer if time allows (75–90 min).', workoutId: 'z2_recovery_spin' },
                { day: 'Wednesday', session: 'Rest / short', detail: 'Max. 45 min Z1–Z2 or off.', workoutId: null },
                { day: 'Thursday', session: 'Z2', detail: 'Repeat Mon–Tue pattern.', workoutId: 'z2_recovery_spin' },
                { day: 'Friday', session: 'Rest', detail: 'Ready for the weekend.', workoutId: null },
                { day: 'Saturday', session: 'Long Z2', detail: z2l.title, workoutId: 'z2_long_endurance' },
                { day: 'Sunday', session: 'Easy Z2', detail: 'Optional 60 min.', workoutId: 'z2_recovery_spin' },
            ];
        case 'ceiling':
            return [
                { day: 'Monday', session: 'Z2', detail: z2.title, workoutId: 'z2_recovery_spin' },
                { day: 'Tuesday', session: 'Rest / light', detail: rec.title, workoutId: 'active_recovery' },
                { day: 'Wednesday', session: 'Sweetspot', detail: sst.title, workoutId: 'sweetspot_2x20' },
                { day: 'Thursday', session: 'Z2', detail: z2.title, workoutId: 'z2_recovery_spin' },
                { day: 'Friday', session: 'Rest', detail: 'Save energy for Saturday quality.', workoutId: null },
                { day: 'Saturday', session: 'VO2', detail: vo2.title, workoutId: 'vo2_4x5' },
                { day: 'Sunday', session: 'Z2 endurance', detail: z2l.title, workoutId: 'z2_long_endurance' },
            ];
        case 'climb':
            return [
                { day: 'Monday', session: 'Z2', detail: z2.title, workoutId: 'z2_recovery_spin' },
                { day: 'Tuesday', session: 'Tempo hills', detail: tempo.title, workoutId: 'tempo_hills' },
                { day: 'Wednesday', session: 'Z2', detail: z2.title, workoutId: 'z2_recovery_spin' },
                { day: 'Thursday', session: 'Over-under or SST', detail: ou.title, workoutId: 'over_under_block' },
                { day: 'Friday', session: 'Rest', detail: 'Or short easy spin.', workoutId: null },
                { day: 'Saturday', session: 'Long Z2 with elevation', detail: 'Outdoors: seek elevation gain.', workoutId: 'z2_long_endurance' },
                { day: 'Sunday', session: 'Z2', detail: 'Recovery ride.', workoutId: 'z2_recovery_spin' },
            ];
        case 'endurance':
            return [
                { day: 'Monday', session: 'Z2', detail: z2.title, workoutId: 'z2_recovery_spin' },
                { day: 'Tuesday', session: 'Z2', detail: 'Slightly longer.', workoutId: 'z2_recovery_spin' },
                { day: 'Wednesday', session: 'Rest', detail: null, workoutId: null },
                { day: 'Thursday', session: 'Z2', detail: z2.title, workoutId: 'z2_recovery_spin' },
                { day: 'Friday', session: 'Short Z2', detail: '45 min', workoutId: 'z2_recovery_spin' },
                { day: 'Saturday', session: 'Long ride', detail: z2l.title, workoutId: 'z2_long_endurance' },
                { day: 'Sunday', session: 'Medium Z2', detail: '75–120 min', workoutId: 'z2_recovery_spin' },
            ];
        case 'outdoor_transfer':
            return [
                { day: 'Monday', session: 'Outdoor Z2', detail: 'Skills, corners, wind.', workoutId: 'z2_recovery_spin' },
                { day: 'Tuesday', session: 'Rest / light indoors', detail: rec.title, workoutId: 'active_recovery' },
                { day: 'Wednesday', session: 'Tempo outdoors', detail: tempo.title, workoutId: 'tempo_hills' },
                { day: 'Thursday', session: 'Z2', detail: z2.title, workoutId: 'z2_recovery_spin' },
                { day: 'Friday', session: 'Rest', detail: null, workoutId: null },
                { day: 'Saturday', session: 'Long outdoor Z2', detail: z2l.title, workoutId: 'z2_long_endurance' },
                { day: 'Sunday', session: 'Z2', detail: z2.title, workoutId: 'z2_recovery_spin' },
            ];
        case 'rebuild':
            return [
                { day: 'Monday', session: 'Short Z2', detail: 'Start building back up.', workoutId: 'z2_recovery_spin' },
                { day: 'Tuesday', session: 'Z2', detail: z2.title, workoutId: 'z2_recovery_spin' },
                { day: 'Wednesday', session: 'Rest', detail: null, workoutId: null },
                { day: 'Thursday', session: 'Light sweetspot', detail: sst.title, workoutId: 'sweetspot_2x20' },
                { day: 'Friday', session: 'Rest', detail: null, workoutId: null },
                { day: 'Saturday', session: 'Z2 endurance', detail: z2l.title, workoutId: 'z2_long_endurance' },
                { day: 'Sunday', session: 'Z2', detail: z2.title, workoutId: 'z2_recovery_spin' },
            ];
        case 'consolidate':
            return [
                { day: 'Monday', session: 'Z2', detail: 'No extra load.', workoutId: 'z2_recovery_spin' },
                { day: 'Tuesday', session: 'Rest', detail: null, workoutId: null },
                { day: 'Wednesday', session: 'Sweetspot', detail: sst.title, workoutId: 'sweetspot_2x20' },
                { day: 'Thursday', session: 'Z2', detail: z2.title, workoutId: 'z2_recovery_spin' },
                { day: 'Friday', session: 'Rest', detail: null, workoutId: null },
                { day: 'Saturday', session: 'Long Z2', detail: z2l.title, workoutId: 'z2_long_endurance' },
                { day: 'Sunday', session: 'Optional Z2', detail: null, workoutId: null },
            ];
        case 'balanced':
        default:
            return [
                { day: 'Monday', session: 'Z2 base', detail: z2.title, workoutId: 'z2_recovery_spin' },
                { day: 'Tuesday', session: 'Sweetspot', detail: sst.title, workoutId: 'sweetspot_2x20' },
                { day: 'Wednesday', session: 'Z2', detail: z2.title, workoutId: 'z2_recovery_spin' },
                { day: 'Thursday', session: 'Rest or active recovery', detail: rec.title, workoutId: 'active_recovery' },
                { day: 'Friday', session: 'Short Z2', detail: '45–60 min', workoutId: 'z2_recovery_spin' },
                { day: 'Saturday', session: 'Long Z2', detail: z2l.title, workoutId: 'z2_long_endurance' },
                { day: 'Sunday', session: 'Optional Z2 / off', detail: 'By feel.', workoutId: null },
            ];
    }
}

function actionsForPlan(focus, metrics, flags) {
    const a = [];
    const tss = Math.round(metrics.avgWeeklyLoad);
    const km = Math.round(metrics.avgKmPerWeek);
    const h = metrics.avgHoursPerWeek.toFixed(1);
    const rw = metrics.ridesPerWeek.toFixed(1);

    if (focus === 'no_data') {
        return [
            'Import or sync activities for the selected date range.',
            'Check that the period (1M / 3M / …) matches your training.',
        ];
    }

    a.push(`Keep your weekly average around ~${tss} TSS/week (currently ~${tss} in ${metrics.periodLabel}) unless you are deliberately planning a rest or build week.`);

    switch (focus) {
        case 'balanced':
            a.push(`You average ~${rw} rides/week and ~${km} km/week — plan 2 clear quality sessions (Tue: sweetspot, Sat: long Z2) and fill the rest with easy Z2.`);
            a.push('Add one concrete calendar block (fixed day + time) so refining your focus is not just a wish.');
            a.push('After each ride, note one line: feel (RPE) and whether you could sustain the intensity — that helps fine-tune next week.');
            break;
        case 'ceiling':
            a.push('Maximum 2 hard days per week; keep 48h between heavy sessions.');
            a.push('If 4×5 min is too hard: start with 3×4 min @ 105% and add 1 rep per week.');
            break;
        case 'climb':
            a.push('Once per week, find a route with ≥400 m climbing or repeat 6–10 min climbs at tempo (no sprinting).');
            a.push('Limit strength work to 20 min after easy rides if your knees tolerate it well.');
            break;
        case 'endurance':
            a.push(`Aim for +15–25% ride time vs. your current ~${h} h/week, spread across 2–3 rides, not in one go.`);
            a.push('Eat and drink on every ride >90 min: 30–60 g carbohydrates per hour as a test.');
            break;
        case 'volume':
        case 'consistency':
            a.push('Priority: a fixed weekly structure (e.g. Tue–Thu–Sat) before speed or wattage.');
            a.push('Better 4× 60 min Z2 than one monster week and then nothing.');
            break;
        case 'recovery_balance':
        case 'recovery':
            a.push('No structured training above 75% FTP this week; prioritize sleep and protein.');
            a.push('Only add quality again next week if HRV/sleep feel normal.');
            break;
        case 'outdoor_transfer':
            a.push('Plan at least one longer outdoor ride with varying cadence and wind.');
            break;
        case 'rebuild':
            a.push('Increase TSS by max. ~10% per week until you are back at your previous weekly average.');
            break;
        case 'consolidate':
            a.push('No extra TSS: maintain volume, optionally drop one hard day to Z2.');
            break;
        default:
            break;
    }

    if (flags.mostlyVirtual && focus !== 'outdoor_transfer' && focus !== 'no_data') {
        a.push('Swap at least one session per week outdoors for skills and real climbing.');
    }
    if (flags.fewLongRides && (focus === 'balanced' || focus === 'general')) {
        a.push(`You had few rides ≥2 h; plan at least ${Math.max(2, Math.round(metrics.weeksInPeriod * 0.25))} h of cumulative Z2 next weekend.`);
    }

    return a.slice(0, 6);
}

function headlineForFocus(focus, goalId) {
    const goal = COACH_GOAL_OPTIONS.find((g) => g.id === goalId);
    const suffix = goalId !== 'auto' && goal ? ` (goal: ${goal.label})` : '';
    const map = {
        no_data: 'Data first, then plan',
        recovery: 'Week: prioritize recovery',
        recovery_balance: 'Week: dial back intensity',
        consistency: 'Week: habit and frequency',
        volume: 'Week: build volume',
        ceiling: 'Week: ceiling / quality',
        climb: 'Week: climb-specific',
        endurance: 'Week: extend endurance',
        outdoor_transfer: 'Week: outdoor & transfer',
        rebuild: 'Week: rebuild training load',
        consolidate: 'Week: hold and recover',
        balanced: 'Week: balanced (Z2 + quality)',
    };
    return (map[focus] || map.balanced) + suffix;
}

/**
 * @param {object} params
 * @param {object} params.metrics — ruwe cijfers uit SWOT-useMemo
 * @param {object} params.flags — boolean flags
 * @param {string} params.goalId — 'auto' | id uit COACH_GOAL_OPTIONS
 */
export function buildCoachPlan({ metrics, flags, goalId }) {
    const focus = pickFocus(goalId, flags);
    const weekPlan = blueprintForFocus(focus);
    const actions = actionsForPlan(focus, metrics, flags);
    const headline = headlineForFocus(focus, goalId);

    // ⚡ Bolt Optimization: Use single-pass loops instead of chained .map().filter()
    const workoutIdSet = new Set();
    for (const d of weekPlan) {
        if (d.workoutId) workoutIdSet.add(d.workoutId);
    }
    const workouts = [];
    for (const id of workoutIdSet) {
        const workout = COACH_WORKOUT_LIBRARY[id];
        if (workout) workouts.push(workout);
    }

    return {
        focus,
        headline,
        actions,
        weekPlan,
        workouts,
    };
}
