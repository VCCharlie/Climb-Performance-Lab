/**
 * src/utils/intervals.js
 * Intervals.icu specific logic
 */

import { normalizeDate } from './formatters';
import { determineActivityType } from './parsers';
import { extractStravaId } from './strava';

export const normalizeIntervalsActivity = (item) => {
    const getNum = (val) => { const n = Number(val); return isNaN(n) ? 0 : n; };
    const getVal = (...keys) => { for (const k of keys) { if (item[k] !== undefined && item[k] !== null && item[k] !== "") return item[k]; } return null; };

    const id = String(getVal('id', 'activity_id') || Math.random().toString(36).substr(2, 9));
    const dateStr = getVal('startDate', 'start_date_local', 'start_date', 'date');
    const title = getVal('name', 'title') || "Untitled";

    const movingTime = getNum(getVal('movingTime', 'moving_time', 'icu_recording_time', 'elapsedTime', 'elapsed_time', 'time'));
    const distanceMeters = getNum(getVal('distance', 'icu_distance', 'total_distance'));
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
    const ftp = getNum(getVal('ftp', 'icu_ftp', 'icu_pm_ftp', 'cp'));

    // Max Power: Try root keys first
    let maxPower = getNum(getVal('max_power', 'maxWatts', 'icu_max_watts', 'max_watts', 'p_max', 'icu_pm_p_max'));
    let maxPowerSource = 'Instant'; // Default

    // Fallback 1: Nested intervals
    if (maxPower === 0 && item.icu_intervals && Array.isArray(item.icu_intervals)) {
        const intervalMax = Math.max(...item.icu_intervals.map(i => Number(i.max_watts) || 0));
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
        type: finalType,
        moving_time: movingTime,
        distance: distanceMeters > 1000 ? (distanceMeters / 1000).toFixed(2) : distanceMeters,
        climbing: Math.round(climbing),
        avg_speed: (avgSpeedMs > 0 && avgSpeedMs < 15) ? (avgSpeedMs * 3.6).toFixed(1) : avgSpeedMs,
        norm_power: Math.round(normPower),
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
        avg_altitude: Math.round(avgAltitude),
        max_altitude: Math.round(maxAltitude)
    };
};
