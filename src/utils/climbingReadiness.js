/**
 * Climbing readiness score for Dashboard overview.
 * Combines recent elevation, Z2 proxy (NP/avg vs FTP), weekly TSS, and current TSB.
 */

import { normalizeDate } from './formatters';
import { activityMovingTimeSec } from './activityFilterMetrics';
import { currentWeekRange, currentMonthRange } from './volumeGoals';
import { calculateFitnessMetrics } from './formTabMetrics';
import { z2PowerBandFromFtp } from './profileFtp';

export const Z2_IF_MIN = 0.55;
export const Z2_IF_MAX = 0.75;

/** User-facing explanation for Dashboard help panel. */
export const CLIMBING_READINESS_EXPLANATION = {
    title: 'How the score works',
    summary:
        'The score (0–100) estimates how ready you are for a hard climb this week. It is not FTP — it blends recent climbing volume, endurance work, load, and freshness.',
    weights: [
        '30% — Elevation climbed this period (m)',
        '25% — Z2 endurance proxy (ride time at 55–75% FTP using NP or avg power)',
        '20% — Training load (TSS) for the period',
        '25% — Form (TSB from your activity history)',
    ],
    badges: [
        'Prioritize recovery — very negative TSB',
        'Building base — score below ~65 or light climbing volume',
        'Good climbing form — balanced metrics',
        'Peak climb readiness — high score with fresh TSB (+0 to +22)',
    ],
    historyNote:
        'Weekly and monthly history below re-runs the same formula on past calendar windows. TSB uses your form at the end of each window.',
};

/** @typedef {'recover' | 'building' | 'good' | 'peak'} ReadinessBadgeKey */

/**
 * @param {object} a
 * @param {number} ftp
 * @returns {number | null} intensity factor 0–1+
 */
function activityIntensityFactor(a, ftp) {
    if (!ftp || ftp <= 0) return null;
    const watts = Number(a?.norm_power) || Number(a?.avg_power) || 0;
    if (!watts || watts <= 0) return null;
    return watts / ftp;
}

/**
 * @param {object[]} activities
 * @param {string} startYmd
 * @param {string} endYmd
 */
function filterActivitiesInYmdRange(activities, startYmd, endYmd) {
    const out = [];
    for (const a of activities || []) {
        const ymd = normalizeDate(a?.date);
        if (!ymd || ymd.length < 10) continue;
        if (ymd >= startYmd && ymd <= endYmd) out.push(a);
    }
    return out;
}

/**
 * @param {number} value
 * @param {number} goodAt
 * @param {number} [maxAt]
 */
function rampScore(value, goodAt, maxAt) {
    const v = Math.max(0, Number(value) || 0);
    if (v <= 0 || goodAt <= 0) return 0;
    const cap = maxAt != null && maxAt > goodAt ? maxAt : goodAt * 1.25;
    if (v >= cap) return 100;
    if (v >= goodAt) {
        return 80 + Math.round(((v - goodAt) / (cap - goodAt)) * 20);
    }
    return Math.round((v / goodAt) * 80);
}

/**
 * Weekly TSS sweet spot for active climbers (not event week).
 * @param {number} weekTss
 */
function scoreWeeklyTss(weekTss) {
    const t = Math.max(0, Number(weekTss) || 0);
    if (t < 80) return Math.round((t / 80) * 50);
    if (t <= 180) return 50 + Math.round(((t - 80) / 100) * 30);
    if (t <= 350) return 80 + Math.round(((t - 180) / 170) * 20);
    if (t <= 500) return 100 - Math.round(((t - 350) / 150) * 25);
    return Math.max(40, 75 - Math.round(((t - 500) / 200) * 20));
}

/**
 * TSB race-readiness curve: best around +5 to +20.
 * @param {number | null} tsb
 */
