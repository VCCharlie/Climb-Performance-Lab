/**
 * Builds structured coachContext from activities + user settings.
 */

import { normalizeDate } from '../formatters';
import { addDaysToYmd } from '../dashboardVolumeTotals';
import { calculateFitnessMetrics } from '../formTabMetrics';
import { selectStimulus } from './stimulusSelector';
import { buildFluidWorkout } from './fluidWorkoutTemplates';
import { stimulusRationale } from './stimulusSelector';
import { resolveEffectiveProfileFtp } from '../profileFtp';
import {
    activityIF,
    classifyIF,
    filterActivitiesInRange,
    sumTss,
    bestInRange,
    movingTimeSec,
    todayYmd,
    weeklyTssTarget,
} from './coachHelpers';
import { buildCoachPowerHistory } from './coachPowerHistory';
import { buildCoachActivityLog } from './coachActivityLog';
import { buildTodayFocus } from './coachTodayFocus';
import { buildFluidWeekPlan } from './coachWeekPlan';

function computeIntensityProfile(activities, ftp, lookbackDays = 14) {
    const endYmd = todayYmd();
    const startYmd = addDaysToYmd(endYmd, -lookbackDays);
    const recent = filterActivitiesInRange(activities, startYmd, endYmd);

    const buckets = { z1z2: 0, tempo: 0, sweetspot: 0, threshold: 0, vo2: 0, unknown: 0 };
    let hardSessionCount = 0;
    let lastHardYmd = null;

    for (const a of recent) {
        const ifVal = activityIF(a, ftp);
        const bucket = classifyIF(ifVal);
        const secs = movingTimeSec(a.moving_time);
        buckets[bucket] += secs;

        if (ifVal != null && ifVal > 0.90) {
            hardSessionCount += 1;
            const ymd = normalizeDate(a.date);
            if (!lastHardYmd || ymd > lastHardYmd) lastHardYmd = ymd;
        }
    }

    const totalSecs = Object.values(buckets).reduce((s, v) => s + v, 0) || 1;
    const toPct = (secs) => Math.round((secs / totalSecs) * 100);

    let daysSinceHard = null;
    if (lastHardYmd) {
        const diffMs = new Date(todayYmd()).getTime() - new Date(lastHardYmd).getTime();
        daysSinceHard = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    return {
        z1z2Pct: toPct(buckets.z1z2),
        tempoPct: toPct(buckets.tempo),
        sweetspotPct: toPct(buckets.sweetspot),
        thresholdPct: toPct(buckets.threshold),
        vo2Pct: toPct(buckets.vo2),
        hardSessionCount,
        daysSinceHard,
        rideCount14d: recent.length,
    };
}

function countHardSessionsThisWeek(activities, ftp) {
    const endYmd = todayYmd();
    const startYmd = addDaysToYmd(endYmd, -6);
    const week = filterActivitiesInRange(activities, startYmd, endYmd);
    return week.filter((a) => {
        const ifVal = activityIF(a, ftp);
        return ifVal != null && ifVal > 0.90;
    }).length;
}

/**
 * @param {object[]} activities
 * @param {object} userSettings
 * @param {object} [options]
 * @returns {object}
 */
export function buildCoachContext(activities, userSettings, options = {}) {
    const profileFtp = resolveEffectiveProfileFtp(userSettings, activities);
    const ftp = profileFtp.ftp || Number(userSettings?.ftp) || 0;
    const weeklyHours = Number(options.weeklyHoursTarget)
        || Number(userSettings?.weeklyHoursTarget)
        || 5;
    const endYmd = options.endDate || todayYmd();
    const startYmd28 = addDaysToYmd(endYmd, -28);
    const startYmd7 = addDaysToYmd(endYmd, -7);

    const fitnessSeries = calculateFitnessMetrics(activities);
    const latestFitness = fitnessSeries.length > 0 ? fitnessSeries[fitnessSeries.length - 1] : null;

    let fitness7dAgo = fitnessSeries[0] || null;
    for (const row of fitnessSeries) {
        if (row.date <= startYmd7) fitness7dAgo = row;
    }

    const activities28d = filterActivitiesInRange(activities, startYmd28, endYmd);
    const activities7d = filterActivitiesInRange(activities, startYmd7, endYmd);

    let distance28d = 0;
    let elevation28d = 0;
    let distance7d = 0;
    for (const a of activities28d) {
        distance28d += Number(a.distance) || 0;
        elevation28d += Number(a.climbing) || 0;
    }
    for (const a of activities7d) {
        distance7d += Number(a.distance) || 0;
    }

    const intensityProfile = computeIntensityProfile(activities, ftp, 14);

    const best20min = bestInRange(activities28d, 'best_20min');
    const best60min = bestInRange(activities28d, 'best_60min');
    const best5min = bestInRange(activities28d, 'best_5min');

    const targetTss = weeklyTssTarget(weeklyHours);
    const actualTss7d = sumTss(activities7d);

    const ctl = latestFitness?.ctl ?? 0;
    const atl = latestFitness?.atl ?? 0;
    const tsb = latestFitness?.tsb ?? 0;
    const ctl7 = fitness7dAgo?.ctl ?? ctl;
    const atl7 = fitness7dAgo?.atl ?? atl;
    const tsb7 = fitness7dAgo?.tsb ?? tsb;

    const coachFeatures = {
        athlete: {
            ftp,
            ftpSource: profileFtp.source,
            weight: Number(userSettings?.weight) || null,
            weeklyHoursTarget: weeklyHours,
            primaryGoal: options.primaryGoal || 'ftp_sustained_power',
            terrain: 'flat_polder',
            constraints: { hatesErgWorkouts: true, prefersOutdoor: true },
        },
        fitness: {
            ctl: Math.round(ctl * 10) / 10,
            atl: Math.round(atl * 10) / 10,
            tsb: Math.round(tsb * 10) / 10,
            ctlDelta7d: Math.round((ctl - ctl7) * 10) / 10,
            atlDelta7d: Math.round((atl - atl7) * 10) / 10,
            tsbTrend: tsb > tsb7 + 3 ? 'rising' : tsb < tsb7 - 3 ? 'falling' : 'stable',
            asOfDate: latestFitness?.date || endYmd,
        },
        weeklyLoad: {
            targetTss,
            actualTss: Math.round(actualTss7d),
            compliancePct: targetTss > 0 ? Math.round((actualTss7d / targetTss) * 100) : 0,
        },
        intensityProfile,
        powerCeiling: {
            best5min,
            best20min,
            best60min,
            ftpGap20min: ftp > 0 ? Math.round(((best20min / ftp) - 1) * 100) / 100 : null,
            sustainedWeakness: ftp > 0 && best60min > 0 && best60min < ftp * 0.92,
        },
        periodSummary: {
            rides28d: activities28d.length,
            hours28d: Math.round(
                activities28d.reduce((s, a) => s + movingTimeSec(a.moving_time), 0) / 3600 * 10
            ) / 10,
            distanceKm28d: Math.round(distance28d * 10) / 10,
            elevationM28d: Math.round(elevation28d),
            distanceKm7d: Math.round(distance7d * 10) / 10,
            tss28d: Math.round(sumTss(activities28d)),
        },
        compliance: {
            hardSessionsThisWeek: countHardSessionsThisWeek(activities, ftp),
        },
    };

    const selectedStimulus = selectStimulus(coachFeatures);
    const rationale = stimulusRationale(selectedStimulus, coachFeatures);
    const fluidWorkout = buildFluidWorkout(selectedStimulus, { ftp });

    const warnings = [];
    if (tsb < -20) warnings.push('TSB is very negative — consider rest before adding intensity.');
    if (intensityProfile.hardSessionCount >= 3) {
        warnings.push('Multiple hard sessions in the last 14 days — protect recovery.');
    }
    if (weeklyHours <= 5 && intensityProfile.vo2Pct > 10) {
        warnings.push('VO2 volume is high for your weekly hour budget — risk of overreach.');
    }

    const powerHistory = buildCoachPowerHistory(activities, userSettings, ftp);
    const activityLog = buildCoachActivityLog(activities, ftp, { endYmd });
    const todayFocus = buildTodayFocus(activities, ftp, fluidWorkout, endYmd);

    const weekPlan = buildFluidWeekPlan({
        activities,
        userSettings,
        coachContext: {
            ...coachFeatures,
            selectedStimulus,
            stimulusRationale: rationale,
            fluidWorkout,
            warnings,
            powerHistory,
        },
        referenceYmd: endYmd,
    });

    const weekPlanSummary = {
        mondayYmd: weekPlan.mondayYmd,
        sundayYmd: weekPlan.sundayYmd,
        targetTss: weekPlan.targetTss,
        actualTss: weekPlan.actualTss,
        compliancePct: weekPlan.compliancePct,
        sessions: weekPlan.sessions.map((s) => ({
            day: s.day,
            date: s.date,
            stimulus: s.plannedStimulus || s.stimulus,
            workoutName: s.workoutName,
            completed: s.completed,
            isToday: s.isToday,
            movedFromDate: s.movedFromDate || null,
            relocatedFromDate: s.relocatedFromDate || null,
            isUnavailable: s.isUnavailable || false,
            isExplicitlyAvailable: s.isExplicitlyAvailable || false,
        })),
        unavailableDates: weekPlan.unavailableDates || [],
        availableDates: weekPlan.availableDates || [],
        availabilityNote: weekPlan.availabilityNote || null,
    };

    return {
        ...coachFeatures,
        selectedStimulus,
        stimulusRationale: rationale,
        fluidWorkout,
        warnings,
        powerHistory,
        activityLog,
        todayFocus,
        weekPlanSummary,
        generatedAt: new Date().toISOString(),
    };
}
