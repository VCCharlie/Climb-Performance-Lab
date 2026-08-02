/**
 * Profile FTP: manual entry vs estimated from best 20-minute power (×0.95) or best 60-minute power.
 */

import { normalizeDate } from './formatters';
import { findPeakEftp20Activity, findPeakEftp60Activity } from './dashboardActivityPeaks';

export const FTP_SOURCE_MANUAL = 'manual';
/** Legacy value — treated as 20-minute estimate. */
export const FTP_SOURCE_ESTIMATED = 'estimated';
export const FTP_SOURCE_ESTIMATED_20 = 'estimated_20';
export const FTP_SOURCE_ESTIMATED_60 = 'estimated_60';

/** Only consider peak powers from activities within this window for profile FTP. */
export const FTP_ESTIMATE_LOOKBACK_MONTHS = 6;

const MAX_AGE_HIGH_DAYS = 90;
const MAX_AGE_MEDIUM_DAYS = 365;
const MIN_BEST_20MIN_W = 120;
const MIN_BEST_60MIN_W = 120;

/**
 * Activities on or after the lookback cutoff (calendar months before reference date).
 * @param {object[]} activities
 * @param {Date} referenceDate
 * @param {number} [lookbackMonths]
 */
export function filterActivitiesForFtpEstimate(
    activities,
    referenceDate = new Date(),
    lookbackMonths = FTP_ESTIMATE_LOOKBACK_MONTHS,
) {
    if (!activities?.length) return [];
    const cutoff = new Date(referenceDate);
    cutoff.setHours(12, 0, 0, 0);
    cutoff.setMonth(cutoff.getMonth() - lookbackMonths);
    const cutoffMs = cutoff.getTime();

    return activities.filter((a) => {
        const ymd = normalizeDate(a?.date);
        if (!ymd || ymd.length < 10) return false;
        const d = new Date(`${ymd.slice(0, 10)}T12:00:00`);
        if (Number.isNaN(d.getTime())) return false;
        return d.getTime() >= cutoffMs;
    });
}

/**
 * @param {Date} referenceDate
 * @param {number} [lookbackMonths]
 * @returns {string} ISO date YYYY-MM-DD for cutoff (inclusive)
 */
export function ftpEstimateLookbackStartYmd(
    referenceDate = new Date(),
    lookbackMonths = FTP_ESTIMATE_LOOKBACK_MONTHS,
) {
    const cutoff = new Date(referenceDate);
    cutoff.setHours(12, 0, 0, 0);
    cutoff.setMonth(cutoff.getMonth() - lookbackMonths);
    return cutoff.toISOString().slice(0, 10);
}

/**
 * @param {string | null | undefined} ymd
 * @param {Date} referenceDate
 * @returns {number | null} age in days
 */
