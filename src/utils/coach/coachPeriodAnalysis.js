/**
 * Narrative period review for the AI Coach — deterministic analysis over X weeks.
 */

import { addDaysToYmd } from '../dashboardVolumeTotals';
import { calculateFitnessMetrics } from '../formTabMetrics';
import {
    activityIF,
    filterActivitiesInRange,
    sumTss,
    movingTimeSec,
    bestInRange,
    todayYmd,
    weeklyTssTarget,
} from './coachHelpers';

function periodMetrics(activities, startYmd, endYmd, ftp) {
    const list = filterActivitiesInRange(activities, startYmd, endYmd);
    const days = Math.max(1, daysBetween(startYmd, endYmd));
    const weeks = Math.max(1, days / 7);

    let totalSeconds = 0;
    let totalKm = 0;
    let totalElev = 0;
    let hardSessions = 0;
    let virtualCount = 0;
    let longRideCount = 0;

    for (const a of list) {
        totalSeconds += movingTimeSec(a.moving_time);
        totalKm += Number(a.distance) || 0;
        totalElev += Number(a.climbing) || 0;
        const ifVal = activityIF(a, ftp);
        if (ifVal != null && ifVal > 0.90) hardSessions += 1;
        if (String(a.type || '').toLowerCase().includes('virtual')) virtualCount += 1;
        if (movingTimeSec(a.moving_time) >= 2 * 3600) longRideCount += 1;
    }

    const totalTss = sumTss(list);
    const fitness = calculateFitnessMetrics(activities);
    let endTsb = null;
    let endCtl = null;
    for (const row of fitness) {
        if (row.date <= endYmd) {
            endTsb = row.tsb;
            endCtl = row.ctl;
        }
    }

    return {
        rideCount: list.length,
        ridesPerWeek: Math.round((list.length / weeks) * 10) / 10,
        hoursPerWeek: Math.round((totalSeconds / weeks / 3600) * 10) / 10,
        kmPerWeek: Math.round((totalKm / weeks) * 10) / 10,
        elevPerWeek: Math.round(totalElev / weeks),
        tssPerWeek: Math.round(totalTss / weeks),
        hardSessions,
        hardPerWeek: Math.round((hardSessions / weeks) * 10) / 10,
        longRideCount,
        virtualPct: list.length > 0 ? Math.round((virtualCount / list.length) * 100) : 0,
        best5min: bestInRange(list, 'best_5min'),
        best20min: bestInRange(list, 'best_20min'),
        best60min: bestInRange(list, 'best_60min'),
        endTsb,
        endCtl,
        weeks,
    };
}

function daysBetween(startYmd, endYmd) {
    const ms = new Date(endYmd).getTime() - new Date(startYmd).getTime();
    return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1);
}

