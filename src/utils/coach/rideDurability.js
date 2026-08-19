/**
 * Stream-based HR drift for threshold tempo and variable race-style rides.
 * Uses the same first-half vs second-half EF comparison as aerobic decoupling,
 * but with intensity / variability bands suited to harder efforts.
 */

import {
    analyzeDecouplingFromStreams,
    classifyDecouplingPercent,
    isEligibleDecouplingRide,
} from './aerobicDecoupling';
import { activityIntensityFactor, activityMovingTimeSec } from '../activityFilterMetrics';
import { activityVariabilityIndex } from '../rideInsights';

const ENDURANCE_RIDE_TYPES = new Set([
    'Ride',
    'VirtualRide',
    'GravelRide',
    'MountainBikeRide',
    'EBikeRide',
]);

export const DRIFT_PROFILE = {
    STEADY: 'steady',
    THRESHOLD: 'threshold',
    RACE: 'race',
};

const PROFILE_PCT_KEY = {
    [DRIFT_PROFILE.STEADY]: 'decoupling_pct',
    [DRIFT_PROFILE.THRESHOLD]: 'threshold_drift_pct',
    [DRIFT_PROFILE.RACE]: 'race_drift_pct',
};

/** Field groups persisted per drift profile (order: steady → threshold → race). */
export const DRIFT_PATCH_KEY_GROUPS = [
    [
        'decoupling_pct',
        'decoupling_ef_first',
        'decoupling_ef_second',
        'decoupling_status',
        'decoupling_source',
        'decoupling_analyzed_at',
    ],
    [
        'threshold_drift_pct',
        'threshold_drift_ef_first',
        'threshold_drift_ef_second',
        'threshold_drift_status',
        'threshold_drift_source',
        'threshold_drift_analyzed_at',
    ],
    [
        'race_drift_pct',
        'race_drift_ef_first',
        'race_drift_ef_second',
        'race_drift_status',
        'race_drift_source',
        'race_drift_analyzed_at',
    ],
];
/**
 * Threshold tempo: sustained hard aerobic / sub-threshold work.
 */
export function isEligibleThresholdDriftRide(activity, profileFtp, options = {}) {
    const {
        minDurationMin = 45,
        minIf = 0.80,
        maxIf = 0.98,
        maxVi = 1.12,
    } = options;

    if (!activity || !ENDURANCE_RIDE_TYPES.has(activity.type)) return false;
    if (isEligibleDecouplingRide(activity, profileFtp)) return false;

    const durationSec = activityMovingTimeSec(activity);
    if (!durationSec || durationSec < minDurationMin * 60) return false;

    const ftp = Number(profileFtp) || Number(activity.ftp) || 0;
    if (ftp <= 0) return false;

    const ifVal = activityIntensityFactor(activity.norm_power, ftp);
    if (ifVal == null || ifVal < minIf || ifVal > maxIf) return false;

    const vi = activityVariabilityIndex(activity.norm_power, activity.avg_power);
    if (vi != null && vi > maxVi) return false;

    const hr = Number(activity.avg_hr);
    const np = Number(activity.norm_power);
    return Number.isFinite(hr) && hr > 0 && Number.isFinite(np) && np > 0;
}

/**
 * Race / hard group ride: high IF with meaningful power variability.
 */
export function isEligibleRaceDriftRide(activity, profileFtp, options = {}) {
    const {
        minDurationMin = 60,
        minIf = 0.88,
        minVi = 1.05,
    } = options;

    if (!activity || !ENDURANCE_RIDE_TYPES.has(activity.type)) return false;
    if (isEligibleDecouplingRide(activity, profileFtp)) return false;
    if (isEligibleThresholdDriftRide(activity, profileFtp)) return false;

    const durationSec = activityMovingTimeSec(activity);
    if (!durationSec || durationSec < minDurationMin * 60) return false;

    const ftp = Number(profileFtp) || Number(activity.ftp) || 0;
    if (ftp <= 0) return false;

    const ifVal = activityIntensityFactor(activity.norm_power, ftp);
    if (ifVal == null || ifVal < minIf) return false;

    const vi = activityVariabilityIndex(activity.norm_power, activity.avg_power);
    if (vi == null || vi < minVi) return false;

    const hr = Number(activity.avg_hr);
    const np = Number(activity.norm_power);
    return Number.isFinite(hr) && hr > 0 && Number.isFinite(np) && np > 0;
}

/**
 * @param {object | null | undefined} activity
 * @param {number} profileFtp
 * @returns {'steady' | 'threshold' | 'race' | null}
 */
export function getRideDriftProfile(activity, profileFtp) {
    if (!activity) return null;
    if (isEligibleDecouplingRide(activity, profileFtp)) return DRIFT_PROFILE.STEADY;
    if (isEligibleThresholdDriftRide(activity, profileFtp)) return DRIFT_PROFILE.THRESHOLD;
    if (isEligibleRaceDriftRide(activity, profileFtp)) return DRIFT_PROFILE.RACE;
    return null;
}

