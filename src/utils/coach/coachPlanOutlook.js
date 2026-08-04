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

function daysBetweenYmd(startYmd, endYmd) {
    const [y1, m1, d1] = startYmd.split('-').map(Number);
    const [y2, m2, d2] = endYmd.split('-').map(Number);
    const start = new Date(y1, m1 - 1, d1).getTime();
    const end = new Date(y2, m2 - 1, d2).getTime();
    return Math.floor((end - start) / (1000 * 60 * 60 * 24));
}

function buildTssByDayName(templateSessions, weeklyHours, compliance) {
    const tssByDayName = {};
    for (const s of templateSessions || []) {
        const stimulus = s.plannedStimulus || s.stimulus;
        tssByDayName[s.day] = Math.round(estimateSessionTss(stimulus, weeklyHours) * compliance);
    }
    return tssByDayName;
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
    const tssByDayName = buildTssByDayName(templateSessions, weeklyHours, compliance);

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
 * Alternate week 1 / week 2 templates when projecting multi-week load.
 * @param {object} params
 */
export function buildAlternatingWeeksDailyTss({
    week1Sessions,
    week2Sessions,
    week1MondayYmd,
    weeklyHours,
    startYmd,
    endYmd,
    compliance = 0.85,
}) {
    const week1Tss = buildTssByDayName(week1Sessions, weeklyHours, compliance);
    const week2Tss = buildTssByDayName(week2Sessions, weeklyHours, compliance);
    const dailyTss = {};
    let current = startYmd;

    while (current && current <= endYmd) {
        const weeksSince = Math.max(0, Math.floor(daysBetweenYmd(week1MondayYmd, current) / 7));
        const useWeek2 = Boolean(week2Sessions?.length) && weeksSince % 2 === 1;
        const dayName = ymdToDayName(current);
        const template = useWeek2 ? week2Tss : week1Tss;
        dailyTss[current] = template[dayName] || 0;
        const next = addDaysToYmd(current, 1);
        if (!next || next === current) break;
        current = next;
    }

    return dailyTss;
}

/**
 * Average week 1 + week 2 patterns when both are active.
 * @param {object[]} week1Sessions
 * @param {object[]} [week2Sessions]
 * @param {number} weeklyHours
 */
export function summarizeAlternatingWeekPattern(week1Sessions, week2Sessions, weeklyHours = 5) {
    const week1 = summarizeFluidWeekPattern(week1Sessions, weeklyHours);
    if (!week2Sessions?.length) return week1;

    const week2 = summarizeFluidWeekPattern(week2Sessions, weeklyHours);
    return {
        ...week1,
        plannedWeeklyTss: Math.round((week1.plannedWeeklyTss + week2.plannedWeeklyTss) / 2),
        qualitySessions: Math.round((week1.qualitySessions + week2.qualitySessions) / 2),
        enduranceSessions: Math.round((week1.enduranceSessions + week2.enduranceSessions) / 2),
        restDays: Math.round((week1.restDays + week2.restDays) / 2),
        week2Pattern: week2,
    };
}

/**
 * @param {object} params
 * @returns {object[]}
 */
export function projectFitnessMilestones({
    activities,
    templateSessions,
    week2TemplateSessions = null,
    week1MondayYmd = null,
    weeklyHours = 5,
    referenceYmd = todayYmd(),
    weeksList = OUTLOOK_WEEKS,
    compliance = 0.85,
}) {
    const historical = calculateFitnessMetrics(activities);
    const latest = historical[historical.length - 1] || { ctl: 0, atl: 0, tsb: 0 };
    const projectionStart = addDaysToYmd(referenceYmd, 1);
    const pattern = summarizeAlternatingWeekPattern(templateSessions, week2TemplateSessions, weeklyHours);

    return weeksList.map((weeks) => {
        const endYmd = addDaysToYmd(referenceYmd, weeks * 7);
        const dailyTss = week2TemplateSessions?.length && week1MondayYmd
            ? buildAlternatingWeeksDailyTss({
                week1Sessions: templateSessions,
                week2Sessions: week2TemplateSessions,
                week1MondayYmd,
                weeklyHours,
                startYmd: projectionStart,
                endYmd,
                compliance,
            })
            : buildRepeatingWeekDailyTss(
                templateSessions,
                weeklyHours,
                projectionStart,
                endYmd,
                compliance,
            );
        const projected = projectToDate(latest.ctl, latest.atl, projectionStart, dailyTss, endYmd);

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
    week2TemplateSessions = null,
    weeklyHours = 5,
    currentCtl = 0,
    weeksList = OUTLOOK_WEEKS,
    compliance = 0.85,
}) {
    if (!currentFtp || currentFtp <= 0) return [];

    const pattern = summarizeAlternatingWeekPattern(templateSessions, week2TemplateSessions, weeklyHours);
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
 * Compare projected FTP gains against the athlete's Settings target FTP.
 * @param {object} params
 */
export function buildTargetFtpOutlook({ currentFtp, targetFtp, ftpScenarios }) {
    const target = Number(targetFtp);
    if (!target || target <= 0 || !currentFtp || currentFtp <= 0) return null;

    const gapWatts = target - currentFtp;
    const gapPct = Math.round((gapWatts / currentFtp) * 1000) / 10;
    const milestones = (ftpScenarios || []).map((scenario) => ({
        weeks: scenario.weeks,
        projectedFtpMid: scenario.projectedFtpMid,
        reachesTarget: scenario.projectedFtpMid >= target,
        wattsToTarget: Math.max(0, target - scenario.projectedFtpMid),
    }));

    let estimatedWeeksToTarget = null;
    const longest = ftpScenarios?.[ftpScenarios.length - 1];
    if (longest && longest.gainWattsMid > 0 && gapWatts > 0) {
        const effectiveWeeks = longest.weeks * (longest.complianceAssumedPct / 100);
        const weeklyGain = longest.gainWattsMid / effectiveWeeks;
        estimatedWeeksToTarget = Math.ceil(gapWatts / weeklyGain);
    }

    return {
        currentFtp,
        targetFtp: target,
        gapWatts,
        gapPct,
        alreadyAtTarget: currentFtp >= target,
        milestones,
        estimatedWeeksToTarget,
    };
}

/**
 * @param {object} params
 * @param {object} params.weekPlan — full buildFluidWeekPlan result
 * @param {object} [params.week2Plan] — optional week 2 plan when enabled in UI
 * @param {number} [params.targetFtp] — goal FTP from Settings
 * @param {object} params.coachFeatures — athlete, fitness, weeklyLoad, etc.
 * @param {object[]} params.activities
 * @param {number} params.weeklyHours
 * @param {string} [params.referenceYmd]
 */
export function buildCoachPlanOutlook({
    weekPlan,
    week2Plan = null,
    targetFtp = null,
    coachFeatures,
    activities,
    weeklyHours = 5,
    referenceYmd = todayYmd(),
}) {
    const templateSessions = weekPlan?.sessions || [];
    const week2Sessions = week2Plan?.sessions || null;
    const includeWeek2 = Boolean(week2Sessions?.length);
    const pattern = summarizeAlternatingWeekPattern(templateSessions, week2Sessions, weeklyHours);
    const compliance = 0.85;

    const fitnessMilestones = projectFitnessMilestones({
        activities,
        templateSessions,
        week2TemplateSessions: includeWeek2 ? week2Sessions : null,
        week1MondayYmd: weekPlan?.mondayYmd,
        weeklyHours,
        referenceYmd,
        compliance,
    });

    const ftpScenarios = projectFtpScenarios({
        currentFtp: coachFeatures?.athlete?.ftp || 0,
        templateSessions,
        week2TemplateSessions: includeWeek2 ? week2Sessions : null,
        weeklyHours,
        currentCtl: coachFeatures?.fitness?.ctl || 0,
        compliance,
    });

    const targetFtpOutlook = buildTargetFtpOutlook({
        currentFtp: coachFeatures?.athlete?.ftp || 0,
        targetFtp: targetFtp ?? coachFeatures?.athlete?.targetFtp,
        ftpScenarios,
    });

    const assumptions = [
        includeWeek2
            ? `Assumes ~${Math.round(compliance * 100)}% adherence, alternating your week 1 and week 2 fluid templates.`
            : `Assumes ~${Math.round(compliance * 100)}% adherence to the current fluid week template (including rebalancing).`,
        'FTP ranges are conservative estimates for a 4–7 h/week athlete — not lab-tested predictions.',
        'Sweetspot-heavy plans typically yield modest FTP gains; large jumps require more volume or a lower starting CTL.',
        'Missed sessions, illness, or extra unplanned intensity will shift outcomes.',
    ];

    if (targetFtpOutlook && !targetFtpOutlook.alreadyAtTarget) {
        assumptions.push(
            `Your Settings target FTP is ${targetFtpOutlook.targetFtp}W (${targetFtpOutlook.gapWatts > 0 ? '+' : ''}${targetFtpOutlook.gapWatts}W from current).`,
        );
    }

    return {
        source: 'fluid_week_plan',
        includeWeek2,
        weekRange: {
            mondayYmd: weekPlan?.mondayYmd,
            sundayYmd: weekPlan?.sundayYmd,
        },
        week2Range: includeWeek2
            ? { mondayYmd: week2Plan.mondayYmd, sundayYmd: week2Plan.sundayYmd }
            : null,
        weeklyPattern: pattern,
        targetTss: weekPlan?.targetTss,
        actualTssThisWeek: weekPlan?.actualTss,
        compliancePctThisWeek: weekPlan?.compliancePct,
        unavailableDates: weekPlan?.unavailableDates || [],
        availabilityNote: weekPlan?.availabilityNote || null,
        rebalanceNote: weekPlan?.rebalanceNote || null,
        fitnessMilestones,
        ftpScenarios,
        targetFtpOutlook,
        assumptions,
    };
}