function ageDaysFromYmd(ymd, referenceDate = new Date()) {
    if (!ymd || ymd.length < 10) return null;
    const d = new Date(`${ymd.slice(0, 10)}T12:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    const ref = new Date(referenceDate);
    ref.setHours(12, 0, 0, 0);
    return Math.floor((ref.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
}

function confidenceFromAgeDays(ageDays) {
    if (ageDays == null) return 'low';
    if (ageDays <= MAX_AGE_HIGH_DAYS) return 'high';
    if (ageDays <= MAX_AGE_MEDIUM_DAYS) return 'medium';
    return 'low';
}

/**
 * Estimate FTP from stored best_20min peaks (same rule as dashboard eFTP).
 * @param {object[]} activities
 * @param {Date} [referenceDate]
 */
export function estimateProfileFtpFromActivities(activities, referenceDate = new Date()) {
    const recentActivities = filterActivitiesForFtpEstimate(activities, referenceDate);
    const { activity, derivedWatts, best20Raw } = findPeakEftp20Activity(recentActivities);
    const lookbackStart = ftpEstimateLookbackStartYmd(referenceDate);
    if (!derivedWatts || derivedWatts < MIN_BEST_20MIN_W * 0.95) {
        return {
            ftp: null,
            confidence: 'none',
            activity: null,
            best20Min: best20Raw || null,
            ageDays: null,
            lookbackMonths: FTP_ESTIMATE_LOOKBACK_MONTHS,
            lookbackStart,
        };
    }

    const actYmd = normalizeDate(activity?.date);
    const ageDays = ageDaysFromYmd(actYmd, referenceDate);

    return {
        ftp: derivedWatts,
        confidence: confidenceFromAgeDays(ageDays),
        activity,
        best20Min: best20Raw,
        ageDays,
        activityDate: actYmd,
        lookbackMonths: FTP_ESTIMATE_LOOKBACK_MONTHS,
        lookbackStart,
    };
}

/**
 * Estimate FTP from stored best_60min peaks (60-minute power = FTP proxy, no ×0.95).
 * @param {object[]} activities
 * @param {Date} [referenceDate]
 */
export function estimateProfileFtp60FromActivities(activities, referenceDate = new Date()) {
    const recentActivities = filterActivitiesForFtpEstimate(activities, referenceDate);
    const { activity, derivedWatts, best60Raw } = findPeakEftp60Activity(recentActivities);
    const lookbackStart = ftpEstimateLookbackStartYmd(referenceDate);
    if (!derivedWatts || derivedWatts < MIN_BEST_60MIN_W) {
        return {
            ftp: null,
            confidence: 'none',
            activity: null,
            best60Min: best60Raw || null,
            ageDays: null,
            lookbackMonths: FTP_ESTIMATE_LOOKBACK_MONTHS,
            lookbackStart,
        };
    }

    const actYmd = normalizeDate(activity?.date);
    const ageDays = ageDaysFromYmd(actYmd, referenceDate);

    return {
        ftp: derivedWatts,
        confidence: confidenceFromAgeDays(ageDays),
        activity,
        best60Min: best60Raw,
        ageDays,
        activityDate: actYmd,
        lookbackMonths: FTP_ESTIMATE_LOOKBACK_MONTHS,
        lookbackStart,
    };
}

/**
 * @param {object} userSettings
 */
export function normalizeFtpSource(userSettings) {
    const src = userSettings?.ftpSource;
    if (src === FTP_SOURCE_ESTIMATED_60) return FTP_SOURCE_ESTIMATED_60;
    if (src === FTP_SOURCE_ESTIMATED || src === FTP_SOURCE_ESTIMATED_20) return FTP_SOURCE_ESTIMATED_20;
    return FTP_SOURCE_MANUAL;
}

function isUsableEstimate(estimate) {
    return estimate?.ftp && estimate.confidence !== 'none';
}

/**
 * Effective FTP for zones, IF, climbing readiness, etc.
 * @param {object} userSettings
 * @param {object[]} [activities]
 * @param {Date} [referenceDate]
 * @returns {{
 *   ftp: number,
 *   source: string,
 *   estimate: ReturnType<typeof estimateProfileFtpFromActivities>,
 *   estimate20: ReturnType<typeof estimateProfileFtpFromActivities>,
 *   estimate60: ReturnType<typeof estimateProfileFtp60FromActivities>,
 * }}
 */
export function resolveEffectiveProfileFtp(userSettings, activities = [], referenceDate = new Date()) {
    const manual = Number(userSettings?.ftp) || 0;
    const estimate20 = estimateProfileFtpFromActivities(activities, referenceDate);
    const estimate60 = estimateProfileFtp60FromActivities(activities, referenceDate);
    const ftpSource = normalizeFtpSource(userSettings);

    if (ftpSource === FTP_SOURCE_ESTIMATED_20 && isUsableEstimate(estimate20)) {
        return {
            ftp: estimate20.ftp,
            source: FTP_SOURCE_ESTIMATED_20,
            estimate: estimate20,
            estimate20,
            estimate60,
        };
    }

    if (ftpSource === FTP_SOURCE_ESTIMATED_60 && isUsableEstimate(estimate60)) {
        return {
            ftp: estimate60.ftp,
            source: FTP_SOURCE_ESTIMATED_60,
            estimate: estimate60,
            estimate20,
            estimate60,
        };
    }

    return {
        ftp: manual,
        source: FTP_SOURCE_MANUAL,
        estimate: estimate20,
        estimate20,
        estimate60,
    };
}

/**
 * Z2 proxy band (55–75% FTP) in watts for UI labels.
 * @param {number} ftp
 */
export function z2PowerBandFromFtp(ftp) {
    const f = Number(ftp) || 0;
    if (f <= 0) return null;
    return {
        minW: Math.round(f * 0.55),
        maxW: Math.round(f * 0.75),
        minPct: 55,
        maxPct: 75,
    };
}
