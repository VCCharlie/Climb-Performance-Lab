/**
 * src/utils/intervals.js
 * Intervals.icu specific logic
 */

import { normalizeDate, parseDurationToSeconds } from './formatters';
import { determineActivityType } from './activityTypes';
import { extractStravaId } from './strava';

/**
 * True when the payload looks like raw Intervals.icu API JSON (not our normalized shape).
 */
export function isRawIntervalsApiPayload(item) {
    if (!item || typeof item !== 'object') return false;

    const rawOnlyKeys = [
        'start_date_local',
        'start_date',
        'startDate',
        'name',
        'icu_average_watts',
        'icu_distance',
        'icu_intervals',
        'device_watts',
        'elevationGain',
        'total_elevation_gain',
        'total_elevation_loss',
        'Best1minpower',
        'Best5minpower',
        'movingTime',
        'elapsedTime',
        'normalizedPower',
        'velocity_smooth',
        'weighted_average_watts',
        'average_watts',
        'activity_id',
        'kilojoules',
        'icu_joules',
        'perceived_exertion',
        'power_load',
        'sub_type',
    ];

    for (const key of rawOnlyKeys) {
        if (item[key] !== undefined && item[key] !== null && item[key] !== '') {
            return true;
        }
    }

    if (item.title != null && (item.avg_power != null || item.norm_power != null)) {
        return false;
    }

    return false;
}

/**
 * Map cloud/Python-transformed activity back to API-like fields for JS normalization.
 */
export function cloudPayloadToRawShape(item) {
    const distanceKm = Number(item.distance) || 0;
    const avgSpeedKmh = Number(item.avg_speed) || 0;
    return {
        id: item.id,
        name: item.title,
        type: item.type,
        start_date_local: item.date,
        external_id: item.strava_id ? `strava-${item.strava_id}` : undefined,
        moving_time: item.moving_time,
        distance: distanceKm > 0 ? distanceKm * 1000 : 0,
        total_elevation_gain: item.climbing,
        average_speed: avgSpeedKmh > 0 ? avgSpeedKmh / 3.6 : 0,
        icu_average_watts: item.avg_power,
        icu_weighted_avg_watts: item.norm_power,
        icu_training_load: item.load,
        icu_rpe: item.rpe,
        icu_average_heartrate: item.avg_hr,
        max_heartrate: item.max_hr,
        work: item.work,
        icu_ftp: item.ftp || item.eFTP || item.icu_ftp,
        icu_max_watts: item.max_power,
        Best1minpower: item.best_1min,
        Best5minpower: item.best_5min,
        Best10minpower: item.best_10min,
        Best20minpower: item.best_20min,
        Best60minpower: item.best_60min,
        Best90minpower: item.best_90min,
        Best120minpower: item.best_120min,
        average_altitude: item.avg_altitude,
        maximum_altitude: item.max_altitude,
        trainer: item.type === 'VirtualRide',
    };
}

/**
 * Normalize any Intervals payload (raw API or cloud/Python output) to the canonical app shape.
 */
export function normalizeIntervalsActivityFromAny(item) {
    if (!item || typeof item !== 'object') {
        return normalizeIntervalsActivity({});
    }
    if (isRawIntervalsApiPayload(item)) {
        return normalizeIntervalsActivity(item);
    }
    return normalizeIntervalsActivity(cloudPayloadToRawShape(item));
}

export function filterNonEmptyIntervalsActivities(activities) {
    return (activities || []).filter((act) =>
        (act.distance && act.distance > 0) ||
        (act.moving_time && act.moving_time > 0) ||
        (act.avg_power && act.avg_power > 0),
    );
}

