import React, { useMemo, useState } from 'react';
import { Brain, TrendingUp, AlertTriangle, Calendar, CheckCircle, Activity, Battery, Download, Target, ListChecks, GitCompareArrows } from 'lucide-react';
import { buildCoachPlan, COACH_GOAL_OPTIONS, COACH_WORKOUT_LIBRARY } from '../utils/swotCoachPlan';
import { buildPeriodComparison } from '../utils/swotPeriodCompare';

/** moving_time: seconden (number) of "H:MM:SS" uit CSV */
function movingTimeToSeconds(val) {
    if (val == null) return 0;
    if (typeof val === 'number' && !Number.isNaN(val)) return val;
    if (typeof val === 'string') {
        const parts = val.split(':').map((p) => Number(p));
        if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        const n = parseFloat(val.replace(',', '.'));
        return Number.isNaN(n) ? 0 : n;
    }
    return 0;
}

function formatVsPrimaryPct(pct) {
    if (pct == null || Number.isNaN(pct)) return '—';
    const sign = pct > 0 ? '+' : '';
    return `${sign}${Math.round(pct)}% t.o.v. gekozen periode`;
}

const AICoach = ({ activities, userSettings, startDate, endDate }) => {

    const [coachGoalId, setCoachGoalId] = useState('auto');

    // --- 1. SWOT ENGINE (Expanded Context) ---
    const swot = useMemo(() => {
        const endD = endDate ? new Date(endDate) : new Date();
        const startD = startDate ? new Date(startDate) : (() => {
            const d = new Date(endD);
            d.setDate(d.getDate() - 30);
            return d;
        })();

        const periodActivities = activities.filter(a => {
            const d = new Date(a.date);
            return d >= startD && d <= endD;
        });

        const periodDays = Math.max(1, (endD - startD) / (1000 * 60 * 60 * 24));
        const weeksInPeriod = Math.max(1, periodDays / 7);
        const ftp = Number(userSettings?.ftp) || 0;

        // Drempelwaarden schalen naar de periodelengte (basisreferentie = 30 dagen)
        const consistencyHigh = Math.round(12 * periodDays / 30);  // >3x/week
        const consistencyLow  = Math.round(4  * periodDays / 30);  // <2x/week
        const intensityHigh   = Math.round(8  * periodDays / 30);  // te veel intensiteit
        const intensityLow    = Math.round(2  * periodDays / 30);  // te weinig intensiteit

        const fmtOpts = { day: 'numeric', month: 'short', year: 'numeric' };
        const periodLabel = (startDate || endDate)
            ? `${startD.toLocaleDateString('nl-NL', fmtOpts)} – ${endD.toLocaleDateString('nl-NL', fmtOpts)}`
            : 'afgelopen 30 dagen';

        const periodScope =
            periodDays < 45 ? 'korte' : periodDays < 400 ? 'middellange' : 'lange';

        const periodComparison = buildPeriodComparison(activities, startD, endD, ftp);

        const strengths = [];
        const weaknesses = [];
        const opportunities = [];
        const threats = [];

        const recentLoad = periodActivities.reduce((acc, curr) => acc + (curr.load || 0), 0);
        const avgWeeklyLoad = recentLoad / weeksInPeriod;
        const ridesPerWeek = periodActivities.length / weeksInPeriod;

        const totalKm = periodActivities.reduce((acc, a) => acc + (Number(a.distance) || 0), 0);
        const totalElev = periodActivities.reduce((acc, a) => acc + (Number(a.climbing) || 0), 0);
        const totalSeconds = periodActivities.reduce((acc, a) => acc + movingTimeToSeconds(a.moving_time), 0);
        const avgKmPerWeek = totalKm / weeksInPeriod;
        const avgHoursPerWeek = totalSeconds / weeksInPeriod / 3600;
        const avgElevPerWeek = totalElev / weeksInPeriod;

        const virtualCount = periodActivities.filter((a) =>
            String(a.type || '').toLowerCase().includes('virtual')
        ).length;

        const LONG_RIDE_SEC = 2 * 3600;
        const longRideCount = periodActivities.filter(
            (a) => movingTimeToSeconds(a.moving_time) >= LONG_RIDE_SEC
        ).length;
        const expectedLongRidesLo = Math.max(1, Math.floor(weeksInPeriod * 0.2));

        // Consistency Check
        if (periodActivities.length >= consistencyHigh) {
            strengths.push({
                label: "Hoge consistentie",
                context: `Je hebt ${periodActivities.length} keer getraind in de ${periodLabel} (>3x/week). Consistentie is de belangrijkste factor voor mitochondriële aanpassing en aerobe basis.`
            });
        } else if (periodActivities.length < consistencyLow) {
            weaknesses.push({
                label: "Lage frequentie",
                context: `Slechts ${periodActivities.length} ritten in de ${periodLabel}. Zonder regelmatige prikkels (minimaal 2-3x per week) zal je conditie stagneren of achteruitgaan.`
            });
        }

        // Load Trend (TSB proxy)
        if (avgWeeklyLoad > 400) {
            strengths.push({
                label: "Sterke basisconditie (CTL)",
                context: `Je gemiddelde weekload is ${Math.round(avgWeeklyLoad)} TSS. Dit duidt op een solide 'Chronic Training Load' (CTL), wat betekent dat je lichaam goed belastbaar is voor zwaardere blokken.`
            });
        } else if (avgWeeklyLoad < 100) {
            opportunities.push({
                label: "Ruimte voor volumeverhoging",
                context: `Met een load van slechts ${Math.round(avgWeeklyLoad)} TSS/week heb je nog veel ruimte om progressie te boeken door simpelweg meer volume of frequentie toe te voegen.`
            });
        }

        // Intensity Distribution
        const highIntensity = ftp > 0
            ? periodActivities.filter((a) => (a.norm_power || 0) > ftp * 0.9).length
            : 0;
        if (ftp > 0 && highIntensity > intensityHigh) {
            threats.push({
                label: "Monotony & Burnout Risico",
                context: `Je hebt ${highIntensity} zware sessies (>90% FTP) gedaan in de ${periodLabel}. Te veel intensiteit zonder rustige duurtraining leidt tot een plateau en verhoogt het risico op overtraining.`
            });
        }
        if (ftp > 0 && highIntensity < intensityLow) {
            weaknesses.push({
                label: "Gebrek aan intensiteit",
                context: `In de ${periodLabel} zaten maar weinig sessies boven ~90% FTP (${highIntensity}×, terwijl we bij deze periode minstens ~${intensityLow} zouden verwachten voor een volledig profiel). Voor een hoger plafond (VO2) heb je gerichte intervalprikkels nodig.`
            });
        }

        // Power Profile (Best 5m)
        const best5m = periodActivities.length
            ? Math.max(...periodActivities.map((a) => a.best_5min || 0))
            : 0;
        if (ftp > 0 && best5m > ftp * 1.15) {
            strengths.push({
                label: "Sterke VO2 Max Engine",
                context: `Je 5-minuten power is ${best5m}W, wat erg sterk is t.o.v. je FTP. Dit wijst op een goed ontwikkelde aerobe capaciteit. Je zou dit kunnen uitbuiten in korte, steile beklimmingen.`
            });
        } else if (ftp > 0 && best5m > 0 && best5m < ftp * 0.92 && periodActivities.length >= 3) {
            weaknesses.push({
                label: "Beperkte korte power",
                context: `Je beste 5 min in deze periode is ${best5m}W vs FTP ${ftp}W. Dat wijst op weinig training rond VO2/threshold-boven. Korte blokken boven FTP kunnen je plafond helpen verhogen.`
            });
        }

        // Volume / duur (periode-afhankelijk)
        if (periodActivities.length >= 3 && avgKmPerWeek < 35 && avgWeeklyLoad >= 80) {
            opportunities.push({
                label: "Meer duur-kilometers",
                context: `Je rijdt ~${Math.round(avgKmPerWeek)} km/week over ${periodLabel} terwijl de TSS al redelijk is — vaak zitten hier korte of virtuele ritten achter. Meer continue duur kan je aerobe efficiëntie versterken.`
            });
        }

        if (weeksInPeriod >= 3 && longRideCount < expectedLongRidesLo && periodActivities.length >= 4) {
            weaknesses.push({
                label: "Weinig lange ritten",
                context: `In ~${Math.round(weeksInPeriod)} weken heb je ${longRideCount}× ≥2u gereden (verwacht minstens ~${expectedLongRidesLo} voor een uitgebalanceerd duurprofiel). Plan af en toe een langere Z2-rit.`
            });
        }

        if (periodActivities.length >= 5 && virtualCount / periodActivities.length > 0.65) {
            threats.push({
                label: "Zwaar virtueel",
                context: `${virtualCount} van ${periodActivities.length} sessies zijn virtueel. Dat kan prima, maar te weinig buiten (variatie, techniek, wind) beperkt transfer naar echte beklimmingen.`
            });
        }

        if (periodActivities.length >= 4 && avgElevPerWeek < 200 && avgKmPerWeek > 50) {
            opportunities.push({
                label: "Meer hoogtemeters",
                context: `Gemiddeld ~${Math.round(avgElevPerWeek)} hm/week in deze periode bij ${Math.round(avgKmPerWeek)} km/week — relatief vlak. Heuvels en herhaalde beklimmingen trainen kracht-uithouding specifiek voor klimmen.`
            });
        }

        let loadTrendUp = false;
        let loadTrendDown = false;
        let tssFirstHalf = null;
        let tssSecondHalf = null;

        // Trend eerste vs tweede helft (alleen zinvol bij langere periodes)
        if (periodDays >= 56 && periodActivities.length >= 8) {
            const midMs = (startD.getTime() + endD.getTime()) / 2;
            let firstLoad = 0;
            let secondLoad = 0;
            const firstWeeks = Math.max(1, (midMs - startD.getTime()) / (7 * 24 * 60 * 60 * 1000));
            const secondWeeks = Math.max(1, (endD.getTime() - midMs) / (7 * 24 * 60 * 60 * 1000));
            periodActivities.forEach((a) => {
                const t = new Date(a.date).getTime();
                const L = a.load || 0;
                if (t < midMs) firstLoad += L;
                else secondLoad += L;
            });
            const tssW1 = firstLoad / firstWeeks;
            const tssW2 = secondLoad / secondWeeks;
            tssFirstHalf = tssW1;
            tssSecondHalf = tssW2;
            if (tssW2 > tssW1 * 1.15) {
                loadTrendUp = true;
                opportunities.push({
                    label: "Oplopende weekload",
                    context: `In de tweede helft van ${periodLabel} ligt je gemiddelde TSS/week (~${Math.round(tssW2)}) duidelijk hoger dan in de eerste (~${Math.round(tssW1)}). Je zit in opbouw — plan herstel zodra prestatie of motivatie zakt.`
                });
            } else if (tssW1 > tssW2 * 1.15) {
                loadTrendDown = true;
                threats.push({
                    label: "Afnemende belasting",
                    context: `Je TSS/week was hoger in de eerste helft (~${Math.round(tssW1)}) dan in de tweede (~${Math.round(tssW2)}) van ${periodLabel}. Als dat geen bewuste rustfase is, dreigt detraining of onderliggende vermoeidheid.`
                });
            }
        }

        // Tweede tijdssnede: trend vs direct vorig blok + vs rollend jaar (zonder huidige periode)
        if (periodActivities.length > 0) {
            for (const x of periodComparison.swotExtras) {
                if (x.quadrant === 'strengths') strengths.push({ label: x.label, context: x.context });
                else if (x.quadrant === 'weaknesses') weaknesses.push({ label: x.label, context: x.context });
                else if (x.quadrant === 'opportunities') opportunities.push({ label: x.label, context: x.context });
                else if (x.quadrant === 'threats') threats.push({ label: x.label, context: x.context });
            }
        }

        // Lege dataset: eigen SWOT i.p.v. generieke fillers met nul-cijfers
        if (periodActivities.length === 0) {
            return {
                strengths: [{
                    label: "Geen data om te beoordelen",
                    context: `Er zijn geen activiteiten in ${periodLabel}. Kies een andere datumrange of importeer/sync je training — dan kan de coach patronen zien.`
                }],
                weaknesses: [{
                    label: "Analyse niet mogelijk",
                    context: "Zonder ritten in dit venster kunnen we geen zwaktes afleiden uit je logs. Controleer of je filter (1M, 3M, …) klopt met je import."
                }],
                opportunities: [{
                    label: "Start met loggen",
                    context: "Zodra er activiteiten in deze periode staan, verschijnen hier concrete kansen (volume, intensiteit, duur) afgestemd op je gekozen range."
                }],
                threats: [{
                    label: "Blind vliegen",
                    context: "Zonder data in het gekozen venster mis je signalen (te weinig rust, te veel harde dagen). Gebruik een periode waarin je wél hebt getraind."
                }],
                avgWeeklyLoad: 0,
                periodLabel,
                coachMetrics: {
                    periodLabel,
                    periodDays,
                    weeksInPeriod,
                    avgWeeklyLoad: 0,
                    ridesPerWeek: 0,
                    avgKmPerWeek: 0,
                    avgHoursPerWeek: 0,
                    avgElevPerWeek: 0,
                    rideCount: 0,
                    tssFirstHalf,
                    tssSecondHalf,
                },
                coachFlags: { noData: true },
                periodComparison,
            };
        }

        // Fillers: periodespecifiek i.p.v. identieke boilerplate
        if (strengths.length === 0) {
            strengths.push({
                label: "Geen opvallende pluspunten",
                context: `Over ${periodLabel} (${periodScope} venster) vallen er geen duidelijke sterktes op volgens de huidige regels. Dat betekent vooral: geen extreme patronen — vergelijk met een kortere periode voor recente trends.`
            });
        }
        if (weaknesses.length === 0) {
            weaknesses.push({
                label: "Geen duidelijke zwakte",
                context: `In ${periodLabel}: ${periodActivities.length} ritten, ~${ridesPerWeek.toFixed(1)}×/week, ~${Math.round(avgWeeklyLoad)} TSS/week, ~${Math.round(avgKmPerWeek)} km/week, ~${avgHoursPerWeek.toFixed(1)} u/week. Geen rode vlag op frequentie, intensiteit of korte power — je zit in het midden van het profiel.`
            });
        }
        if (opportunities.length === 0) {
            opportunities.push({
                label: "Verfijn je focus",
                context: `Met ~${Math.round(avgWeeklyLoad)} TSS/week over ${periodLabel} is er geen simpele 'hefboom' (te weinig volume of te weinig intensiteit). Kies bewust één doel: meer structuur, specifieke klimtraining, of een rustweek — afhankelijk van wat je buiten deze cijfers voelt.`
            });
        }
        if (threats.length === 0) {
            threats.push({
                label: "Geen harde risico's in data",
                context: `We zien geen overlading aan harde sessies (${highIntensity}× >90% FTP, drempel ~${intensityHigh} voor deze periode). Bij ${periodDays < 60 ? 'korte' : 'langere'} periodes: blijf opletten op opeenstapeling van zware weken en slaap/stress buiten het zadel.`
            });
        }

        const coachMetrics = {
            periodLabel,
            periodDays,
            weeksInPeriod,
            avgWeeklyLoad,
            ridesPerWeek,
            avgKmPerWeek,
            avgHoursPerWeek,
            avgElevPerWeek,
            rideCount: periodActivities.length,
            tssFirstHalf,
            tssSecondHalf,
        };

        const coachFlags = {
            noData: false,
            lowFrequency: periodActivities.length < consistencyLow,
            intensityOverload: ftp > 0 && highIntensity > intensityHigh,
            intensityGap: ftp > 0 && highIntensity < intensityLow,
            weakShortPower: ftp > 0 && best5m > 0 && best5m < ftp * 0.92 && periodActivities.length >= 3,
            fewLongRides: weeksInPeriod >= 3 && longRideCount < expectedLongRidesLo && periodActivities.length >= 4,
            mostlyVirtual: periodActivities.length >= 5 && virtualCount / periodActivities.length > 0.65,
            lowElevationOpportunity: periodActivities.length >= 4 && avgElevPerWeek < 200 && avgKmPerWeek > 50,
            lowWeeklyLoad: avgWeeklyLoad < 100,
            highWeeklyLoad: avgWeeklyLoad > 400,
            loadTrendUp,
            loadTrendDown,
        };

        return {
            strengths,
            weaknesses,
            opportunities,
            threats,
            avgWeeklyLoad,
            periodLabel,
            coachMetrics,
            coachFlags,
            periodComparison,
        };
    }, [activities, userSettings, startDate, endDate]);

    const coachPlan = useMemo(
        () =>
            buildCoachPlan({
                metrics: swot.coachMetrics,
                flags: swot.coachFlags,
                goalId: coachGoalId,
            }),
        [swot.coachMetrics, swot.coachFlags, coachGoalId]
    );

    const opportunitiesForDisplay = useMemo(() => {
        return swot.opportunities.map((o) =>
            o.label === 'Verfijn je focus'
                ? { ...o, extraActions: coachPlan.actions }
                : o
        );
    }, [swot.opportunities, coachPlan.actions]);

    // --- 2. DUAL RECOMMENDATION ENGINE ---
    const recommendations = useMemo(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const today = urlParams.get('day') ? parseInt(urlParams.get('day')) : new Date().getDay();

        const isWeekend = (today === 0 || today === 6);
        const dayNames = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];

        const options = [];

        if (isWeekend) {
            // OPTION 1: Long Endurance
            options.push({
                id: 'weekend_long',
                title: "Weekend Warrior: Endurance",
                duration: "3u - 4u",
                focus: "Zone 2 (Endurance)",
                description: "De basis van elke wielrenner. Lange, rustige duurtraining (Z2) stimuleert vetverbranding en capillaire dichtheid. Wees strikt: niet stiekem Tempo rijden!",
                type: "endurance",
                zwoSteps: [
                    { type: 'Warmup', duration: 900, powerLow: 0.50, powerHigh: 0.65 },
                    { type: 'SteadyState', duration: 3600, power: 0.65 },
                    { type: 'SteadyState', duration: 3600, power: 0.65 },
                    { type: 'SteadyState', duration: 3600, power: 0.60 },
                    { type: 'Cooldown', duration: 900, powerLow: 0.60, powerHigh: 0.50 }
                ]
            });
            // OPTION 2: Tempo / Sweetspot (Time Crunched)
            options.push({
                id: 'weekend_tempo',
                title: "Time Crunched: Tempo Climbs",
                duration: "1u 30m - 2u",
                focus: "Zone 3 (Tempo)",
                description: "Heb je minder tijd? Rij dan wat intensiever. Zoek heuvels op en rij ze in 'Tempo' (Z3). Dit is geen volle bak, maar wel 'comfortabel hard'.",
                type: "interval",
                zwoSteps: [
                    { type: 'Warmup', duration: 900, powerLow: 0.50, powerHigh: 0.70 },
                    { type: 'SteadyState', duration: 900, power: 0.80 }, // Tempo
                    { type: 'SteadyState', duration: 300, power: 0.55 }, // Rest
                    { type: 'SteadyState', duration: 900, power: 0.80 },
                    { type: 'SteadyState', duration: 300, power: 0.55 },
                    { type: 'SteadyState', duration: 900, power: 0.80 },
                    { type: 'Cooldown', duration: 900, powerLow: 0.60, powerHigh: 0.50 }
                ]
            });

        } else {
            // WEEKDAY LOGIC
            if (today === 1 || today === 5) { // Mon/Fri
                options.push({
                    id: 'recovery_active',
                    title: "Active Recovery",
                    duration: "45m - 60m",
                    focus: "Zone 1 (Recovery)",
                    description: "Actief herstel bevordert de doorbloeding en afvoer van afvalstoffen. Houd de hartslag laag en cadans hoog (95+ rpm). Voelt het zwaar? Stop dan.",
                    type: "recovery",
                    zwoSteps: [{ type: 'SteadyState', duration: 2700, power: 0.50 }]
                });
                options.push({
                    id: 'recovery_rest',
                    title: "Totale Rustdag",
                    duration: "0m",
                    focus: "Sleep & Nutrition",
                    description: "Soms is de beste training: niet trainen. Geef je spieren en hormoonsysteem 100% rust. Focus op slaapkwaliteit en eiwitrijke voeding.",
                    type: "recovery",
                    zwoSteps: [] // No file
                });

            } else {
                // Tue/Wed/Thu -> Quality (Intervals)
                const isVo2Day = (today === 2 || today === 4); // Tue/Thu

                if (isVo2Day) {
                    options.push({
                        id: 'vo2_micro',
                        title: "VO2 Max: Micro-Bursts",
                        duration: "1u 15m",
                        focus: "3 sets, 10x (30s ON / 15s OFF)",
                        description: "Korte, hevige prikkels om je zuurstofopname (VO2max) te verhogen. 30s @ 120% FTP, 15s rust. Zeer zwaar maar efficiënt.",
                        type: "interval",
                        zwoSteps: [
                            { type: 'Warmup', duration: 900, powerLow: 0.50, powerHigh: 0.75 },
                            { type: 'IntervalsT', repeat: 10, onDuration: 30, offDuration: 15, onPower: 1.20, offPower: 0.50 },
                            { type: 'SteadyState', duration: 300, power: 0.55 },
                            { type: 'IntervalsT', repeat: 10, onDuration: 30, offDuration: 15, onPower: 1.20, offPower: 0.50 },
                            { type: 'SteadyState', duration: 300, power: 0.55 },
                            { type: 'IntervalsT', repeat: 10, onDuration: 30, offDuration: 15, onPower: 1.20, offPower: 0.50 },
                            { type: 'Cooldown', duration: 900, powerLow: 0.60, powerHigh: 0.40 }
                        ]
                    });
                    options.push({
                        id: 'vo2_long',
                        title: "VO2 Max: 4x5 min",
                        duration: "1u 30m",
                        focus: "4x 5m @ 108% FTP",
                        description: "Klassieke VO2 intervallen. Langer in de 'pijnzone'. Dit traint niet alleen je plafond, maar ook je tolerantie voor verzuring.",
                        type: "interval",
                        zwoSteps: [
                            { type: 'Warmup', duration: 1200, powerLow: 0.50, powerHigh: 0.75 },
                            { type: 'SteadyState', duration: 300, power: 1.08 },
                            { type: 'SteadyState', duration: 300, power: 0.55 },
                            { type: 'SteadyState', duration: 300, power: 1.08 },
                            { type: 'SteadyState', duration: 300, power: 0.55 },
                            { type: 'SteadyState', duration: 300, power: 1.08 },
                            { type: 'SteadyState', duration: 300, power: 0.55 },
                            { type: 'SteadyState', duration: 300, power: 1.08 },
                            { type: 'Cooldown', duration: 900, powerLow: 0.60, powerHigh: 0.40 }
                        ]
                    });
                } else {
                    // Wed: Sweetspot / Threshold
                    options.push({
                        id: 'sst_classic',
                        title: "Sweetspot: 2x20m",
                        duration: "1u 30m",
                        focus: "2x 20m @ 90% FTP",
                        description: "De gouden standaard voor het vergroten van je motor (TTE). Net onder je omslagpunt. Mentaal zwaar, fysiek goed herstelbaar.",
                        type: "interval",
                        zwoSteps: [
                            { type: 'Warmup', duration: 1200, powerLow: 0.50, powerHigh: 0.75 },
                            { type: 'SteadyState', duration: 1200, power: 0.90 },
                            { type: 'SteadyState', duration: 300, power: 0.55 },
                            { type: 'SteadyState', duration: 1200, power: 0.90 },
                            { type: 'Cooldown', duration: 1200, powerLow: 0.70, powerHigh: 0.50 }
                        ]
                    });
                    options.push({
                        id: 'threshold_ou',
                        title: "Over-Unders",
                        duration: "1u 20m",
                        focus: "3x (2m @ 105% / 2m @ 90%)",
                        description: "Wisselend boven en onder je FTP rijden. Dit leert je lichaam om lactaat te verwerken ('shuttling') terwijl je hard doorfietst.",
                        type: "interval",
                        zwoSteps: [
                            { type: 'Warmup', duration: 1200, powerLow: 0.50, powerHigh: 0.75 },
                            { type: 'IntervalsT', repeat: 3, onDuration: 120, offDuration: 120, onPower: 1.05, offPower: 0.90 }, // Block 1 (12m total?) No, this is 3 reps
                            // Let's make it a 9-12 min block. 3x (2m/2m) = 12 mins.
                            { type: 'SteadyState', duration: 300, power: 0.55 },
                            { type: 'IntervalsT', repeat: 3, onDuration: 120, offDuration: 120, onPower: 1.05, offPower: 0.90 },
                            { type: 'SteadyState', duration: 300, power: 0.55 },
                            { type: 'IntervalsT', repeat: 3, onDuration: 120, offDuration: 120, onPower: 1.05, offPower: 0.90 },
                            { type: 'Cooldown', duration: 1200, powerLow: 0.70, powerHigh: 0.50 }
                        ]
                    });
                }
            }
        }

        return { dayName: dayNames[today], options };

    }, []);

    // --- 3. DOWNLOAD HANDLER ---
    const handleDownloadZwo = (workout) => {
        if (!workout.zwoSteps || workout.zwoSteps.length === 0) {
            alert("Voor deze rustdag is er geen workout file nodig. Geniet van de rust!");
            return;
        }

        const xml = `
<workout_file>
    <author>Climb Performance Lab</author>
    <name>${workout.title}</name>
    <description>${workout.description}</description>
    <sportType>bike</sportType>
    <tags><tag name="Intervals"/></tags>
    <workout>
${workout.zwoSteps.map(step => {
            if (step.type === 'IntervalsT') {
                return `        <IntervalsT Repeat="${step.repeat}" OnDuration="${step.onDuration}" OffDuration="${step.offDuration}" OnPower="${step.onPower}" OffPower="${step.offPower}"/>`;
            }
            if (step.type === 'Warmup' || step.type === 'Cooldown') {
                return `        <${step.type} Duration="${step.duration}" PowerLow="${step.powerLow}" PowerHigh="${step.powerHigh}"/>`;
            }
            return `        <SteadyState Duration="${step.duration}" Power="${step.power}"/>`;
        }).join('\n')}
    </workout>
</workout_file>`.trim();

        const blob = new Blob([xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CPL_${workout.title.replace(/\s+/g, '_')}.zwo`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const getCardStyles = (t) => {
        if (t === 'recovery') return {
            container: 'border-green-200 bg-green-50',
            text: 'text-green-700',
            badge: 'bg-green-100 text-green-800'
        };
        if (t === 'endurance') return {
            container: 'border-blue-200 bg-blue-50',
            text: 'text-blue-700',
            badge: 'bg-blue-100 text-blue-800'
        };
        return {
            container: 'border-yellow-200 bg-yellow-50',
            text: 'text-yellow-700',
            badge: 'bg-yellow-100 text-yellow-800'
        };
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header */}
            <div className="bg-cdsurface p-6 rounded-xl border border-cdborder shadow-xl flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-cdtext flex items-center gap-2"><Brain className="text-purple-400" /> AI Performance Coach</h2>
                    <p className="text-sm text-cdmuted">Gebaseerd op je data van {swot.periodLabel}.</p>
                </div>
                <div className="text-right hidden md:block">
                    <div className="text-2xl font-bold text-cdtext">{Math.round(swot.avgWeeklyLoad)} TSS</div>
                    <div className="text-xs text-cdmuted uppercase">Avg Weekly Load</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* --- 1. WORKOUT SUGGESTIONS (Left Col) --- */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="flex items-center gap-2 text-cdmuted text-sm uppercase font-bold tracking-wider">
                        <Calendar size={14} /> {recommendations.dayName} Sessies
                    </div>

                    {recommendations.options.map((opt, idx) => {
                        const styles = getCardStyles(opt.type);
                        return (
                            <div key={opt.id} className={`p-5 rounded-xl border-2 transition-colors relative ${styles.container} ${idx > 0 && 'opacity-90 scale-95 origin-top mt-2'}`}>
                                {idx === 0 && <div className="absolute -top-3 left-4 px-2 py-0.5 bg-yellow-400 text-slate-900 text-[10px] font-bold uppercase rounded">Aanbevolen</div>}
                                {idx > 0 && <div className="absolute -top-3 left-4 px-2 py-0.5 bg-cdsurface border border-cdborder text-cdtext text-[10px] font-bold uppercase rounded">Alternatief</div>}

                                <div className="flex justify-between items-start mb-2 mt-2">
                                    <h3 className={`text-lg font-bold ${styles.text}`}>{opt.title}</h3>
                                    <div className={styles.text}>
                                        {opt.type === 'interval' && <Activity size={16} />}
                                        {opt.type === 'recovery' && <Battery size={16} />}
                                        {opt.type === 'endurance' && <TrendingUp size={16} />}
                                    </div>
                                </div>

                                <div className="flex gap-4 mb-3 text-xs font-mono text-cdmuted">
                                    <span className="flex items-center gap-1"><ClockIcon /> {opt.duration}</span>
                                    <span className="flex items-center gap-1"><Brain size={12} /> {opt.focus}</span>
                                </div>

                                <p className="text-xs leading-relaxed text-cdtext mb-4 h-16 overflow-y-auto custom-scrollbar">
                                    {opt.description}
                                </p>

                                <button
                                    onClick={() => handleDownloadZwo(opt)}
                                    className="w-full bg-cdsurface hover:bg-cdborder text-cdtext text-xs font-bold py-2 px-3 rounded flex items-center justify-center gap-2 border border-cdborder transition-colors"
                                >
                                    <Download size={14} /> Download .zwo
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* --- 2. SWOT MATRIX (Right Col, 2 span) --- */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 h-fit">
                    <SwotCard title="Strengths (Kracht)" items={swot.strengths} icon={CheckCircle} color="text-green-500" border="border-green-500" />
                    <SwotCard title="Weaknesses (Zwaktes)" items={swot.weaknesses} icon={AlertTriangle} color="text-red-500" border="border-red-500" />
                    <SwotCard title="Opportunities (Kansen)" items={opportunitiesForDisplay} icon={TrendingUp} color="text-blue-500" border="border-blue-500" />
                    <SwotCard title="Threats (Bedreigingen)" items={swot.threats} icon={Activity} color="text-yellow-500" border="border-yellow-500" />
                </div>
            </div>

            {/* --- Tweede tijdssnede: recent vs vorig blok / jaar-context --- */}
            <div className="bg-cdsurface p-6 rounded-xl border border-cdborder shadow-xl space-y-4">
                <h3 className="text-lg font-bold text-cdtext flex items-center gap-2">
                    <GitCompareArrows size={20} className="text-cdaccent shrink-0" />
                    Periodevergelijking (trend)
                </h3>
                <p className="text-xs text-cdmuted leading-relaxed">
                    Naast je gekozen venster kijken we naar <strong className="text-cdtext font-medium">het even lange stuk ervoor</strong> (directe vergelijking) en — als je periode kort genoeg is — naar het <strong className="text-cdtext font-medium">afgelopen jaar minus je huidige periode</strong> (langere context). Zo zie je bv. of je laatste maand zwaarder of lichter is dan het jaargemiddelde ervoor.
                </p>
                <div className="overflow-x-auto rounded-lg border border-cdborder">
                    <table className="w-full text-left text-sm min-w-[640px]">
                        <thead>
                            <tr className="bg-cdborder/40 text-cdmuted text-xs uppercase">
                                <th className="px-3 py-2 font-semibold">Venster</th>
                                <th className="px-3 py-2 font-semibold">Datums</th>
                                <th className="px-3 py-2 font-semibold text-right">Ritten</th>
                                <th className="px-3 py-2 font-semibold text-right">TSS/wk</th>
                                <th className="px-3 py-2 font-semibold text-right">km/wk</th>
                                <th className="px-3 py-2 font-semibold text-right">u/wk</th>
                                <th className="px-3 py-2 font-semibold text-right">&gt;90% FTP</th>
                                <th className="px-3 py-2 font-semibold text-right">Δ TSS</th>
                            </tr>
                        </thead>
                        <tbody className="text-cdtext">
                            {swot.periodComparison.comparisonRows.map((row) => (
                                <tr key={row.key} className="border-t border-cdborder">
                                    <td className="px-3 py-2 font-medium text-cdtext">{row.label}</td>
                                    <td className="px-3 py-2 text-cdmuted text-xs max-w-[200px]">{row.rangeLabel}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{row.rides}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{row.tssWeek}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{row.kmWeek}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{row.hoursWeek}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{row.hardSessions}</td>
                                    <td className="px-3 py-2 text-right text-xs text-cdmuted tabular-nums">
                                        {row.key === 'primary'
                                            ? '—'
                                            : formatVsPrimaryPct(row.vsPrimaryTssPct)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {!swot.periodComparison.prior && swot.coachMetrics?.rideCount > 0 && (
                    <p className="text-xs text-cdmuted">
                        Geen directe voorganger: je gekozen periode reikt te ver terug of er is onvoldoende marge vóór de startdatum in je activiteitenlijst.
                    </p>
                )}
                {!swot.periodComparison.yearRest && swot.coachMetrics?.rideCount > 0 && (
                    <p className="text-xs text-cdmuted">
                        Jaar-context wordt alleen getoond voor periodes van ongeveer 2 weken tot onder de 10 maanden; bij &quot;alles&quot; of zeer lange ranges gebruik je vooral de eerste vergelijkingsrij.
                    </p>
                )}
            </div>

            {/* --- Coachplan: acties + week + .zwo gekoppeld aan SWOT/data --- */}
            <div className="bg-cdsurface p-6 rounded-xl border border-cdborder shadow-xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h3 className="text-lg font-bold text-cdtext flex items-center gap-2">
                        <Target size={20} className="text-purple-400 shrink-0" />
                        {coachPlan.headline}
                    </h3>
                    <label className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-cdmuted">
                        <span className="font-semibold text-cdtext whitespace-nowrap">Trainingsdoel</span>
                        <select
                            value={coachGoalId}
                            onChange={(e) => setCoachGoalId(e.target.value)}
                            className="bg-cdborder border border-cdborder rounded-lg px-3 py-2 text-cdtext text-sm min-w-[220px]"
                        >
                            {COACH_GOAL_OPTIONS.map((g) => (
                                <option key={g.id} value={g.id}>
                                    {g.label}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
                <p className="text-xs text-cdmuted leading-relaxed">
                    Dit weekvoorstel combineert je gekozen periode ({swot.periodLabel}), de SWOT-signalen en — bij &quot;Automatisch&quot; — de sterkste aandachtspunten uit je data. Gebruik het als startpunt; pas aan naar schema, weer en herstel.
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <h4 className="text-sm font-bold text-cdtext uppercase tracking-wide mb-2 flex items-center gap-2">
                            <ListChecks size={16} className="text-cdaccent" /> Concrete acties
                        </h4>
                        <ul className="list-disc list-inside space-y-2 text-sm text-cdtext leading-relaxed">
                            {coachPlan.actions.map((line, i) => (
                                <li key={i}>{line}</li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-cdtext uppercase tracking-wide mb-2">Voorbeeldweek (Ma–Zo)</h4>
                        <div className="rounded-lg border border-cdborder overflow-hidden text-sm">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-cdborder/40 text-cdmuted text-xs uppercase">
                                        <th className="px-3 py-2 font-semibold">Dag</th>
                                        <th className="px-3 py-2 font-semibold">Focus</th>
                                        <th className="px-3 py-2 font-semibold w-24 text-right">.zwo</th>
                                    </tr>
                                </thead>
                                <tbody className="text-cdtext">
                                    {coachPlan.weekPlan.map((row, i) => (
                                        <tr key={i} className="border-t border-cdborder">
                                            <td className="px-3 py-2 font-medium whitespace-nowrap">{row.day}</td>
                                            <td className="px-3 py-2 text-cdmuted">
                                                <span className="text-cdtext font-medium">{row.session}</span>
                                                {row.detail ? (
                                                    <span className="block text-xs mt-0.5">{row.detail}</span>
                                                ) : null}
                                            </td>
                                            <td className="px-3 py-2 text-right align-top">
                                                {row.workoutId && COACH_WORKOUT_LIBRARY[row.workoutId] ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDownloadZwo(COACH_WORKOUT_LIBRARY[row.workoutId])}
                                                        className="text-xs font-bold text-cdaccent hover:underline inline-flex items-center gap-1"
                                                    >
                                                        <Download size={12} />
                                                        Download
                                                    </button>
                                                ) : (
                                                    <span className="text-cdmuted text-xs">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {coachPlan.workouts.length > 0 && (
                    <div>
                        <h4 className="text-sm font-bold text-cdtext uppercase tracking-wide mb-3">Workouts uit dit plan (alle .zwo)</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                            {coachPlan.workouts.map((w) => {
                                const styles = getCardStyles(w.type);
                                return (
                                    <div
                                        key={w.id}
                                        className={`p-4 rounded-lg border ${styles.container} flex flex-col gap-2`}
                                    >
                                        <div className={`font-bold text-sm ${styles.text}`}>{w.title}</div>
                                        <div className="text-xs text-cdmuted">{w.duration} · {w.focus}</div>
                                        <p className="text-xs text-cdtext leading-relaxed flex-1">{w.description}</p>
                                        <button
                                            type="button"
                                            onClick={() => handleDownloadZwo(w)}
                                            className="w-full bg-cdsurface hover:bg-cdborder text-cdtext text-xs font-bold py-2 px-3 rounded border border-cdborder flex items-center justify-center gap-2"
                                        >
                                            <Download size={14} /> Download .zwo
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Sub-component for cleaner SWOT rendering
const SwotCard = ({ title, items, icon, color, border }) => {
    const Icon = icon;
    return (
        <div className={`bg-cdsurface/80 p-4 rounded-lg border-l-4 ${border} h-full`}>
            <h4 className={`font-bold text-cdtext mb-3 flex items-center gap-2`}>
                <Icon size={16} className={color} /> {title}
            </h4>
            <ul className="space-y-4">
                {items.map((item, i) => (
                    <li key={i} className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm text-cdtext font-bold">
                            <span className={`w-1.5 h-1.5 rounded-full ${color.replace('text-', 'bg-')}`}></span>
                            {item.label}
                        </div>
                        <div className="text-xs text-cdmuted pl-3.5 leading-relaxed">
                            {item.context}
                        </div>
                        {item.extraActions?.length ? (
                            <ul className="mt-2 pl-3.5 space-y-1 text-xs text-cdtext list-disc list-inside border-l-2 border-cdborder ml-1">
                                {item.extraActions.map((line, j) => (
                                    <li key={j}>{line}</li>
                                ))}
                            </ul>
                        ) : null}
                    </li>
                ))}
            </ul>
        </div>
    );
};

// Simple Icon Helper
const ClockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
);

export default AICoach;