function buildSwot(metrics, ftp, weeklyHours) {
    const strengths = [];
    const weaknesses = [];
    const opportunities = [];
    const threats = [];
    const targetTss = weeklyTssTarget(weeklyHours);

    if (metrics.ridesPerWeek >= 3) {
        strengths.push({
            label: 'Consistent frequency',
            context: `You averaged ${metrics.ridesPerWeek} rides/week — regular stimulus supports FTP gains.`,
        });
    } else if (metrics.ridesPerWeek < 2) {
        weaknesses.push({
            label: 'Low training frequency',
            context: `Only ${metrics.ridesPerWeek} rides/week on average. FTP progress needs at least 2–3 weekly sessions.`,
        });
    }

    if (metrics.tssPerWeek >= targetTss * 0.85 && metrics.tssPerWeek <= targetTss * 1.15) {
        strengths.push({
            label: 'Load on target',
            context: `Weekly TSS (~${metrics.tssPerWeek}) matches your ${weeklyHours}h/week budget (~${targetTss} TSS).`,
        });
    } else if (metrics.tssPerWeek < targetTss * 0.7) {
        opportunities.push({
            label: 'Room to add volume',
            context: `At ~${metrics.tssPerWeek} TSS/week you are below target (${targetTss}). More Z2 time is the safest lever.`,
        });
    } else if (metrics.tssPerWeek > targetTss * 1.25) {
        threats.push({
            label: 'Load above budget',
            context: `~${metrics.tssPerWeek} TSS/week exceeds your ${weeklyHours}h target. Watch for accumulating fatigue.`,
        });
    }

    if (metrics.hardPerWeek > 2.5) {
        threats.push({
            label: 'Intensity overload',
            context: `${metrics.hardSessions} hard sessions (>90% FTP) in ${metrics.weeks} weeks — too many for limited hours.`,
        });
    } else if (metrics.hardPerWeek < 0.5 && metrics.rideCount >= 4) {
        weaknesses.push({
            label: 'Lack of quality stimulus',
            context: 'Few sessions above 90% FTP. Sweetspot or threshold work is needed to raise FTP.',
        });
    } else if (metrics.hardPerWeek >= 0.8 && metrics.hardPerWeek <= 2) {
        strengths.push({
            label: 'Balanced intensity',
            context: `~${metrics.hardPerWeek} quality sessions/week — appropriate for time-crunched FTP building.`,
        });
    }

    if (ftp > 0 && metrics.best20min > ftp * 1.02) {
        strengths.push({
            label: 'FTP may be understated',
            context: `Best 20-min power (${metrics.best20min}W) exceeds current FTP (${ftp}W) — consider retesting.`,
        });
    }

    if (metrics.longRideCount < Math.max(1, Math.floor(metrics.weeks * 0.25)) && metrics.rideCount >= 4) {
        weaknesses.push({
            label: 'Few long rides',
            context: `Only ${metrics.longRideCount} ride(s) ≥2h in this block. Sustained power needs occasional longer Z2.`,
        });
    }

    if (metrics.endTsb != null && metrics.endTsb < -20) {
        threats.push({
            label: 'Accumulated fatigue',
            context: `Form (TSB) ended at ${metrics.endTsb} — schedule a recovery week before building again.`,
        });
    } else if (metrics.endTsb != null && metrics.endTsb > 5 && metrics.endTsb < 25) {
        strengths.push({
            label: 'Good freshness',
            context: `TSB at ${metrics.endTsb} suggests you absorbed the block well and can handle quality work.`,
        });
    }

    if (metrics.virtualPct > 65 && metrics.rideCount >= 4) {
        threats.push({
            label: 'Mostly indoor',
            context: `${metrics.virtualPct}% virtual rides — transfer to outdoor polder riding may be limited.`,
        });
    }

    if (strengths.length === 0) {
        strengths.push({ label: 'Stable baseline', context: 'No extreme patterns — a good platform to refine focus.' });
    }
    if (weaknesses.length === 0) {
        weaknesses.push({ label: 'No major gaps', context: 'Training distribution looks reasonable for your hour budget.' });
    }
    if (opportunities.length === 0) {
        opportunities.push({
            label: 'Sharpen sweetspot focus',
            context: 'Adding 1 structured sweetspot ride/week is the highest-ROI FTP lever at 4–7 h/week.',
        });
    }
    if (threats.length === 0) {
        threats.push({
            label: 'Monitor stacking',
            context: 'No red flags now — keep watching if you add a second quality day or extra group rides.',
        });
    }

    return { strengths, weaknesses, opportunities, threats };
}

