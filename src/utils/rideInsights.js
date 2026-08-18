/**
 * Rule-based post-ride insights (plain-language summary from activity metrics).
 */

import { formatDateDDMMYYYY, normalizeDate } from './formatters';
import {
    activityIntensityFactor,
    activityMovingTimeSec,
} from './activityFilterMetrics';

const RIDE_TYPES = new Set([
    'Ride',
    'VirtualRide',
    'GravelRide',
    'MountainBikeRide',
    'EBikeRide',
]);

/** Variability Index ≈ NP ÷ average power */
export function activityVariabilityIndex(normPower, avgPower) {
    const np = Number(normPower);
    const ap = Number(avgPower);
    if (!Number.isFinite(np) || np <= 0 || !Number.isFinite(ap) || ap <= 0) return null;
    return np / ap;
}

/** Efficiency Factor ≈ NP ÷ average heart rate (W/bpm) */
export function activityEfficiencyFactor(normPower, avgHr) {
    const np = Number(normPower);
    const hr = Number(avgHr);
    if (!Number.isFinite(np) || np <= 0 || !Number.isFinite(hr) || hr <= 0) return null;
    return np / hr;
}

function classifyIfNarrative(ifVal) {
    if (ifVal == null) return null;
    if (ifVal < 0.75) return `Easy aerobic session (IF ${ifVal.toFixed(2)}).`;
    if (ifVal < 0.88) return `Steady endurance work at IF ${ifVal.toFixed(2)}.`;
    if (ifVal < 0.95) return `Tempo / sweet spot effort — IF ${ifVal.toFixed(2)}.`;
    if (ifVal < 1.05) return `Threshold-level ride at IF ${ifVal.toFixed(2)}.`;
    return `High-intensity session — IF ${ifVal.toFixed(2)}.`;
}

function isPowerPr(activity, field, allActivities, lookbackDays = 120) {
    const val = Number(activity?.[field]);
    if (!val || val <= 0) return false;
    const actDate = normalizeDate(activity.date);
    if (!actDate) return false;
    const cutoff = new Date(actDate);
    cutoff.setDate(cutoff.getDate() - lookbackDays);
    const cutoffYmd = cutoff.toISOString().slice(0, 10);

    let best = val;
    for (const a of allActivities || []) {
        const ymd = normalizeDate(a.date);
        if (!ymd || ymd < cutoffYmd || ymd > actDate) continue;
        if (String(a.id) === String(activity.id)) continue;
        const v = Number(a[field]);
        if (v > best) best = v;
    }
    return val >= best;
}

/**
 * @param {object} activity
 * @param {{ profileFtp?: number, allActivities?: object[] }} options
 */
export function buildRideInsights(activity, options = {}) {
    if (!activity) return null;

    const profileFtp = Number(options.profileFtp) || 0;
    const allActivities = options.allActivities || [];

    const ifVal = activityIntensityFactor(activity.norm_power, profileFtp);
    const vi = activityVariabilityIndex(activity.norm_power, activity.avg_power);
    const ef = activityEfficiencyFactor(activity.norm_power, activity.avg_hr);
    const tss = Math.round(Number(activity.load) || 0);
    const elev = Math.round(Number(activity.climbing) || 0);
    const durationMin = Math.round((activityMovingTimeSec(activity) || 0) / 60);

    const narrativeParts = [];
    const detailParts = [];
    const ifLine = classifyIfNarrative(ifVal);
    if (ifLine) narrativeParts.push(ifLine);

    if (elev >= 800) {
        narrativeParts.push(`Solid climbing load with ${elev} m elevation.`);
    } else if (elev >= 300) {
        narrativeParts.push(`Moderate climbing (${elev} m).`);
    }

    if (vi != null && durationMin >= 45) {
        if (vi <= 1.03) {
            detailParts.push('Very steady power delivery — good for aerobic conditioning.');
        } else if (vi >= 1.08) {
            detailParts.push('Spikey power (high variability) — normal for climbs, surges, or group rides.');
        }
    }

    if (ef != null) {
        const np = Math.round(Number(activity.norm_power) || 0);
        const hr = Math.round(Number(activity.avg_hr) || 0);
        const efContext = hr > 0 && np > 0 ? ` (${np} W NP ÷ ${hr} bpm)` : '';
        if (ef >= 1.55) {
            detailParts.push(`Strong cardiac efficiency at ${ef.toFixed(2)} W/bpm${efContext} — NP held well relative to heart rate.`);
        } else if (ef < 1.2 && durationMin >= 60) {
            detailParts.push(`Lower efficiency today (${ef.toFixed(2)} W/bpm${efContext}) — heat, fatigue, or incomplete recovery can pull EF down.`);
        }
    }

    if (tss >= 120) {
        detailParts.push('A demanding day — prioritise sleep and easy riding tomorrow.');
    } else if (tss > 0 && tss < 45 && durationMin >= 40) {
        detailParts.push('Light stress — useful for stacking consistency without heavy fatigue.');
    }

    const bullets = [];
    if (durationMin > 0) bullets.push(`${durationMin} min`);
    if (tss > 0) bullets.push(`${tss} TSS`);
    if (elev > 0) bullets.push(`${elev} m elev`);
    if (vi != null) bullets.push(`VI ${vi.toFixed(2)}`);
    if (ef != null) bullets.push(`EF ${ef.toFixed(2)} W/bpm`);

    const highlights = [];
    if (isPowerPr(activity, 'best_20min', allActivities)) {
        highlights.push('20 min power PR (120-day window)');
    }
    if (isPowerPr(activity, 'best_5min', allActivities)) {
        highlights.push('5 min power PR (120-day window)');
    }
    if (vi != null && vi <= 1.03 && durationMin >= 60) {
        highlights.push('Steady aerobic control (low variability)');
    }

    return {
        title: activity.title || 'Untitled ride',
        date: formatDateDDMMYYYY(activity.date),
        type: activity.type,
        summary: narrativeParts.join(' ').trim() || 'Ride logged — open details for full metrics.',
        detail: detailParts.join(' ').trim() || null,
        bullets,
        highlights,
        metrics: {
            if: ifVal,
            vi,
            ef,
            tss,
            elev,
            durationMin,
        },
    };
}

/** Most recent ride-like activity by calendar date (not list order). */
export function getLatestRideActivity(activities) {
    if (!activities?.length) return null;

    let latestRide = null;
    let latestYmd = null;

    for (const act of activities) {
        if (!RIDE_TYPES.has(act?.type)) continue;
        const ymd = normalizeDate(act.date);
        if (!ymd) continue;
        if (!latestYmd || ymd > latestYmd) {
            latestYmd = ymd;
            latestRide = act;
        }
    }

    if (latestRide) return latestRide;

    for (const act of activities) {
        if (RIDE_TYPES.has(act?.type)) return act;
    }
    return activities[0];
}
