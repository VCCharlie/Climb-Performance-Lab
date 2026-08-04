/**
 * Multi-week outlook from the fluid week plan — CTL/TSB projection + conservative FTP scenarios.
 */

import { addDaysToYmd } from '../dashboardVolumeTotals';
import { calculateFitnessMetrics } from '../formTabMetrics';
import { todayYmd } from './coachHelpers';
import { estimateSessionTss } from './coachSessionTss';

const CTL_DAYS = 42;
const ATL_DAYS = 7;
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const OUTLOOK_WEEKS = [4, 8, 12];

function round1(n) {
    return Math.round(n * 10) / 10;
}

function ymdToDayName(ymd) {
    const [y, m, d] = ymd.split('-').map(Number);
    return DAY_NAMES[new Date(y, m - 1, d).getDay()];
}

/**
 * @param {object[]} sessions — fluid week plan sessions
 * @param {number} weeklyHours
 * @returns {object}
 */
export function summarizeFluidWeekPattern(sessions, weeklyHours = 5) {
    const rows = (sessions || []).map((s) => {
        const stimulus = s.plannedStimulus || s.stimulus;
        return {
            day: s.day,
            stimulus,
            workoutName: s.workoutName,
            estimatedTss: estimateSessionTss(stimulus, weeklyHours),
            completed: Boolean(s.completed),
            isUnavailable: Boolean(s.isUnavailable),
        };
    });

    const plannedTss = rows.reduce((sum, r) => sum + r.estimatedTss, 0);
    const qualitySessions = rows.filter((r) => ['sweetspot', 'threshold', 'vo2'].includes(r.stimulus)).length;
    const enduranceSessions = rows.filter((r) => r.stimulus === 'endurance').length;

    return {
        sessions: rows,
        plannedWeeklyTss: plannedTss,
        qualitySessions,
        enduranceSessions,
        restDays: rows.filter((r) => r.stimulus === 'rest').length,
    };
}

/**
 * @param {number} ctl
 * @param {number} atl
 * @param {string} startYmd
 * @param {Record<string, number>} dailyTss
 * @param {string} endYmd
 * @returns {{ ctl: number, atl: number, tsb: number }}
 */
function projectToDate(ctl, atl, startYmd, dailyTss, endYmd) {
    const ctlFactor = 1 - Math.exp(-1 / CTL_DAYS);
    const atlFactor = 1 - Math.exp(-1 / ATL_DAYS);
    let current = startYmd;

    while (current && current <= endYmd) {
        const tss = dailyTss[current] || 0;
        ctl += ctlFactor * (tss - ctl);
        atl += atlFactor * (tss - atl);
        const next = addDaysToYmd(current, 1);
        if (!next || next === current) break;
        current = next;
    }

    return { ctl: round1(ctl), atl: round1(atl), tsb: round1(ctl - atl) };
}

/**
 * Build daily TSS map by repeating the fluid week template (Mon–Sun pattern).
 * @param {object[]} templateSessions
 * @param {number} weeklyHours
 * @param {string} startYmd — first projected day (inclusive)
 * @param {string} endYmd
 * @param {number} [compliance=0.85]
 */
export function buildRepeatingWeekDailyTss(templateSessions, weeklyHours, startYmd, endYmd, compliance = 0.85) {
    const tssByDayName = {};
    for (const s of templateSessions || []) {
        const stimulus = s.plannedStimulus || s.stimulus;
        tssByDayName[s.day] = Math.round(estimateSessionTss(stimulus, weeklyHours) * compliance);
    }

    const dailyTss = {};
    let current = startYmd;
    while (current && current <= endYmd) {
        const dayName = ymdToDayName(current);
        dailyTss[current] = tssByDayName[dayName] || 0;
        const next = addDaysToYmd(current, 1);
        if (!next || next === current) break;
        current = next;
    }

    return dailyTss;
}

/**
 * @param {object} params
 * @returns {object[]}
 */
export function projectFitnessMilestones({
    activities,
    templateSessions,
    weeklyHours = 5,
    referenceYmd = todayYmd(),
    weeksList = OUTLOOK_WEEKS,
    compliance = 0.85,
}) {
    const historical = calculateFitnessMetrics(activities);
    const latest = historical[historical.length - 1] || { ctl: 0, atl: 0, tsb: 0 };
    const projectionStart = addDaysToYmd(referenceYmd, 1);

    return weeksList.map((weeks) => {
        const endYmd = addDaysToYmd(referenceYmd, weeks * 7);
        const dailyTss = buildRepeatingWeekDailyTss(
            templateSessions,
            weeklyHours,
            projectionStart,
            endYmd,
            compliance,
        );
        const projected = projectToDate(latest.ctl, latest.atl, projectionStart, dailyTss, endYmd);
        const pattern = summarizeFluidWeekPattern(templateSessions, weeklyHours);

        return {
            weeks,
            endDate: endYmd,
            ctl: projected.ctl,
            atl: projected.atl,
            tsb: projected.tsb,
            avgWeeklyTss: Math.round(pattern.plannedWeeklyTss * compliance),
            complianceAssumedPct: Math.round(compliance * 100),
        };
    });
}