function buildVerdict(metrics, ftp, weeklyHours, swot) {
    const targetTss = weeklyTssTarget(weeklyHours);
    const paragraphs = [];

    paragraphs.push(
        `Over the last ${metrics.weeks} week(s) you logged ${metrics.rideCount} rides `
        + `(~${metrics.hoursPerWeek} h/week, ~${metrics.tssPerWeek} TSS/week). `
        + `For a ${weeklyHours}h/week FTP-focused plan, the target is roughly ${targetTss} TSS/week.`
    );

    if (metrics.tssPerWeek >= targetTss * 0.85 && metrics.tssPerWeek <= targetTss * 1.15) {
        paragraphs.push(
            'Your training load sits in the sweet spot for progressive overload without reckless volume.'
        );
    } else if (metrics.tssPerWeek < targetTss * 0.7) {
        paragraphs.push(
            'You are under your load budget. The main opportunity is adding easy endurance time — not more intensity.'
        );
    } else {
        paragraphs.push(
            'Load is above your hour budget. Prioritize recovery and resist adding more hard sessions until TSB recovers.'
        );
    }

    if (ftp > 0 && metrics.best20min > 0) {
        const ratio = Math.round((metrics.best20min / ftp) * 100);
        paragraphs.push(
            `Your best 20-min power in this block was ${metrics.best20min}W (${ratio}% of FTP). `
            + (ratio >= 98
                ? 'That suggests your FTP estimate may be conservative — a retest could unlock better zone targets.'
                : 'Sweetspot and threshold blocks will help close the gap to a higher FTP.')
        );
    }

    if (metrics.endTsb != null) {
        paragraphs.push(
            `Current form (TSB): ${metrics.endTsb}. `
            + (metrics.endTsb < -15
                ? 'Take a recovery week before the next build block.'
                : metrics.endTsb > 10
                    ? 'You are fresh enough for a quality sweetspot or threshold session.'
                    : 'Load and recovery look balanced — maintain the current rhythm.')
        );
    }

    const threatCount = swot.threats.filter((t) =>
        !t.label.includes('Monitor')
    ).length;
    const strengthCount = swot.strengths.filter((s) =>
        !s.label.includes('Stable baseline')
    ).length;

    let headline;
    let grade;
    if (threatCount >= 2) {
        headline = 'Caution: fatigue or overload signals detected';
        grade = 'caution';
    } else if (strengthCount >= 2 && metrics.tssPerWeek >= targetTss * 0.8) {
        headline = 'Solid block — keep building with sweetspot focus';
        grade = 'good';
    } else if (metrics.tssPerWeek < targetTss * 0.7) {
        headline = 'Under-trained for your goal — add easy volume';
        grade = 'building';
    } else {
        headline = 'On track — refine quality distribution';
        grade = 'neutral';
    }

    const nextSteps = [];
    if (metrics.hardPerWeek < 0.8) {
        nextSteps.push('Add 1 sweetspot session per week (3×8 min on open polder stretches).');
    }
    if (metrics.longRideCount < 1 && metrics.weeks >= 2) {
        nextSteps.push('Plan one ride ≥2h at Z2 within the next 10 days.');
    }
    if (metrics.endTsb != null && metrics.endTsb < -15) {
        nextSteps.push('Recovery week: drop intensity, keep only Z1–Z2 for 5–7 days.');
    }
    if (metrics.ridesPerWeek < 2.5) {
        nextSteps.push('Fix a weekly schedule (e.g. Tue / Thu / Sat) before chasing more watts.');
    }
    if (nextSteps.length === 0) {
        nextSteps.push('Maintain current load; swap one Z2 ride for sweetspot if FTP stalls.');
    }

    return { headline, grade, paragraphs, nextSteps };
}

/**
 * @param {object[]} activities
 * @param {object} userSettings
 * @param {number} weeks — 4, 8, or 12
 * @returns {object}
 */
export function analyzeTrainingPeriod(activities, userSettings, weeks = 4) {
    const ftp = Number(userSettings?.ftp) || 0;
    const weeklyHours = Number(userSettings?.weeklyHoursTarget) || 5;
    const endYmd = todayYmd();
    const startYmd = addDaysToYmd(endYmd, -(weeks * 7 - 1));

    const metrics = periodMetrics(activities, startYmd, endYmd, ftp);
    const swot = buildSwot(metrics, ftp, weeklyHours);
    const verdict = buildVerdict(metrics, ftp, weeklyHours, swot);

    return {
        weeks,
        periodLabel: `${startYmd} – ${endYmd}`,
        metrics,
        swot,
        verdict,
    };
}

export const PERIOD_REVIEW_OPTIONS = [
    { weeks: 4, label: 'Last 4 weeks' },
    { weeks: 8, label: 'Last 8 weeks' },
    { weeks: 12, label: 'Last 12 weeks' },
];
