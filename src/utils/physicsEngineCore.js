/**
 * Pure climb physics for PhysicsEngine (Newton-Raphson + steady power model).
 */
import { parseDurationToSeconds } from './formatters';
import { calculateFerrariWatts } from './calculations';
import { getCogganZoneForIntensityFactor } from './cogganZoneForIntensity.js';

export const EMPTY_PHYSICS_CALC = {
    watts: 0,
    wkg: 0,
    time: '',
    seconds: 0,
    vam: 0,
    zone: null,
    ferrariWatts: 0,
    ferrariWkg: 0,
    ifRatio: 0
};

/**
 * @param {object} p
 * @param {object} p.selectedClimb - lengthKm, elevation, avgGrade
 * @param {{ weight: number, bikeWeight: number, ftp: number }} p.userSettings
 * @param {'target'|'predict'} p.mode
 * @param {string} p.targetTimeStr
 * @param {number|string} p.targetWatts
 * @param {number} p.cda
 * @param {number} p.crr
 * @param {number} p.loss - drivetrain loss fraction
 */
export function computePhysicsClimb(p) {
    const {
        selectedClimb,
        userSettings,
        mode,
        targetTimeStr,
        targetWatts,
        cda,
        crr,
        loss
    } = p;

    if (!selectedClimb) return { ...EMPTY_PHYSICS_CALC };

    const totalWeight = userSettings.weight + userSettings.bikeWeight;
    const grade = selectedClimb.avgGrade / 100;
    const distance = selectedClimb.lengthKm * 1000;
    const elevation = selectedClimb.elevation;
    const g = 9.81;
    const rho = 1.225;

    let watts = 0;
    let seconds = 0;

    if (mode === 'target') {
        seconds = parseDurationToSeconds(targetTimeStr);
        if (seconds > 0) {
            const v = distance / seconds;
            const F_g = totalWeight * g * Math.sin(Math.atan(grade));
            const F_r = totalWeight * g * Math.cos(Math.atan(grade)) * crr;
            const F_a = 0.5 * rho * cda * v * v;
            const P_wheel = (F_g + F_r + F_a) * v;
            watts = P_wheel / (1 - loss);
        }
    } else {
        watts = parseFloat(targetWatts);
        if (Number.isNaN(watts)) watts = 0;
        const P_wheel = watts * (1 - loss);
        const theta = Math.atan(grade);
        const K1 = 0.5 * rho * cda;
        const K2 = totalWeight * g * (Math.sin(theta) + crr * Math.cos(theta));
        let v = 3;
        for (let i = 0; i < 10; i++) {
            const f = K1 * Math.pow(v, 3) + K2 * v - P_wheel;
            const df = 3 * K1 * Math.pow(v, 2) + K2;
            v = v - f / df;
        }
        seconds = v > 0 ? distance / v : 0;
    }

    const ftp = userSettings.ftp || 1;
    const wkg = userSettings.weight > 0 ? watts / userSettings.weight : 0;
    const vam = seconds > 0 ? (elevation / seconds) * 3600 : 0;
    const ifRatio = ftp > 0 ? watts / ftp : 0;
    const zone = getCogganZoneForIntensityFactor(ifRatio);

    const timeStr = new Date(seconds * 1000).toISOString().substr(11, 8);

    return {
        watts: Math.round(watts),
        wkg: wkg.toFixed(2),
        time: timeStr,
        seconds,
        vam: Math.round(vam),
        ferrariWatts: calculateFerrariWatts(vam, grade * 100, totalWeight),
        ferrariWkg: calculateFerrariWatts(vam, grade * 100),
        zone,
        ifRatio
    };
}

/** Steady-state TSS approximation (NP ≈ average power for constant effort). */
export function estimateSteadyTss(seconds, watts, ftp) {
    if (!seconds || !watts || !ftp || ftp <= 0) return 0;
    const ifac = watts / ftp;
    return Math.round((seconds * watts * ifac) / (ftp * 3600) * 100);
}

export function formatSignedInt(n) {
    if (n === 0) return '0';
    return n > 0 ? `+${n}` : String(n);
}

/** e.g. +1:05:30 or -12:00 (always H:MM:SS when |sec| >= 1h). */
export function formatSignedDuration(totalSeconds) {
    const s = Math.round(totalSeconds);
    if (s === 0) return '0:00';
    const sign = s > 0 ? '+' : '-';
    const abs = Math.abs(s);
    const h = Math.floor(abs / 3600);
    const m = Math.floor((abs % 3600) / 60);
    const sec = abs % 60;
    const body = h > 0
        ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
        : `${m}:${String(sec).padStart(2, '0')}`;
    return `${sign}${body}`;
}

/** Add seconds to a duration string (H:MM:SS or MM:SS). */
export function addSecondsToTimeStr(timeStr, deltaSec) {
    const base = parseDurationToSeconds(timeStr);
    const newSec = Math.max(0, base + deltaSec);
    const d = new Date(newSec * 1000);
    return newSec >= 3600
        ? d.toISOString().substr(11, 8)
        : d.toISOString().substr(14, 5);
}

/**
 * Same climb length (horizontal, m). How much farther along the road you'd get in scenario A's
 * duration if you rode at scenario B's average speed: (vB * tA) - distance.
 * Positive = B is faster → in A's time at B's pace you finish the climb and keep going.
 */
export function horizontalDistanceDeltaInATimeAtBPace(distanceM, secondsA, secondsB) {
    if (!distanceM || distanceM <= 0 || !secondsA || !secondsB || secondsA <= 0 || secondsB <= 0) {
        return 0;
    }
    const vB = distanceM / secondsB;
    return vB * secondsA - distanceM;
}

/** Reverse: distance covered in B's time at A's pace minus climb length. */
export function horizontalDistanceDeltaInBTimeAtAPace(distanceM, secondsA, secondsB) {
    if (!distanceM || distanceM <= 0 || !secondsA || !secondsB || secondsA <= 0 || secondsB <= 0) {
        return 0;
    }
    const vA = distanceM / secondsA;
    return vA * secondsB - distanceM;
}

/** Human-readable signed horizontal delta (m, optional km in parentheses). */
export function formatSignedHorizontalDelta(meters) {
    const m = Math.round(meters);
    if (m === 0) return '0 m';
    const sign = m > 0 ? '+' : '-';
    const abs = Math.abs(m);
    if (abs < 1000) {
        return `${sign}${abs} m`;
    }
    const km = abs / 1000;
    const kmStr = km >= 10 ? km.toFixed(1) : km.toFixed(2);
    return `${sign}${kmStr} km (${sign}${abs.toLocaleString('en-US')} m)`;
}