function scoreTsb(tsb) {
    if (tsb == null || Number.isNaN(tsb)) return 50;
    if (tsb < -25) return 15;
    if (tsb < -10) return 35;
    if (tsb < 0) return 55;
    if (tsb <= 20) return 80 + Math.round((tsb / 20) * 20);
    if (tsb <= 30) return 80;
    return Math.max(50, 80 - Math.round(((tsb - 30) / 20) * 30));
}

/**
 * @param {number} elevationScore
 * @param {number} z2Score
 * @param {number} tssScore
 * @param {number} tsbScore
 * @param {number | null} tsb
 * @returns {{ key: ReadinessBadgeKey, label: string, tone: string }}
 */
function resolveBadge(elevationScore, z2Score, tssScore, tsbScore, tsb) {
    const composite = Math.round(
        elevationScore * 0.3 + z2Score * 0.25 + tssScore * 0.2 + tsbScore * 0.25,
    );

    if (tsb != null && tsb < -20) {
        return { key: 'recover', label: 'Prioritize recovery', tone: 'red' };
    }
    if (composite >= 82 && tsb != null && tsb >= 0 && tsb <= 22) {
        return { key: 'peak', label: 'Peak climb readiness', tone: 'green' };
    }
    if (composite >= 65) {
        return { key: 'good', label: 'Good climbing form', tone: 'emerald' };
    }
    if (composite >= 40) {
        return { key: 'building', label: 'Building base', tone: 'yellow' };
    }
    return { key: 'building', label: 'Needs more climbing volume', tone: 'yellow' };
}

function scorePeriodTss(totalTss, periodDays) {
    const days = Math.max(1, Number(periodDays) || 7);
    const weeklyEquivalent = (Number(totalTss) || 0) / (days / 7);
    return scoreWeeklyTss(weeklyEquivalent);
}

/**
 * @param {object[]} activities
 * @param {string} endYmd
 */
function fitnessSnapshotAtOrBefore(activities, endYmd) {
    const fitness = calculateFitnessMetrics(activities);
    if (!fitness.length) return null;
    let match = null;
    for (const row of fitness) {
        const d = normalizeDate(row?.date);
        if (!d || d.length < 10) continue;
        if (d <= endYmd) match = row;
    }
    return match ?? fitness[fitness.length - 1];
}

/**
 * @param {object[]} activities
 * @param {number} ftp
 * @param {string} startYmd
 * @param {string} endYmd
 * @param {string} periodLabel
 * @param {Date} referenceDate
 * @param {number} [periodDays]
 */