/**
 * Conservative FTP scenarios if the athlete follows the fluid week plan.
 * @param {object} params
 */
export function projectFtpScenarios({
    currentFtp,
    templateSessions,
    weeklyHours = 5,
    currentCtl = 0,
    weeksList = OUTLOOK_WEEKS,
    compliance = 0.85,
}) {
    if (!currentFtp || currentFtp <= 0) return [];

    const pattern = summarizeFluidWeekPattern(templateSessions, weeklyHours);
    let weeklyGainRate = 0.0018;
    if (weeklyHours <= 4) weeklyGainRate = 0.0012;
    else if (weeklyHours >= 6) weeklyGainRate = 0.0022;

    if (pattern.qualitySessions >= 2 && pattern.qualitySessions <= 3) weeklyGainRate *= 1.1;
    if (pattern.qualitySessions > 3) weeklyGainRate *= 0.9;
    if (pattern.plannedWeeklyTss < 200) weeklyGainRate *= 0.85;
    if (currentCtl > 70) weeklyGainRate *= 0.75;
    if (pattern.plannedWeeklyTss > 280) weeklyGainRate *= 1.05;

    return weeksList.map((weeks) => {
        const effectiveWeeks = weeks * compliance;
        const mid = currentFtp * (1 + weeklyGainRate * effectiveWeeks);
        const low = mid * 0.96;
        const high = mid * 1.05;

        return {
            weeks,
            currentFtp,
            projectedFtpLow: Math.round(low),
            projectedFtpMid: Math.round(mid),
            projectedFtpHigh: Math.round(high),
            gainWattsMid: Math.round(mid - currentFtp),
            gainPctMid: Math.round(((mid / currentFtp) - 1) * 1000) / 10,
            complianceAssumedPct: Math.round(compliance * 100),
        };
    });
}

/**
 * @param {object} params
 * @param {object} params.weekPlan — full buildFluidWeekPlan result
 * @param {object} params.coachFeatures — athlete, fitness, weeklyLoad, etc.
 * @param {object[]} params.activities
 * @param {number} params.weeklyHours
 * @param {string} [params.referenceYmd]
 */
export function buildCoachPlanOutlook({
    weekPlan,
    coachFeatures,
    activities,
    weeklyHours = 5,
    referenceYmd = todayYmd(),
}) {
    const templateSessions = weekPlan?.sessions || [];
    const pattern = summarizeFluidWeekPattern(templateSessions, weeklyHours);
    const compliance = 0.85;

    const fitnessMilestones = projectFitnessMilestones({
        activities,
        templateSessions,
        weeklyHours,
        referenceYmd,
        compliance,
    });

    const ftpScenarios = projectFtpScenarios({
        currentFtp: coachFeatures?.athlete?.ftp || 0,
        templateSessions,
        weeklyHours,
        currentCtl: coachFeatures?.fitness?.ctl || 0,
        compliance,
    });

    return {
        source: 'fluid_week_plan',
        weekRange: {
            mondayYmd: weekPlan?.mondayYmd,
            sundayYmd: weekPlan?.sundayYmd,
        },
        weeklyPattern: pattern,
        targetTss: weekPlan?.targetTss,
        actualTssThisWeek: weekPlan?.actualTss,
        compliancePctThisWeek: weekPlan?.compliancePct,
        unavailableDates: weekPlan?.unavailableDates || [],
        availabilityNote: weekPlan?.availabilityNote || null,
        rebalanceNote: weekPlan?.rebalanceNote || null,
        fitnessMilestones,
        ftpScenarios,
        assumptions: [
            `Assumes ~${Math.round(compliance * 100)}% adherence to the current fluid week template (including rebalancing).`,
            'FTP ranges are conservative estimates for a 4–7 h/week athlete — not lab-tested predictions.',
            'Sweetspot-heavy plans typically yield modest FTP gains; large jumps require more volume or a lower starting CTL.',
            'Missed sessions, illness, or extra unplanned intensity will shift outcomes.',
        ],
    };
}
