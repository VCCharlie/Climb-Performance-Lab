/**
 * Planning richting een datumdoel: geschatte belasting van het doel,
 * wekelijkse TSS-richting en fasen (basis / opbouw / specifiek / taper).
 */

const MS_DAY = 86400000;

/**
 * Gemiddelde TSS/week over de laatste `weeks` volledige weken vóór `endDate`.
 */
export function avgWeeklyTssRecent(activities, endDate, weeks = 4) {
    if (!activities?.length || weeks < 1) return 0;
    const endD = endDate ? new Date(endDate) : new Date();
    const startD = new Date(endD);
    startD.setDate(startD.getDate() - weeks * 7);

    let total = 0;
    for (const a of activities) {
        const d = new Date(a.date);
        if (d >= startD && d <= endD) total += Number(a.load) || 0;
    }
    return total / weeks;
}

/**
 * Schat duur (u) als gebruiker die niet invult: km + hm als sportieve granfondo-achtige rit.
 */
export function estimateDurationHours(distanceKm, elevationM) {
    const d = Math.max(0, Number(distanceKm) || 0);
    const e = Math.max(0, Number(elevationM) || 0);
    if (d <= 0 && e <= 0) return 2;
    const flatPace = 28;
    const hmPenalty = 700;
    return Math.max(1, d / flatPace + e / hmPenalty);
}

/**
 * TSS-schatting voor (geplande) inspanning: TSS ≈ uren × 100 × IF² (gangbare benadering).
 * @param {number} hours
 * @param {number} intensityFactor 0.55–1.0 (als decimaal, bv. 0.78 voor ~78% FTP)
 */
export function estimateSessionTss(hours, intensityFactor) {
    const h = Math.max(0.25, hours);
    const ifac = Math.min(1.05, Math.max(0.5, intensityFactor));
    return Math.round(h * 100 * ifac * ifac);
}

/**
 * @param {object} p
 * @param {number} p.distanceKm
 * @param {number} p.elevationM
 * @param {number|null} p.durationHours - optioneel
 * @param {number} p.targetPctFtp - 55–100 (% van FTP als gemiddelde voor het doel)
 */
export function estimateGoalEventDemand(p) {
    const distanceKm = Number(p.distanceKm) || 0;
    const elevationM = Number(p.elevationM) || 0;
    const durationHours =
        p.durationHours != null && p.durationHours !== '' && !Number.isNaN(Number(p.durationHours))
            ? Math.max(0.5, Number(p.durationHours))
            : estimateDurationHours(distanceKm, elevationM);

    const pct = Math.min(100, Math.max(55, Number(p.targetPctFtp) || 75));
    const intensityFactor = pct / 100;

    const tssOneDay = estimateSessionTss(durationHours, intensityFactor);

    let climbStressNote = '';
    if (elevationM > 800 && distanceKm > 0) {
        const avgGrade = (elevationM / (distanceKm * 1000)) * 100;
        if (avgGrade > 5) {
            climbStressNote =
                ' Steile profielen vragen vaak herhaalde boven-drempelspikes; plan extra rust rond het doel en oefen vergelijkbare cadans.';
        }
    }

    return {
        distanceKm,
        elevationM,
        durationHours,
        intensityFactor,
        targetPctFtp: pct,
        estimatedEventTss: tssOneDay,
        narrative: `Geschat ~${durationHours.toFixed(1)} u tegen ~${pct}% FTP → ruwweg ${tssOneDay} TSS op de doeldag (eenmalige piekbelasting).${climbStressNote}`,
    };
}

const TAPER_WEEKS = 2;

function phaseForWeek(weekIndex, totalWeeks) {
    if (totalWeeks <= TAPER_WEEKS) return { key: 'taper', label: 'Taper / fris' };
    const buildWeeks = totalWeeks - TAPER_WEEKS;
    const r = weekIndex / Math.max(1, buildWeeks - 1);
    if (r < 0.35) return { key: 'base', label: 'Basis / volume' };
    if (r < 0.7) return { key: 'build', label: 'Opbouw / load' };
    return { key: 'specific', label: 'Specifiek richting doel' };
}

/**
 * Bouwt wekenlijst met doel-TSS en korte focus.
 */
