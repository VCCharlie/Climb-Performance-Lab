/**
 * Planning toward a target date: estimated event load,
 * weekly TSS guidance and phases (base / build / specific / taper).
 */

import { analyzeRidingPattern } from './coach/coachRidingPattern';
import {
    resolveDevelopmentStrategy,
    developmentAdjustedWeekTss,
} from './coach/coachDevelopmentStrategy';

const MS_DAY = 86400000;

/**
 * Average TSS/week over the last `weeks` full weeks before `endDate`.
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
 * Estimate duration (h) when user does not provide it: km + elevation as a sportive-style ride.
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
 * TSS estimate for (planned) effort: TSS ≈ hours × 100 × IF² (common approximation).
 * @param {number} hours
 * @param {number} intensityFactor 0.55–1.0 (decimal, e.g. 0.78 for ~78% FTP)
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
 * @param {number|null} p.durationHours - optional
 * @param {number} p.targetPctFtp - 55–100 (% of FTP as average for the event)
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
                ' Steep profiles often need repeated above-threshold spikes; plan extra rest around the event and practice similar cadence.';
        }
    }

    return {
        distanceKm,
        elevationM,
        durationHours,
        intensityFactor,
        targetPctFtp: pct,
        estimatedEventTss: tssOneDay,
        narrative: `Estimated ~${durationHours.toFixed(1)} h at ~${pct}% FTP → roughly ${tssOneDay} TSS on event day (one-off peak load).${climbStressNote}`,
    };
}

const TAPER_WEEKS = 2;

function phaseForWeek(weekIndex, totalWeeks) {
    if (totalWeeks <= TAPER_WEEKS) return { key: 'taper', label: 'Taper / fresh' };
    const buildWeeks = totalWeeks - TAPER_WEEKS;
    const r = weekIndex / Math.max(1, buildWeeks - 1);
    if (r < 0.35) return { key: 'base', label: 'Base / volume' };
    if (r < 0.7) return { key: 'build', label: 'Build / load' };
    return { key: 'specific', label: 'Event-specific' };
}

/**
 * Distinct focus line per week (avoids copy-paste rows in the macro table).
 */
export function weekPlanFocus({
    weekNum,
    phaseKey,
    phaseLabel,
    weekStrategy,
    eventDemand,
    isTaper,
    phaseWeekIndex,
}) {
    const km = eventDemand?.distanceKm ? `~${Math.round(eventDemand.distanceKm)} km` : 'event distance';
    const elev = eventDemand?.elevationM ? ` · ~${Math.round(eventDemand.elevationM)} m` : '';

    if (isTaper) {
        return phaseWeekIndex === 0
            ? 'Taper week 1: cut duration 40–50%, keep legs open with easy spins.'
            : 'Taper week 2: minimal load, short openers optional — arrive fresh.';
    }

    if (weekStrategy.mode === 'develop-aerobic' || weekStrategy.mode === 'event-prep') {
        if (phaseKey === 'base') {
            return phaseWeekIndex === 0
                ? 'Base A: long Z2 priority, max 1 sweetspot — lower TSS than your habit is intentional.'
                : 'Base B: extend Z2 time on the long ride; still only one quality day.';
        }
        if (phaseKey === 'build') {
            return phaseWeekIndex === 0
                ? 'Build A: Z2 volume + one structured sweetspot/threshold session.'
                : 'Build B: slightly more quality, but keep easy days truly easy.';
        }
        if (phaseKey === 'specific') {
            return phaseWeekIndex === 0
                ? `Specific A: ${km}${elev} — shorter blocks at target pace.`
                : `Specific B: ${km} rehearsal — reduce volume, keep intensity touches.`;
        }
    }

    if (phaseKey === 'base') {
        return phaseWeekIndex === 0
            ? 'Mostly Z2 endurance; optional 1× sweetspot — cap hard days at 1.'
            : 'Continue Z2 base; add duration before adding intensity.';
    }
    if (phaseKey === 'build') {
        return phaseWeekIndex === 0
            ? 'Gradually increase load; 1–2 quality days (sweetspot/VO2) if recovery allows.'
            : 'Consolidate build week; monitor fatigue before event-specific work.';
    }
    if (phaseKey === 'specific') {
        return `Event-specific (week ${weekNum}): ${km}${elev} — shorter versions or repeats.`;
    }

    return `${phaseLabel} — week ${weekNum}.`;
}

/**
 * Builds week list with target TSS and short focus notes.
 */
