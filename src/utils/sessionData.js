/**
 * Sentinel Phase 4.0 — local session wipe on logout.
 * Clears sensitive localStorage keys and provides default state factories.
 * Cloud data is untouched; signing back in reloads from Firestore.
 */

import { mergeVolumeGoals } from './volumeGoals.js';
import { ACTIVITY_COLUMN_STORAGE_KEY } from './activityColumnVisibility.js';

/** Keys removed on logout. Theme and PWA UI prefs are preserved. */
export const SENSITIVE_LOCAL_STORAGE_KEYS = [
    'userSettings',
    'intervalsConfig',
    'stravaConfig',
    'stravaProfileData',
    'bucketListState',
    'stravaBikesMap',
    'app_last_sync_time',
    'dashboard_timeRange',
    ACTIVITY_COLUMN_STORAGE_KEY,
];

const PREFIX_KEYS_TO_CLEAR = ['intervals_data_', 'stravaVsLogScan_v'];

/** Set before Firebase signOut so auth listener knows to wipe local secrets. */
export const EXPLICIT_SIGN_OUT_SESSION_KEY = 'cpl_explicit_sign_out';

export function markExplicitSignOut() {
    if (typeof sessionStorage === 'undefined') return;
    try {
        sessionStorage.setItem(EXPLICIT_SIGN_OUT_SESSION_KEY, '1');
    } catch {
        /* private mode */
    }
}

/** Remove stuck sign-out flag without wiping local data (e.g. before a fresh sign-in). */
export function clearExplicitSignOutFlag() {
    if (typeof sessionStorage === 'undefined') return;
    try {
        sessionStorage.removeItem(EXPLICIT_SIGN_OUT_SESSION_KEY);
    } catch {
        /* ignore */
    }
}

/** @returns {boolean} true when user clicked Sign out (consume one-shot flag). */
export function consumeExplicitSignOut() {
    if (typeof sessionStorage === 'undefined') return false;
    try {
        if (sessionStorage.getItem(EXPLICIT_SIGN_OUT_SESSION_KEY) === '1') {
            sessionStorage.removeItem(EXPLICIT_SIGN_OUT_SESSION_KEY);
            return true;
        }
    } catch {
        /* ignore */
    }
    return false;
}

export function getDefaultUserSettings() {
    return {
        weight: 70.0,
        bikeWeight: 7.5,
        ftp: 280,
        maxHr: 190,
        privacyMode: false,
        goals: {
            yearlyKm: 10000,
            yearlyMovingTimeHours: 0,
            yearlyElevationM: 0,
            targetFtp: 300,
            targetWeight: 68,
        },
        volumeGoals: mergeVolumeGoals(null),
        notifications: { highLoad: 150, lowPower: 150, minWeight: 67, restDay: 3 },
        recoveryTss: 35,
        powerZones: [],
        githubPat: '',
        openweatherApiKey: '',
        /** Garmin/Wahoo profile names used as default activity titles — prefer Strava name when matched. */
        bikeComputerProfileTitles: [],
        /** 'manual' | 'estimated' | 'estimated_20' | 'estimated_60' */
        ftpSource: 'manual',
        /** '6months' | 'recent' — window for peak-based FTP estimates */
        ftpLookbackWindow: '6months',
        /** Optional — enables age axis on long-term power charts */
        birthYear: null,
        /** 'hilly' | 'flat' | 'mixed' — climbing readiness elevation targets and coach hints */
        terrainProfile: 'hilly',
    };
}

export function getDefaultIntervalsConfig() {
    return { apiKey: '', athleteId: '' };
}

export function getDefaultStravaConfig() {
    return { athlete_id: null, athlete_name: null };
}

export function getDefaultBucketListState() {
    return { climbStatus: {}, climbPbs: {}, updatedAt: null };
}

/**
 * Remove sensitive keys from localStorage (plus prefixed cache entries).
 * Safe to call multiple times.
 */
export function clearSensitiveLocalStorage() {
    if (typeof localStorage === 'undefined') return;

    for (const key of SENSITIVE_LOCAL_STORAGE_KEYS) {
        try {
            localStorage.removeItem(key);
        } catch {
            /* quota / private mode */
        }
    }

    const prefixRemovals = [];
    for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (PREFIX_KEYS_TO_CLEAR.some((prefix) => key.startsWith(prefix))) {
            prefixRemovals.push(key);
        }
    }

    for (const key of prefixRemovals) {
        try {
            localStorage.removeItem(key);
        } catch {
            /* ignore */
        }
    }
}