/**
 * @param {object | null | undefined} activity
 * @param {number} profileFtp
 */
export function activityNeedsDriftAnalysis(activity, profileFtp) {
    const profile = getRideDriftProfile(activity, profileFtp);
    if (!profile) return false;
    const pctKey = PROFILE_PCT_KEY[profile];
    return !Number.isFinite(Number(activity?.[pctKey]));
}

/**
 * @param {object | null} analysis
 * @param {'steady' | 'threshold' | 'race'} profile
 * @param {'intervals' | 'strava'} source
 */
export function buildDriftPatch(analysis, profile, source) {
    if (!analysis || analysis.decouplingPct == null || !Number.isFinite(analysis.decouplingPct)) {
        return null;
    }

    const analyzedAt = new Date().toISOString().slice(0, 10);
    const pct = Math.round(analysis.decouplingPct * 10) / 10;
    const efFirst = analysis.efFirst != null ? Math.round(analysis.efFirst * 100) / 100 : undefined;
    const efSecond = analysis.efSecond != null ? Math.round(analysis.efSecond * 100) / 100 : undefined;
    const status = analysis.status;

    if (profile === DRIFT_PROFILE.STEADY) {
        return {
            decoupling_pct: pct,
            decoupling_ef_first: efFirst,
            decoupling_ef_second: efSecond,
            decoupling_status: status,
            decoupling_source: source,
            decoupling_analyzed_at: analyzedAt,
        };
    }

    if (profile === DRIFT_PROFILE.THRESHOLD) {
        return {
            threshold_drift_pct: pct,
            threshold_drift_ef_first: efFirst,
            threshold_drift_ef_second: efSecond,
            threshold_drift_status: status,
            threshold_drift_source: source,
            threshold_drift_analyzed_at: analyzedAt,
        };
    }

    return {
        race_drift_pct: pct,
        race_drift_ef_first: efFirst,
        race_drift_ef_second: efSecond,
        race_drift_status: status,
        race_drift_source: source,
        race_drift_analyzed_at: analyzedAt,
    };
}

/**
 * @param {object} activity
 * @param {{ watts: number[], heartrate: number[], time?: number[] }} streams
 * @param {'intervals' | 'strava'} source
 * @param {number} profileFtp
 */
export function buildRideDriftPatchFromStreams(activity, streams, source, profileFtp) {
    const profile = getRideDriftProfile(activity, profileFtp);
    if (!profile || !streams) return null;
    const analysis = analyzeDecouplingFromStreams(streams.watts, streams.heartrate, streams.time);
    return buildDriftPatch(analysis, profile, source);
}

export function driftProfileLabel(profile) {
    switch (profile) {
        case DRIFT_PROFILE.THRESHOLD:
            return 'Threshold drift';
        case DRIFT_PROFILE.RACE:
            return 'Race drift';
        case DRIFT_PROFILE.STEADY:
        default:
            return 'Decoupling';
    }
}

/**
 * @param {object | null | undefined} activity
 */
export function getActivityDriftPct(activity) {
    if (!activity) return { profile: null, pct: null };
    if (Number.isFinite(Number(activity.decoupling_pct))) {
        return { profile: DRIFT_PROFILE.STEADY, pct: Number(activity.decoupling_pct) };
    }
    if (Number.isFinite(Number(activity.threshold_drift_pct))) {
        return { profile: DRIFT_PROFILE.THRESHOLD, pct: Number(activity.threshold_drift_pct) };
    }
    if (Number.isFinite(Number(activity.race_drift_pct))) {
        return { profile: DRIFT_PROFILE.RACE, pct: Number(activity.race_drift_pct) };
    }
    return { profile: null, pct: null };
}

/**
 * @param {number | null | undefined} pct
 */
export function driftStatusFromPct(pct) {
    return classifyDecouplingPercent(pct);
}

/**
 * Extract the first available drift patch from an enriched activity.
 * @param {object | null | undefined} activity
 * @returns {object | null}
 */
export function extractDriftPatch(activity) {
    if (!activity) return null;
    for (const keys of DRIFT_PATCH_KEY_GROUPS) {
        const pctKey = keys[0];
        if (!Number.isFinite(Number(activity[pctKey]))) continue;
        const patch = {};
        for (const key of keys) {
            if (activity[key] != null) patch[key] = activity[key];
        }
        if (Object.keys(patch).length > 0) return patch;
    }
    return null;
}

/**
 * All drift summary keys (for Firestore merge protection).
 */
export function getAllDriftMergeKeys() {
    return DRIFT_PATCH_KEY_GROUPS.flat();
}