export function buildWeeklyGoalPlan({
    weeksToEvent,
    recentWeeklyTss,
    eventDemand,
    eventTss,
    ridingPattern,
}) {
    const W = Math.max(0, Math.floor(weeksToEvent));
    if (W <= 0) {
        return {
            weeks: [],
            summary:
                'Your target date is today or in the past. Set a new date or use Recovery to check whether you are fresh enough.',
        };
    }

    const start = Math.max(80, recentWeeklyTss || 120);
    const eventDayTss = eventTss || 200;

    const peakMultiplier = eventDayTss > 350 ? 1.35 : eventDayTss > 220 ? 1.25 : 1.15;
    let peakTarget = Math.round(Math.max(start * 1.08, eventDayTss * peakMultiplier));
    peakTarget = Math.min(peakTarget, 550);

    const buildWeeks = Math.max(0, W - TAPER_WEEKS);
    const weeks = [];
    let primaryStrategy = null;
    const phaseWeekCounters = {};

    for (let i = 0; i < W; i++) {
        const weekNum = i + 1;
        const isTaper = i >= W - TAPER_WEEKS;
        const phase = phaseForWeek(i, W);
        const phaseKey = isTaper ? 'taper' : phase.key;
        const phaseWeekIndex = phaseWeekCounters[phaseKey] ?? 0;
        phaseWeekCounters[phaseKey] = phaseWeekIndex + 1;

        const weekStrategy = resolveDevelopmentStrategy(
            ridingPattern || {},
            recentWeeklyTss,
            phaseKey,
        );
        if (!primaryStrategy && weekStrategy.mode !== 'progress') {
            primaryStrategy = weekStrategy;
        }

        let targetTss;
        if (weekStrategy.mode !== 'progress') {
            targetTss = developmentAdjustedWeekTss(
                recentWeeklyTss,
                weekStrategy,
                phaseKey,
                i,
                buildWeeks,
            );
        } else if (isTaper) {
            const taperIdx = i - (W - TAPER_WEEKS);
            targetTss = taperIdx === 0 ? Math.round(peakTarget * 0.55) : Math.round(peakTarget * 0.35);
        } else if (buildWeeks <= 1) {
            targetTss = peakTarget;
        } else {
            const t = i / Math.max(1, buildWeeks - 1);
            targetTss = Math.round(start + (peakTarget - start) * t);
        }

        const focus = weekPlanFocus({
            weekNum,
            phaseKey,
            phaseLabel: isTaper ? 'Taper' : phase.label,
            weekStrategy,
            eventDemand,
            isTaper,
            phaseWeekIndex,
        });

        weeks.push({
            weekNum,
            phaseKey: isTaper ? 'taper' : phase.key,
            phaseLabel: isTaper ? 'Taper' : phase.label,
            targetTss,
            focus,
        });
    }

    const usesDevelopment = Boolean(primaryStrategy);
    const summary = usesDevelopment && primaryStrategy?.rationale
        ? `Development focus: ${primaryStrategy.rationale} Peak ~${Math.round(start * (primaryStrategy.macroPeakMultiplier || 1))} TSS/week (below recent ${Math.round(start)}), then taper toward event day (~${eventDayTss} TSS).`
        : W <= TAPER_WEEKS
            ? `Only ${W} week(s) left: focus on rest and light work — no heavy blocks anymore.`
            : `From ~${Math.round(start)} to ~${peakTarget} TSS/week peak, then ${TAPER_WEEKS} taper weeks toward ~${eventDayTss} TSS on event day (estimate).`;

    return {
        weeks,
        summary,
        peakTarget: usesDevelopment
            ? Math.round(start * (primaryStrategy?.macroPeakMultiplier || 1))
            : peakTarget,
        taperWeeks: TAPER_WEEKS,
        developmentMode: primaryStrategy?.mode || 'progress',
        developmentRationale: primaryStrategy?.rationale || null,
    };
}

/**
 * Full plan object for the UI.
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
        return { error: 'Choose a valid target date.' };
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

    const referenceYmd = today instanceof Date
        ? today.toISOString().slice(0, 10)
        : String(today).slice(0, 10);
    const ridingPattern = analyzeRidingPattern(activities, referenceYmd, 8);

    const plan = buildWeeklyGoalPlan({
        weeksToEvent,
        recentWeeklyTss,
        eventDemand: {
            distanceKm: goalInputs.distanceKm,
            elevationM: goalInputs.elevationM,
        },
        eventTss: demand.estimatedEventTss,
        ridingPattern,
    });

    const tips = [];
    if (plan.developmentMode === 'develop-aerobic') {
        tips.push(
            'Your recent training is intense and frequent. This plan deliberately uses more Z2 and fewer hard rides — weekly TSS may be lower than your habit while FTP and endurance rebuild.',
        );
    }
    if (recentWeeklyTss > 400 && weeksToEvent < 3) {
        tips.push('Your recent weekly load is high and the event is soon: check Recovery (TSB) and consider a rest week before the event.');
    }
    if (demand.elevationM > 1500 && demand.durationHours < 3) {
        tips.push('Lots of elevation in a short distance: train repeated short climbs and cadence, not only flat kilometers.');
    }
    if (weeksToEvent > 20) {
        tips.push('Long horizon: revisit this plan every 3–4 weeks based on your actual TSS and how you feel.');
    }

    return {
        weeksToEvent: Math.max(0, Math.floor(weeksToEvent)),
        recentWeeklyTss: Math.round(recentWeeklyTss),
        ridingPattern,
        demand,
        plan,
        tips,
    };
}
