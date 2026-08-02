/**
 * Climbing readiness score for Dashboard overview.
 * Combines recent elevation, Z2 proxy (NP/avg vs FTP), weekly TSS, and current TSB.
 */

import { normalizeDate } from './formatters';
import { activityMovingTimeSec } from './activityFilterMetrics';
import { currentWeekRange } from './volumeGoals';
import { calculateFitnessMetrics } from './formTabMetrics';
import { z2PowerBandFromFtp } from './profileFtp';

export const Z2_IF_MIN = 0.55;
export const Z2_IF_MAX = 0.75;

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

/**
 * @param {object} params
 * @param {object[]} params.activities
 * @param {number} [params.ftp]
 * @param {Date} [params.referenceDate]
 */
export function computeClimbingReadiness({ activities, ftp = 0, referenceDate = new Date() }) {
    const week = currentWeekRange(referenceDate);
    const weekActs = filterActivitiesInYmdRange(activities, week.startYmd, week.endYmd);

    let elevationM = 0;
    let weekTss = 0;
    let z2Seconds = 0;

    for (const a of weekActs) {
        elevationM += Math.max(0, Number(a?.climbing) || 0);
        weekTss += Math.max(0, Number(a?.load) || 0);

        const ifac = activityIntensityFactor(a, ftp);
        const movingSec = activityMovingTimeSec(a);
        if (ifac != null && movingSec != null && ifac >= Z2_IF_MIN && ifac <= Z2_IF_MAX) {
            z2Seconds += movingSec;
        }
    }

    const z2Hours = z2Seconds / 3600;

    const fitness = calculateFitnessMetrics(activities);
    const latestFitness = fitness.length > 0 ? fitness[fitness.length - 1] : null;
    const tsb = latestFitness?.tsb ?? null;

    const elevationScore = rampScore(elevationM, 600, 1200);
    const z2Score = ftp > 0 ? rampScore(z2Hours, 3, 6) : rampScore(z2Hours, 2, 5);
    const tssScore = scoreWeeklyTss(weekTss);
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
        weekLabel: week.label,
        composite,
        badge,
        metrics: {
            elevationM: Math.round(elevationM),
            weekTss: Math.round(weekTss),
            z2Hours: Math.round(z2Hours * 10) / 10,
            tsb,
            ctl: latestFitness?.ctl ?? null,
            rideCount: weekActs.length,
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