function computeClimbingReadinessForRange(
    activities,
    ftp,
    startYmd,
    endYmd,
    periodLabel,
    referenceDate,
    periodDays = 7,
) {
    const periodActs = filterActivitiesInYmdRange(activities, startYmd, endYmd);

    let elevationM = 0;
    let periodTss = 0;
    let z2Seconds = 0;

    for (const a of periodActs) {
        elevationM += Math.max(0, Number(a?.climbing) || 0);
        periodTss += Math.max(0, Number(a?.load) || 0);

        const ifac = activityIntensityFactor(a, ftp);
        const movingSec = activityMovingTimeSec(a);
        if (ifac != null && movingSec != null && ifac >= Z2_IF_MIN && ifac <= Z2_IF_MAX) {
            z2Seconds += movingSec;
        }
    }

    const z2Hours = z2Seconds / 3600;
    const latestFitness = fitnessSnapshotAtOrBefore(activities, endYmd);
    const tsb = latestFitness?.tsb ?? null;

    const elevationScore = rampScore(elevationM, 600, 1200);
    const z2Score = ftp > 0 ? rampScore(z2Hours, 3, 6) : rampScore(z2Hours, 2, 5);
    const tssScore = scorePeriodTss(periodTss, periodDays);
    const tsbScore = scoreTsb(tsb);

    const badge = resolveBadge(elevationScore, z2Score, tssScore, tsbScore, tsb);
    const composite = Math.round(
        elevationScore * 0.3 + z2Score * 0.25 + tssScore * 0.2 + tsbScore * 0.25,
    );

    const hints = [];
    if (elevationScore < 60) {
        hints.push('Add hill repeats or a longer climb ride this week.');
    }
    if (ftp > 0 && z2Score < 60) {
        const band = z2PowerBandFromFtp(ftp);
        if (band) {
            hints.push(
                `More steady Z2 time (${band.minPct}–${band.maxPct}% FTP, about ${band.minW}–${band.maxW} W) supports climbing endurance.`,
            );
        } else {
            hints.push('More steady Z2 time (roughly 55–75% FTP) supports climbing endurance.');
        }
    }
    if (tssScore < 55) {
        hints.push('Weekly training load is light — build volume gradually if you feel fresh.');
    }
    if (tsb != null && tsb < -10) {
        hints.push('TSB is negative — balance hard climbs with easier recovery days.');
    }
    if (tsb != null && tsb > 25) {
        hints.push('You are very fresh — a quality climb session could sharpen race form.');
    }

    const z2Band = ftp > 0 ? z2PowerBandFromFtp(ftp) : null;

    return {
        weekLabel: periodLabel,
        composite,
        badge,
        metrics: {
            elevationM: Math.round(elevationM),
            weekTss: Math.round(periodTss),
            z2Hours: Math.round(z2Hours * 10) / 10,
            tsb,
            ctl: latestFitness?.ctl ?? null,
            rideCount: periodActs.length,
        },
        z2Band,
        scores: {
            elevation: elevationScore,
            z2: z2Score,
            tss: tssScore,
            tsb: tsbScore,
        },
        hints: hints.slice(0, 3),
        hasFtp: ftp > 0,
    };
}

/**
 * Past weekly and monthly scores using the same formula.
 * @param {object} params
 * @param {object[]} params.activities
 * @param {number} [params.ftp]
 * @param {Date} [params.referenceDate]
 * @param {number} [params.weekCount]
 * @param {number} [params.monthCount]
 */
export function computeClimbingReadinessHistory({
    activities,
    ftp = 0,
    referenceDate = new Date(),
    weekCount = 8,
    monthCount = 6,
}) {
    const weeks = [];
    for (let i = 0; i < weekCount; i += 1) {
        const d = new Date(referenceDate);
        d.setDate(d.getDate() - i * 7);
        const week = currentWeekRange(d);
        const result = computeClimbingReadinessForRange(
            activities,
            ftp,
            week.startYmd,
            week.endYmd,
            week.label,
            d,
            7,
        );
        weeks.push({
            label: i === 0 ? 'This week' : week.label,
            composite: result.composite,
            badgeKey: result.badge.key,
            badgeLabel: result.badge.label,
        });
    }

    const months = [];
    for (let i = 0; i < monthCount; i += 1) {
        const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 15);
        const month = currentMonthRange(d);
        const endRef = new Date(month.endYmd + 'T12:00:00');
        const start = new Date(month.startYmd + 'T12:00:00');
        const periodDays = Math.max(
            1,
            Math.round((endRef.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1,
        );
        const result = computeClimbingReadinessForRange(
            activities,
            ftp,
            month.startYmd,
            month.endYmd,
            month.label,
            endRef,
            periodDays,
        );
        months.push({
            label: month.label,
            composite: result.composite,
            badgeKey: result.badge.key,
            badgeLabel: result.badge.label,
        });
    }

    return { weeks, months };
}

/**
 * @param {object} params
 * @param {object[]} params.activities
 * @param {number} [params.ftp]
 * @param {Date} [params.referenceDate]
 */
export function computeClimbingReadiness({ activities, ftp = 0, referenceDate = new Date() }) {
    const week = currentWeekRange(referenceDate);
    return computeClimbingReadinessForRange(
        activities,
        ftp,
        week.startYmd,
        week.endYmd,
        week.label,
        referenceDate,
        7,
    );
}
