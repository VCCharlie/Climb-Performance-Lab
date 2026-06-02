/**
 * Coachplan op basis van SWOT-metrics: concrete acties, weekindeling, koppelbare .zwo-workouts.
 */

export const COACH_GOAL_OPTIONS = [
    { id: 'auto', label: 'Automatisch (data + SWOT)' },
    { id: 'general', label: 'Algemene conditie' },
    { id: 'climb', label: 'Klimmen / hoogtemeters' },
    { id: 'ceiling', label: 'Plafond (FTP / VO2)' },
    { id: 'endurance', label: 'Duur / lange ritten' },
    { id: 'recovery', label: 'Herstel / rust' },
];

export const COACH_WORKOUT_LIBRARY = {
    z2_recovery_spin: {
        id: 'z2_recovery_spin',
        title: 'Z2: rustig duurloopje',
        duration: '60–75 min',
        focus: 'Zone 2 (65% FTP)',
        description: 'Rustig pedaleren, hoorbaar praten. Bouwt aerobe basis zonder extra stress.',
        type: 'endurance',
        zwoSteps: [
            { type: 'Warmup', duration: 600, powerLow: 0.50, powerHigh: 0.60 },
            { type: 'SteadyState', duration: 3000, power: 0.65 },
            { type: 'Cooldown', duration: 600, powerLow: 0.60, powerHigh: 0.50 },
        ],
    },
    z2_long_endurance: {
        id: 'z2_long_endurance',
        title: 'Z2: lange duur',
        duration: '3u – 3u30',
        focus: 'Zone 2',
        description: 'Lange, rustige duur. Niet stiekem harder; vetverbranding en capillairen.',
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
        duration: '1u 30m',
        focus: '2× 20m @ 90% FTP',
        description: 'Klassiek blok om tijd boven drempel te verlengen zonder full gas.',
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
        duration: '1u 30m',
        focus: '4× 5m @ 108% FTP',
        description: 'Korte blokken rond VO2max. Eén kwaliteitsdag per week is genoeg om te starten.',
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
        title: 'Tempo / heuvelrit',
        duration: '1u 30m – 2u',
        focus: 'Zone 3 (Tempo)',
        description: 'Buiten of helling-simulatie: herhaalbare klimmen in tempo, geen sprint.',
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
        title: 'Actief herstel',
        duration: '45–60 min',
        focus: 'Zone 1',
        description: 'Zeer licht. Cadans iets hoger, geen verzuring.',
        type: 'recovery',
        zwoSteps: [{ type: 'SteadyState', duration: 2700, power: 0.50 }],
    },
    over_under_block: {
        id: 'over_under_block',
        title: 'Over-unders rond FTP',
        duration: '1u 20m',
        focus: '3× (2m boven / 2m onder FTP)',
        description: 'Leert lactaat afvoeren bij hoge belasting. Zwaarder dan sweetspot.',
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

const DAY_NAMES = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];

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
                detail: 'Geen gegevens: eerst activiteiten in dit venster.',
                workoutId: null,
            }));
        case 'recovery':
        case 'recovery_balance':
            return [
                { day: 'Maandag', session: 'Rust of wandelen', detail: 'Geen fiets of max. 30 min heel licht.', workoutId: null },
                { day: 'Dinsdag', session: 'Actief herstel', detail: rec.title, workoutId: 'active_recovery' },
                { day: 'Woensdag', session: 'Rust', detail: 'Slaap voorrang; geen structurele load.', workoutId: null },
                { day: 'Donderdag', session: 'Z2 kort', detail: z2.title, workoutId: 'z2_recovery_spin' },
                { day: 'Vrijdag', session: 'Rust', detail: 'Voorbereiding op weekend.', workoutId: null },
                { day: 'Zaterdag', session: 'Z2 duur (licht)', detail: 'Max. 90 min, strikt rustig.', workoutId: 'z2_recovery_spin' },
                { day: 'Zondag', session: 'Optioneel Z2', detail: 'Alleen als je je fris voelt.', workoutId: null },
            ];
        case 'consistency':
        case 'volume':
            return [
                { day: 'Maandag', session: 'Z2', detail: 'Vaste afspraak: 60 min haalbaar houden.', workoutId: 'z2_recovery_spin' },
                { day: 'Dinsdag', session: 'Z2', detail: 'Iets langer indien tijd (75–90 min).', workoutId: 'z2_recovery_spin' },
                { day: 'Woensdag', session: 'Rust / kort', detail: 'Max. 45 min Z1–Z2 of vrij.', workoutId: null },
                { day: 'Donderdag', session: 'Z2', detail: 'Herhaal Ma-di patroon.', workoutId: 'z2_recovery_spin' },
                { day: 'Vrijdag', session: 'Rust', detail: 'Klaar voor weekend.', workoutId: null },
                { day: 'Zaterdag', session: 'Lange Z2', detail: z2l.title, workoutId: 'z2_long_endurance' },
                { day: 'Zondag', session: 'Z2 vrij', detail: 'Optioneel 60 min.', workoutId: 'z2_recovery_spin' },
            ];
        case 'ceiling':
            return [
                { day: 'Maandag', session: 'Z2', detail: z2.title, workoutId: 'z2_recovery_spin' },
                { day: 'Dinsdag', session: 'Rust / licht', detail: rec.title, workoutId: 'active_recovery' },
                { day: 'Woensdag', session: 'Sweetspot', detail: sst.title, workoutId: 'sweetspot_2x20' },
                { day: 'Donderdag', session: 'Z2', detail: z2.title, workoutId: 'z2_recovery_spin' },
                { day: 'Vrijdag', session: 'Rust', detail: 'Voor kwaliteit zaterdag.', workoutId: null },
                { day: 'Zaterdag', session: 'VO2', detail: vo2.title, workoutId: 'vo2_4x5' },
                { day: 'Zondag', session: 'Z2 duur', detail: z2l.title, workoutId: 'z2_long_endurance' },
            ];
        case 'climb':
            return [
                { day: 'Maandag', session: 'Z2', detail: z2.title, workoutId: 'z2_recovery_spin' },
                { day: 'Dinsdag', session: 'Tempo heuvels', detail: tempo.title, workoutId: 'tempo_hills' },
                { day: 'Woensdag', session: 'Z2', detail: z2.title, workoutId: 'z2_recovery_spin' },
                { day: 'Donderdag', session: 'Over-under of SST', detail: ou.title, workoutId: 'over_under_block' },
                { day: 'Vrijdag', session: 'Rust', detail: 'Of kort losrijden.', workoutId: null },
                { day: 'Zaterdag', session: 'Lange Z2 met hm', detail: 'Buiten: zoek hoogtemeters.', workoutId: 'z2_long_endurance' },
                { day: 'Zondag', session: 'Z2', detail: 'Herstelrit.', workoutId: 'z2_recovery_spin' },
            ];
        case 'endurance':
            return [
                { day: 'Maandag', session: 'Z2', detail: z2.title, workoutId: 'z2_recovery_spin' },
                { day: 'Dinsdag', session: 'Z2', detail: 'Iets langer.', workoutId: 'z2_recovery_spin' },
                { day: 'Woensdag', session: 'Rust', detail: null, workoutId: null },
                { day: 'Donderdag', session: 'Z2', detail: z2.title, workoutId: 'z2_recovery_spin' },
                { day: 'Vrijdag', session: 'Kort Z2', detail: '45 min', workoutId: 'z2_recovery_spin' },
                { day: 'Zaterdag', session: 'Lange rit', detail: z2l.title, workoutId: 'z2_long_endurance' },
                { day: 'Zondag', session: 'Z2 middel', detail: '75–120 min', workoutId: 'z2_recovery_spin' },
            ];
        case 'outdoor_transfer':
            return [
                { day: 'Maandag', session: 'Buiten Z2', detail: 'Techniek, bochten, wind.', workoutId: 'z2_recovery_spin' },
                { day: 'Dinsdag', session: 'Rust / binnen licht', detail: rec.title, workoutId: 'active_recovery' },
                { day: 'Woensdag', session: 'Tempo buiten', detail: tempo.title, workoutId: 'tempo_hills' },
                { day: 'Donderdag', session: 'Z2', detail: z2.title, workoutId: 'z2_recovery_spin' },
                { day: 'Vrijdag', session: 'Rust', detail: null, workoutId: null },
                { day: 'Zaterdag', session: 'Lange buiten-Z2', detail: z2l.title, workoutId: 'z2_long_endurance' },
                { day: 'Zondag', session: 'Z2', detail: z2.title, workoutId: 'z2_recovery_spin' },
            ];
        case 'rebuild':
            return [
                { day: 'Maandag', session: 'Z2 kort', detail: 'Start weer opbouwen.', workoutId: 'z2_recovery_spin' },
                { day: 'Dinsdag', session: 'Z2', detail: z2.title, workoutId: 'z2_recovery_spin' },
                { day: 'Woensdag', session: 'Rust', detail: null, workoutId: null },
                { day: 'Donderdag', session: 'Sweetspot licht', detail: sst.title, workoutId: 'sweetspot_2x20' },
                { day: 'Vrijdag', session: 'Rust', detail: null, workoutId: null },
                { day: 'Zaterdag', session: 'Z2 duur', detail: z2l.title, workoutId: 'z2_long_endurance' },
                { day: 'Zondag', session: 'Z2', detail: z2.title, workoutId: 'z2_recovery_spin' },
            ];
        case 'consolidate':
            return [
                { day: 'Maandag', session: 'Z2', detail: 'Geen extra load.', workoutId: 'z2_recovery_spin' },
                { day: 'Dinsdag', session: 'Rust', detail: null, workoutId: null },
                { day: 'Woensdag', session: 'Sweetspot', detail: sst.title, workoutId: 'sweetspot_2x20' },
                { day: 'Donderdag', session: 'Z2', detail: z2.title, workoutId: 'z2_recovery_spin' },
                { day: 'Vrijdag', session: 'Rust', detail: null, workoutId: null },
                { day: 'Zaterdag', session: 'Z2 lang', detail: z2l.title, workoutId: 'z2_long_endurance' },
                { day: 'Zondag', session: 'Optioneel Z2', detail: null, workoutId: null },
            ];
        case 'balanced':
        default:
            return [
                { day: 'Maandag', session: 'Z2 basis', detail: z2.title, workoutId: 'z2_recovery_spin' },
                { day: 'Dinsdag', session: 'Sweetspot', detail: sst.title, workoutId: 'sweetspot_2x20' },
                { day: 'Woensdag', session: 'Z2', detail: z2.title, workoutId: 'z2_recovery_spin' },
                { day: 'Donderdag', session: 'Rust of actief herstel', detail: rec.title, workoutId: 'active_recovery' },
                { day: 'Vrijdag', session: 'Z2 kort', detail: '45–60 min', workoutId: 'z2_recovery_spin' },
                { day: 'Zaterdag', session: 'Lange Z2', detail: z2l.title, workoutId: 'z2_long_endurance' },
                { day: 'Zondag', session: 'Optioneel Z2 / vrij', detail: 'Na gevoel.', workoutId: null },
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
            'Importeer of sync activiteiten voor het gekozen datumbereik.',
            'Controleer of de periode (1M / 3M / …) overeenkomt met je training.',
        ];
    }

    a.push(`Houd deze week je gemiddelde richting ~${tss} TSS/week (nu ~${tss} in ${metrics.periodLabel}), tenzij je bewust een rust- of opbouweek plant.`);

    switch (focus) {
        case 'balanced':
            a.push(`Je zit rond ${rw}× fietsen/week en ~${km} km/week — plan 2 duidelijke kwaliteitsmomenten (di: sweetspot, za: lange Z2) en vul de rest met lichte Z2.`);
            a.push('Voeg 1 concrete afspraak in je agenda (vaste dag + tijd) zodat “verfijn focus” geen wens blijft.');
            a.push('Noteer na elke rit 1 zin: gevoel (RPE) en of je de intensiteit kon volhouden — dat helpt volgende week bijsturen.');
            break;
        case 'ceiling':
            a.push('Maximaal 2 harde dagen per week; 48h tussen zware sessies aanhouden.');
            a.push('Als 4×5 min te zwaar is: begin met 3×4 min @ 105% en bouw per week 1 rep toe.');
            break;
        case 'climb':
            a.push('Zoek 1× per week een route met ≥400 hm of herhaal 6–10 min hellingen in tempo (niet sprinten).');
            a.push('Houd krachttraining beperkt tot 20 min na lichte ritten als je knieën dat goed tolereren.');
            break;
        case 'endurance':
            a.push(`Streef naar +15–25% rijtijd vs. je huidige ~${h} u/week, verspreid over 2–3 ritten, niet in één keer.`);
            a.push('Eet en drink tijdens elke rit >90 min: 30–60 g koolhydraten per uur als test.');
            break;
        case 'volume':
        case 'consistency':
            a.push('Prioriteit: vaste weekstructuur (bv. di-do-za) vóór snelheid of wattages.');
            a.push('Liever 4× 60 min Z2 dan 1× monsterweek en daarna niets.');
            break;
        case 'recovery_balance':
        case 'recovery':
            a.push('Geen structurele training boven 75% FTP deze week; slaap en eiwit voorrang.');
            a.push('Pas pas volgende week weer kwaliteit toe als HRV/slaap normaal aanvoelen.');
            break;
        case 'outdoor_transfer':
            a.push('Plan minstens één langere buitenrit met variërende cadans en wind.');
            break;
        case 'rebuild':
            a.push('Verhoog TSS max. ~10% per week tot je weer op je oude weekgemiddelde zit.');
            break;
        case 'consolidate':
            a.push('Geen extra TSS erbij: behoud volume, verlaag eventueel één harde dag naar Z2.');
            break;
        default:
            break;
    }

    if (flags.mostlyVirtual && focus !== 'outdoor_transfer' && focus !== 'no_data') {
        a.push('Wissel minstens één sessie per week naar buiten voor techniek en echte beklimming.');
    }
    if (flags.fewLongRides && (focus === 'balanced' || focus === 'general')) {
        a.push(`Je had weinig ritten ≥2 u; plan komend weekend minstens ${Math.max(2, Math.round(metrics.weeksInPeriod * 0.25))}u Z2 cumulatief.`);
    }

    return a.slice(0, 6);
}

function headlineForFocus(focus, goalId) {
    const goal = COACH_GOAL_OPTIONS.find((g) => g.id === goalId);
    const suffix = goalId !== 'auto' && goal ? ` (doel: ${goal.label})` : '';
    const map = {
        no_data: 'Eerst data, dan plan',
        recovery: 'Week: herstel voorrang',
        recovery_balance: 'Week: intensiteit terugschroeven',
        consistency: 'Week: gewoonte en frequentie',
        volume: 'Week: volume opbouwen',
        ceiling: 'Week: plafond / kwaliteit',
        climb: 'Week: klimspecifiek',
        endurance: 'Week: duur uitbreiden',
        outdoor_transfer: 'Week: buiten & transfer',
        rebuild: 'Week: belasting weer opbouwen',
        consolidate: 'Week: vasthouden en herstellen',
        balanced: 'Week: gebalanceerd (Z2 + kwaliteit)',
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