export function buildWeeklyGoalPlan({
    weeksToEvent,
    recentWeeklyTss,
    eventDemand,
    eventTss,
}) {
    const W = Math.max(0, Math.floor(weeksToEvent));
    if (W <= 0) {
        return {
            weeks: [],
            summary:
                'Je doeldatum is vandaag of in het verleden. Stel een nieuwe datum in of gebruik Recovery om te peilen of je voldoende fris bent.',
        };
    }

    const start = Math.max(80, recentWeeklyTss || 120);
    const eventDayTss = eventTss || 200;

    const peakMultiplier = eventDayTss > 350 ? 1.35 : eventDayTss > 220 ? 1.25 : 1.15;
    let peakTarget = Math.round(Math.max(start * 1.08, eventDayTss * peakMultiplier));
    peakTarget = Math.min(peakTarget, 550);

    const buildWeeks = Math.max(0, W - TAPER_WEEKS);
    const weeks = [];

    for (let i = 0; i < W; i++) {
        const weekNum = i + 1;
        const isTaper = i >= W - TAPER_WEEKS;
        const phase = phaseForWeek(i, W);

        let targetTss;
        if (isTaper) {
            const taperIdx = i - (W - TAPER_WEEKS);
            targetTss = taperIdx === 0 ? Math.round(peakTarget * 0.55) : Math.round(peakTarget * 0.35);
        } else if (buildWeeks <= 1) {
            targetTss = peakTarget;
        } else {
            const t = i / Math.max(1, buildWeeks - 1);
            targetTss = Math.round(start + (peakTarget - start) * t);
        }

        let focus = '';
        if (phase.key === 'base') {
            focus = 'Vooral Z2-duur, 1× sweetspot optioneel; beperk harde dagen tot 1.';
        } else if (phase.key === 'build') {
            focus = 'Verhoog week-TSS geleidelijk; 1–2 kwaliteitsdagen (sweetspot/VO2) afhankelijk van herstel.';
        } else if (phase.key === 'specific') {
            focus = `Benader doelprofiel: ${eventDemand.distanceKm ? `~${Math.round(eventDemand.distanceKm)} km` : 'afstand'}, ${eventDemand.elevationM ? `~${Math.round(eventDemand.elevationM)} hm` : 'hoogte'} — kortere versies of herhaalde beklimmingen.`;
        } else {
            focus = 'Volume omlaag, slapen, geen nieuwe prikkels; licht losrijden voor het doel.';
        }

        weeks.push({
            weekNum,
            phaseKey: isTaper ? 'taper' : phase.key,
            phaseLabel: isTaper ? 'Taper' : phase.label,
            targetTss,
            focus,
        });
    }

    const summary =
        W <= TAPER_WEEKS
            ? `Nog maar ${W} week(en): focus op rust en licht werk — geen zware blokken meer.`
            : `Van ~${Math.round(start)} naar ~${peakTarget} TSS/week piek, daarna ${TAPER_WEEKS} taper-weken richting ~${eventDayTss} TSS op de doeldag (schatting).`;

    return { weeks, summary, peakTarget, taperWeeks: TAPER_WEEKS };
}

/**
 * Volledige plan-object voor de UI.
 */
export function computeTrainingGoalPlan({
    goalDateStr,
    activities,
    today = new Date(),
    endDateForRecentTss,
    goalInputs,
}) {
    const goalEnd = goalDateStr ? new Date(goalDateStr) : null;
    if (!goalEnd || Number.isNaN(goalEnd.getTime())) {
        return { error: 'Kies een geldige doeldatum.' };
    }

    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const diffMs = goalEnd.getTime() - todayStart.getTime();
    const weeksToEvent = diffMs / (7 * MS_DAY);

    const recentWeeklyTss = avgWeeklyTssRecent(activities, endDateForRecentTss || today, 4);

    const demand = estimateGoalEventDemand({
        distanceKm: goalInputs.distanceKm,
        elevationM: goalInputs.elevationM,
        durationHours: goalInputs.durationHours,
        targetPctFtp: goalInputs.targetPctFtp,
    });

    const plan = buildWeeklyGoalPlan({
        weeksToEvent,
        recentWeeklyTss,
        eventDemand: {
            distanceKm: goalInputs.distanceKm,
            elevationM: goalInputs.elevationM,
        },
        eventTss: demand.estimatedEventTss,
    });

    const tips = [];
    if (recentWeeklyTss > 400 && weeksToEvent < 3) {
        tips.push('Je recente weekload is hoog en het doel is dichtbij: check Recovery (TSB) en overweeg een rustweek vóór het doel.');
    }
    if (demand.elevationM > 1500 && demand.durationHours < 3) {
        tips.push('Veel hoogtemeters op korte afstand: train herhaalde korte klimmen en trapfrequentie, niet alleen vlakke kilometers.');
    }
    if (weeksToEvent > 20) {
        tips.push('Lange horizon: herzie deze planning elke 3–4 weken op basis van je werkelijke TSS en hoe je je voelt.');
    }

    return {
        weeksToEvent: Math.max(0, Math.floor(weeksToEvent)),
        recentWeeklyTss: Math.round(recentWeeklyTss),
        demand,
        plan,
        tips,
    };
}
