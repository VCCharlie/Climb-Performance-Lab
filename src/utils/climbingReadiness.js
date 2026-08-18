/**
 * Climbing readiness score for Dashboard overview.
 * Combines recent elevation, Z2 proxy (NP/avg vs FTP), weekly TSS, and current TSB.
 */

import { normalizeDate } from './formatters';
import { activityMovingTimeSec } from './activityFilterMetrics';
import { currentWeekRange, currentMonthRange } from './volumeGoals';
import { getFitnessAtDate } from './formTabMetrics';
import { todayYmd } from './coach/coachHelpers';
import { z2PowerBandFromFtp } from './profileFtp';
import {
    normalizeTerrainProfile,
    elevationTargetsForProfile,
    lowVolumeBadgeLabel,
    buildClimbingReadinessHints,
    terrainProfileLabel,
    TERRAIN_PROFILE_HILLY,
} from './climbingTerrainProfile';

export const Z2_IF_MIN = 0.55;
export const Z2_IF_MAX = 0.75;

/** Rolling blend: 50% this calendar week + 50% previous week (softens Monday reset). */
export const ELEVATION_ROLLING_THIS_WEEK_WEIGHT = 0.5;

/** User-facing explanation for Dashboard help panel. */
export const CLIMBING_READINESS_EXPLANATION = {
    title: 'How the score works',
    summary:
        'The score (0–100) estimates how ready you are for a hard climb this week. It is not FTP — it blends recent climbing volume, endurance work, load, and freshness.',
    weights: [
        '30% — Elevation climbed this period (m), adjusted for your terrain profile in Settings',
        '25% — Z2 endurance proxy (ride time at 55–75% FTP using NP or avg power)',
        '20% — Training load (TSS) for the period',
        '25% — Form (TSB from your activity history)',
    ],
    terrainNote:
        'Set terrain under Settings → Performance & Goals. Flat / coastal uses lower elevation targets (dunes, dijken). Mixed is between flat and hilly.',
    rollingNote:
        'For the current week, elevation scoring blends this week and last week (50/50) so Monday does not reset the score to zero.',
    badges: [
        'Prioritize recovery — very negative TSB',
        'Building base — score below ~65 or light climbing volume',
        'Good climbing form — balanced metrics',
        'Peak climb readiness — high score with fresh TSB (+0 to +22)',
    ],
    historyNote:
        'Weekly and monthly history below re-runs the same formula on past calendar windows. TSB uses your form on the reference day (or today when viewing the current week), or the last day of fully past weeks.',
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
 * @param {object[]} activities
 * @param {string} startYmd
 * @param {string} endYmd
 */
function sumElevationInRange(activities, startYmd, endYmd) {
    let elevationM = 0;
    for (const a of filterActivitiesInYmdRange(activities, startYmd, endYmd)) {
        elevationM += Math.max(0, Number(a?.climbing) || 0);
    }
    return elevationM;
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
 * @param {'hilly' | 'flat' | 'mixed'} terrainProfile
 * @returns {{ key: ReadinessBadgeKey, label: string, tone: string }}
 */
function resolveBadge(elevationScore, z2Score, tssScore, tsbScore, tsb, terrainProfile) {
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
    return {
        key: 'building',
        label: lowVolumeBadgeLabel(terrainProfile),
        tone: 'yellow',
    };
}

function scorePeriodTss(totalTss, periodDays) {
    const days = Math.max(1, Number(periodDays) || 7);
    const weeklyEquivalent = (Number(totalTss) || 0) / (days / 7);
    return scoreWeeklyTss(weeklyEquivalent);
}

/**
 * TSB at end of period — for the current week uses reference day (or today), not week-end
 * when that would look past rides logged on the reference day. Past weeks use week/month end.
 * @param {object[]} activities
 * @param {string} endYmd
 * @param {Date} [referenceDate]
 */
function fitnessSnapshotAtOrBefore(activities, endYmd, referenceDate) {
    const today = todayYmd();
    const refYmd = referenceDate instanceof Date
        ? referenceDate.toISOString().slice(0, 10)
        : today;
    const capYmd = refYmd <= today ? refYmd : today;
    const asOfYmd = endYmd < capYmd ? endYmd : capYmd;
    return getFitnessAtDate(activities, asOfYmd);
}

/**
 * @param {Date} referenceDate
 * @returns {{ startYmd: string, endYmd: string }}
 */
function previousCalendarWeekRange(referenceDate) {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - 7);
    const week = currentWeekRange(d);
    return { startYmd: week.startYmd, endYmd: week.endYmd };
}

/**
 * @param {object[]} activities
 * @param {number} ftp
 * @param {string} startYmd
 * @param {string} endYmd
 * @param {string} periodLabel
 * @param {Date} referenceDate
 * @param {number} [periodDays]
 * @param {object} [options]
 * @param {'hilly' | 'flat' | 'mixed'} [options.terrainProfile]
 * @param {boolean} [options.useRollingElevation]
 */
function computeClimbingReadinessForRange(
    activities,
    ftp,
    startYmd,
    endYmd,
    periodLabel,
    referenceDate,
    periodDays = 7,
    options = {},
) {
    const terrainProfile = normalizeTerrainProfile(options.terrainProfile);
    const useRollingElevation = options.useRollingElevation ?? periodDays <= 7;

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
    const latestFitness = fitnessSnapshotAtOrBefore(activities, endYmd, referenceDate);
    const tsb = latestFitness?.tsb ?? null;

    const elevTargets = elevationTargetsForProfile(terrainProfile, periodDays);
    let elevationForScoring = elevationM;

    if (useRollingElevation && periodDays <= 7) {
        const prev = previousCalendarWeekRange(referenceDate);
        const prevElevationM = sumElevationInRange(activities, prev.startYmd, prev.endYmd);
        elevationForScoring =
            elevationM * ELEVATION_ROLLING_THIS_WEEK_WEIGHT +
            prevElevationM * (1 - ELEVATION_ROLLING_THIS_WEEK_WEIGHT);
    }

    const elevationScore = rampScore(elevationForScoring, elevTargets.goodAt, elevTargets.maxAt);
    const z2Score = ftp > 0 ? rampScore(z2Hours, 3, 6) : rampScore(z2Hours, 2, 5);
    const tssScore = scorePeriodTss(periodTss, periodDays);
    const tsbScore = scoreTsb(tsb);

    const badge = resolveBadge(elevationScore, z2Score, tssScore, tsbScore, tsb, terrainProfile);
    const composite = Math.round(
        elevationScore * 0.3 + z2Score * 0.25 + tssScore * 0.2 + tsbScore * 0.25,
    );

    const z2Band = ftp > 0 ? z2PowerBandFromFtp(ftp) : null;

    const hints = buildClimbingReadinessHints({
        terrainProfile,
        elevationScore,
        z2Score,
        tssScore,
        tsb,
        ftp,
        rideCount: periodActs.length,
        referenceDate,
        periodDays,
        z2Band,
    });

    return {
        weekLabel: periodLabel,
        composite,
        badge,
        terrainProfile,
        terrainLabel: terrainProfileLabel(terrainProfile),
        metrics: {
            elevationM: Math.round(elevationM),
            elevationForScoring: Math.round(elevationForScoring),
            weekTss: Math.round(periodTss),
            z2Hours: Math.round(z2Hours * 10) / 10,
            tsb,
            ctl: latestFitness?.ctl ?? null,
            rideCount: periodActs.length,
        },
        elevationTargets: elevTargets,
        z2Band,
        scores: {
            elevation: elevationScore,
            z2: z2Score,
            tss: tssScore,
            tsb: tsbScore,
        },
        hints,
        hasFtp: ftp > 0,
        usesRollingElevation: useRollingElevation && periodDays <= 7,
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
 * @param {'hilly' | 'flat' | 'mixed'} [params.terrainProfile]
 */
export function computeClimbingReadinessHistory({
    activities,
    ftp = 0,
    referenceDate = new Date(),
    weekCount = 8,
    monthCount = 6,
    terrainProfile = TERRAIN_PROFILE_HILLY,
}) {
    const profile = normalizeTerrainProfile(terrainProfile);
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
            { terrainProfile: profile, useRollingElevation: true },
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
            { terrainProfile: profile, useRollingElevation: false },
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
 * @param {'hilly' | 'flat' | 'mixed'} [params.terrainProfile]
 */
export function computeClimbingReadiness({
    activities,
    ftp = 0,
    referenceDate = new Date(),
    terrainProfile = TERRAIN_PROFILE_HILLY,
}) {
    const week = currentWeekRange(referenceDate);
    return computeClimbingReadinessForRange(
        activities,
        ftp,
        week.startYmd,
        week.endYmd,
        week.label,
        referenceDate,
        7,
        { terrainProfile: normalizeTerrainProfile(terrainProfile), useRollingElevation: true },
    );
}