export const normalizeIntervalsActivity = (item) => {
    const getNum = (val) => { const n = Number(val); return isNaN(n) ? 0 : n; };
    const getVal = (...keys) => { for (const k of keys) { if (item[k] !== undefined && item[k] !== null && item[k] !== "") return item[k]; } return null; };

    const id = String(getVal('id', 'activity_id') || crypto.randomUUID());
    const dateStr = getVal('startDate', 'start_date_local', 'start_date', 'date');
    const title = getVal('name', 'title') || "Untitled";
    const descriptionRaw = getVal('description', 'notes', 'activity_description');
    const description = descriptionRaw != null ? String(descriptionRaw).trim() : '';

    const movingTimeRaw = getVal('movingTime', 'moving_time', 'icu_recording_time', 'elapsedTime', 'elapsed_time', 'time');
    let movingTime = getNum(movingTimeRaw);
    if (movingTime === 0 && movingTimeRaw != null && String(movingTimeRaw).trim() !== '') {
        const parsedDuration = parseDurationToSeconds(String(movingTimeRaw));
        if (parsedDuration > 0) movingTime = parsedDuration;
    }
    // Intervals.icu / API: distance is always meters (short rides included). Never treat <1000 m as km.
    const isIndoor = item.trainer === true;
    const distanceMeters = getNum(
        isIndoor
            ? getVal('icu_distance', 'distance', 'total_distance')
            : getVal('distance', 'icu_distance', 'total_distance'),
    );
    const climbing = getNum(getVal('elevationGain', 'total_elevation_gain', 'total_elevation_loss', 'climbing'));
    const avgSpeedMs = getNum(getVal('avg_speed', 'avgSpeed', 'average_speed', 'velocity_smooth'));
    const normPower = getNum(getVal('norm_power', 'normalizedPower', 'icu_weighted_avg_watts', 'weighted_average_watts', 'np', 'normalized_power'));
    const avgPower = getNum(getVal('avgWatts', 'icu_average_watts', 'average_watts', 'device_watts', 'avg_power', 'power'));
    const avgHr = getNum(getVal('average_heartrate', 'avg_hr', 'average_hr', 'hr', 'icu_average_heartrate', 'avg_heartrate', 'icu_avg_hr'));
    const load = getNum(getVal('load', 'trainingLoad', 'icu_training_load', 'training_load', 'power_load', 'hr_load', 'pace_load', 'tss'));

    // Work handling: icu_joules is in Joules, we want kJ.
    // Work handling: icu_joules (Joules) -> kJ
    let work = getNum(getVal('work', 'total_work', 'kilojoules', 'energy'));

    // Fallback: Calculate Work (kJ) = Avg Power (W) * Time (s) / 1000
    if (work === 0 && avgPower > 0 && movingTime > 0) {
        const joules = getNum(getVal('icu_joules', 'joules'));
        if (joules > 0) {
            work = joules / 1000;
        } else {
            work = (avgPower * movingTime) / 1000;
        }
    }

    const rpe = getNum(getVal('rpe', 'icu_rpe', 'perceived_exertion', 'feel', 'session_rpe', 'feeling', 'rating'));
    const ftp = getNum(getVal(
        'ftp',
        'icu_ftp',
        'icu_eftp',
        'icu_rolling_ftp',
        'icu_pm_ftp',
        'icu_pm_ftp_watts',
        'cp',
        'eFTP',
    ));

    // Max Power: Try root keys first
    let maxPower = getNum(getVal('max_power', 'maxWatts', 'icu_max_watts', 'max_watts', 'p_max', 'icu_pm_p_max'));
    let maxPowerSource = 'Instant'; // Default

    // Fallback 1: Nested intervals
    if (maxPower === 0 && item.icu_intervals && Array.isArray(item.icu_intervals)) {
        // ⚡ Bolt Optimization: Calculate max without spread operator on .map() result
        const intervalMax = item.icu_intervals.reduce((max, i) => Math.max(max, Number(i.max_watts) || 0), 0);
        if (intervalMax > 0) {
            maxPower = intervalMax;
            maxPowerSource = 'Interval';
        }
    }

    // Fallback 2: If we have avg power but no max, max must be at least avg (logic fix for display)
    // Actually, better to send 0 than lie, BUT if we have best_1min or something?
    // Let's rely on best_1min as a floor if max_power is missing.
    // SANITY CHECK: best_1min cannot be 1700W for a normal rider (clean anomaly)
    let best1min = getNum(getVal('best_1min', 'Best1minpower', 'best_1min_power', 'w1min'));
    if (best1min > 1200) best1min = 0; // Filter insane values

    if (maxPower === 0) {
        if (best1min > 0) {
            maxPower = best1min;
            maxPowerSource = '1 min';
        }
    }

    const maxHr = getNum(getVal('max_hr', 'max_heartrate', 'max_heart_rate', 'icu_max_hr', 'athlete_max_hr', 'icu_max_heartrate'));

    const best5min = getNum(getVal('best_5min', 'Best5minpower', 'best_5min_power', 'w5min'));
    const best10min = getNum(getVal('best_10min', 'Best10minpower', 'best_10min_power', 'w10min'));
    const best20min = getNum(getVal('best_20min', 'Best20minpower', 'best_20min_power', 'w20min'));
    const best60min = getNum(getVal('best_60min', 'Best60minpower', 'best_60min_power', 'w60min'));
    const best90min = getNum(getVal(
        'best_90min',
        'Best90minpower',
        'best_90min_power',
        'icu_power_90min',
        'w90min',
    ));
    const best120min = getNum(getVal(
        'best_120min',
        'Best120minpower',
        'best_120min_power',
        'icu_power_120min',
        'w120min',
    ));

    const avgAltitude = getNum(getVal('avgAltitude', 'average_altitude', 'avg_altitude'));
    const maxAltitude = getNum(getVal('maxAltitude', 'maximum_altitude', 'max_altitude'));

    const rawType = getVal('type', 'sub_type', 'activity_type');
    const finalType = determineActivityType(rawType, title);

    // Strava ID: Intervals.icu slaat dit op als external_id (bijv. "strava-12345678")
    const stravaId = extractStravaId(getVal('external_id', 'externalId'));

    return {
        id: id,
        strava_id: stravaId,
        date: normalizeDate(dateStr),
        title: title,
        ...(description ? { description } : {}),
        type: finalType,
        moving_time: movingTime,
        distance: distanceMeters > 0 ? Math.round((distanceMeters / 1000) * 100) / 100 : 0,
        climbing: Math.round(climbing),
        avg_speed: avgSpeedMs > 0
            ? Math.round((avgSpeedMs < 15 ? avgSpeedMs * 3.6 : avgSpeedMs) * 10) / 10
            : 0,
        norm_power: Math.round(normPower > 0 ? normPower : (avgPower > 0 ? avgPower : 0)),
        avg_power: Math.round(avgPower),
        avg_hr: Math.round(avgHr),
        load: Math.round(load),
        work: Math.round(work),
        rpe: rpe,
        ftp: Math.round(ftp),
        max_power: Math.round(maxPower),
        max_power_source: maxPowerSource,
        max_hr: Math.round(maxHr),
        best_1min: Math.round(best1min),
        best_5min: Math.round(best5min),
        best_10min: Math.round(best10min),
        best_20min: Math.round(best20min),
        best_60min: Math.round(best60min),
        best_90min: Math.round(best90min),
        best_120min: Math.round(best120min),
        avg_altitude: Math.round(avgAltitude),
        max_altitude: Math.round(maxAltitude),
        trainer: item.trainer === true || finalType === 'VirtualRide' || finalType === 'VirtualRun',
    };
};
