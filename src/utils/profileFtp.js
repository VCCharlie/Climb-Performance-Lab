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

/** Look back 6 calendar months for peak powers (balanced default). */
export const FTP_LOOKBACK_6_MONTHS = '6months';
/** Look back ~90 days for recent-form peaks (Intervals-style eFTP window). */
export const FTP_LOOKBACK_RECENT = 'recent';

export const FTP_ESTIMATE_LOOKBACK_MONTHS = 6;
/** Upper bound of the 42–90 day “recent form” range used by many eFTP models. */
export const FTP_ESTIMATE_LOOKBACK_DAYS_RECENT = 90;

const MAX_AGE_HIGH_DAYS = 90;
const MAX_AGE_MEDIUM_DAYS = 365;
const MIN_BEST_20MIN_W = 120;
const MIN_BEST_60MIN_W = 120;

/**
 * @typedef {{ window: string, lookbackMonths: number | null, lookbackDays: number | null }} FtpLookbackConfig
 */

/**
 * @param {object} [userSettings]
 * @returns {FtpLookbackConfig}
 */
export function getFtpLookbackConfig(userSettings) {
    const window = normalizeFtpLookbackWindow(userSettings);
    if (window === FTP_LOOKBACK_RECENT) {
        return {
            window,
            lookbackMonths: null,
            lookbackDays: FTP_ESTIMATE_LOOKBACK_DAYS_RECENT,
        };
    }
    return {
        window,
        lookbackMonths: FTP_ESTIMATE_LOOKBACK_MONTHS,
        lookbackDays: null,
    };
}

/**
 * @param {object} [userSettings]
 */
export function normalizeFtpLookbackWindow(userSettings) {
    return userSettings?.ftpLookbackWindow === FTP_LOOKBACK_RECENT
        ? FTP_LOOKBACK_RECENT
        : FTP_LOOKBACK_6_MONTHS;
}

/**
 * Short English label for Settings UI.
 * @param {object} [userSettings]
 */
export function describeFtpLookbackWindow(userSettings) {
    const config = getFtpLookbackConfig(userSettings);
    if (config.window === FTP_LOOKBACK_RECENT) {
        return `last ${FTP_ESTIMATE_LOOKBACK_DAYS_RECENT} days`;
    }
    return `last ${FTP_ESTIMATE_LOOKBACK_MONTHS} months`;
}

/**
 * @param {Date} referenceDate
 * @param {FtpLookbackConfig} lookbackConfig
 * @returns {string} ISO date YYYY-MM-DD for cutoff (inclusive)
 */
export function ftpEstimateLookbackStartYmd(referenceDate = new Date(), lookbackConfig = getFtpLookbackConfig()) {
    const cutoff = new Date(referenceDate);
    cutoff.setHours(12, 0, 0, 0);
    if (lookbackConfig.lookbackDays) {
        cutoff.setDate(cutoff.getDate() - lookbackConfig.lookbackDays);
    } else if (lookbackConfig.lookbackMonths) {
        cutoff.setMonth(cutoff.getMonth() - lookbackConfig.lookbackMonths);
    }
    return cutoff.toISOString().slice(0, 10);
}

/**
 * Activities on or after the lookback cutoff.
 * @param {object[]} activities
 * @param {Date} referenceDate
 * @param {FtpLookbackConfig} [lookbackConfig]
 */
export function filterActivitiesForFtpEstimate(
    activities,
    referenceDate = new Date(),
    lookbackConfig = getFtpLookbackConfig(),
) {
    if (!activities?.length) return [];
    const cutoffMs = new Date(`${ftpEstimateLookbackStartYmd(referenceDate, lookbackConfig)}T12:00:00`).getTime();

    return activities.filter((a) => {
        const ymd = normalizeDate(a?.date);
        if (!ymd || ymd.length < 10) return false;
        const d = new Date(`${ymd.slice(0, 10)}T12:00:00`);
        if (Number.isNaN(d.getTime())) return false;
        return d.getTime() >= cutoffMs;
    });
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

function buildEstimateMeta(referenceDate, lookbackConfig) {
    return {
        lookbackWindow: lookbackConfig.window,
        lookbackStart: ftpEstimateLookbackStartYmd(referenceDate, lookbackConfig),
        lookbackMonths: lookbackConfig.lookbackMonths,
        lookbackDays: lookbackConfig.lookbackDays,
    };
}

/**
 * Estimate FTP from stored best_20min peaks (same rule as dashboard eFTP).
 * @param {object[]} activities
 * @param {Date} [referenceDate]
 * @param {object} [userSettings]
 */
export function estimateProfileFtpFromActivities(
    activities,
    referenceDate = new Date(),
    userSettings = null,
) {
    const lookbackConfig = getFtpLookbackConfig(userSettings);
    const recentActivities = filterActivitiesForFtpEstimate(activities, referenceDate, lookbackConfig);
    const { activity, derivedWatts, best20Raw } = findPeakEftp20Activity(recentActivities);
    const meta = buildEstimateMeta(referenceDate, lookbackConfig);
    if (!derivedWatts || derivedWatts < MIN_BEST_20MIN_W * 0.95) {
        return {
            ftp: null,
            confidence: 'none',
            activity: null,
            best20Min: best20Raw || null,
            ageDays: null,
            ...meta,
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
        ...meta,
    };
}

/**
 * Estimate FTP from stored best_60min peaks (60-minute power = FTP proxy, no ×0.95).
 * @param {object[]} activities
 * @param {Date} [referenceDate]
 * @param {object} [userSettings]
 */
export function estimateProfileFtp60FromActivities(
    activities,
    referenceDate = new Date(),
    userSettings = null,
) {
    const lookbackConfig = getFtpLookbackConfig(userSettings);
    const recentActivities = filterActivitiesForFtpEstimate(activities, referenceDate, lookbackConfig);
    const { activity, derivedWatts, best60Raw } = findPeakEftp60Activity(recentActivities);
    const meta = buildEstimateMeta(referenceDate, lookbackConfig);
    if (!derivedWatts || derivedWatts < MIN_BEST_60MIN_W) {
        return {
            ftp: null,
            confidence: 'none',
            activity: null,
            best60Min: best60Raw || null,
            ageDays: null,
            ...meta,
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
        ...meta,
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
    const estimate20 = estimateProfileFtpFromActivities(activities, referenceDate, userSettings);
    const estimate60 = estimateProfileFtp60FromActivities(activities, referenceDate, userSettings);
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
