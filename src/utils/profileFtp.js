/**
 * Profile FTP: manual entry vs estimated from best 20-minute power (×0.95).
 */

import { normalizeDate } from './formatters';
import { findPeakEftp20Activity } from './dashboardActivityPeaks';

export const FTP_SOURCE_MANUAL = 'manual';
export const FTP_SOURCE_ESTIMATED = 'estimated';

const MAX_AGE_HIGH_DAYS = 90;
const MAX_AGE_MEDIUM_DAYS = 365;
const MIN_BEST_20MIN_W = 120;

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

/**
 * Estimate FTP from stored best_20min peaks (same rule as dashboard eFTP).
 * @param {object[]} activities
 * @param {Date} [referenceDate]
 */
export function estimateProfileFtpFromActivities(activities, referenceDate = new Date()) {
    const { activity, derivedWatts, best20Raw } = findPeakEftp20Activity(activities || []);
    if (!derivedWatts || derivedWatts < MIN_BEST_20MIN_W * 0.95) {
        return {
            ftp: null,
            confidence: 'none',
            activity: null,
            best20Min: best20Raw || null,
            ageDays: null,
        };
    }

    const actYmd = normalizeDate(activity?.date);
    const ageDays = ageDaysFromYmd(actYmd, referenceDate);
    let confidence = 'low';
    if (ageDays != null && ageDays <= MAX_AGE_HIGH_DAYS) confidence = 'high';
    else if (ageDays != null && ageDays <= MAX_AGE_MEDIUM_DAYS) confidence = 'medium';

    return {
        ftp: derivedWatts,
        confidence,
        activity,
        best20Min: best20Raw,
        ageDays,
        activityDate: actYmd,
    };
}

/**
 * @param {object} userSettings
 */
export function normalizeFtpSource(userSettings) {
    const src = userSettings?.ftpSource;
    return src === FTP_SOURCE_ESTIMATED ? FTP_SOURCE_ESTIMATED : FTP_SOURCE_MANUAL;
}

/**
 * Effective FTP for zones, IF, climbing readiness, etc.
 * @param {object} userSettings
 * @param {object[]} [activities]
 * @param {Date} [referenceDate]
 * @returns {{ ftp: number, source: string, estimate: ReturnType<typeof estimateProfileFtpFromActivities> }}
 */
export function resolveEffectiveProfileFtp(userSettings, activities = [], referenceDate = new Date()) {
    const manual = Number(userSettings?.ftp) || 0;
    const estimate = estimateProfileFtpFromActivities(activities, referenceDate);
    const ftpSource = normalizeFtpSource(userSettings);

    if (
        ftpSource === FTP_SOURCE_ESTIMATED
        && estimate.ftp
        && estimate.confidence !== 'none'
    ) {
        return { ftp: estimate.ftp, source: FTP_SOURCE_ESTIMATED, estimate };
    }

    return {
        ftp: manual,
        source: FTP_SOURCE_MANUAL,
        estimate,
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
