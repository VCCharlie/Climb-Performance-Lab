/**
 * Aerobic decoupling (Pa:HR) and aerobic efficiency (EF) analysis.
 *
 * Within-ride decoupling compares power:HR efficiency in the first vs second half
 * of a steady endurance ride. That requires aligned power + HR samples (streams).
 * Without streams we still track EF trends across eligible rides.
 */

import { normalizeDate } from '../formatters.js';
import { activityIntensityFactor, activityMovingTimeSec } from '../activityFilterMetrics.js';
import { activityEfficiencyFactor, activityVariabilityIndex } from '../rideInsights.js';
import { getMondayYmd } from '../weekYmd.js';
import { addDaysToYmd } from '../dashboardVolumeTotals.js';

export const DECOUPLING_STATUS = {
    GOOD: 'good',
    MODERATE: 'moderate',
    HIGH: 'high',
    UNKNOWN: 'unknown',
};

export const AEROBIC_TREND_STATUS = {
    IMPROVING: 'improving',
    STABLE: 'stable',
    DECLINING: 'declining',
    INSUFFICIENT: 'insufficient',
};

const ENDURANCE_RIDE_TYPES = new Set([
    'Ride',
    'VirtualRide',
    'GravelRide',
    'MountainBikeRide',
    'EBikeRide',
]);

/**
 * @param {number | null | undefined} power
 * @param {number | null | undefined} hr
 * @returns {number | null}
 */
export function computeEfficiencyFactor(power, hr) {
    return activityEfficiencyFactor(power, hr);
}

/**
 * Positive decoupling % means HR drifted up relative to power in the second half.
 * @param {number | null | undefined} efFirst
 * @param {number | null | undefined} efSecond
 * @returns {number | null}
 */
export function computeDecouplingPercent(efFirst, efSecond) {
    if (!Number.isFinite(efFirst) || !Number.isFinite(efSecond) || efFirst <= 0) {
        return null;
    }
    return ((efFirst - efSecond) / efFirst) * 100;
}

/**
 * @param {number | null | undefined} decouplingPct
 * @returns {'good' | 'moderate' | 'high' | 'unknown'}
 */
export function classifyDecouplingPercent(decouplingPct) {
    if (decouplingPct == null || !Number.isFinite(decouplingPct)) {
        return DECOUPLING_STATUS.UNKNOWN;
    }
    if (decouplingPct <= 5) return DECOUPLING_STATUS.GOOD;
    if (decouplingPct <= 10) return DECOUPLING_STATUS.MODERATE;
    return DECOUPLING_STATUS.HIGH;
}

/**
 * Steady endurance rides suitable for decoupling / EF tracking.
 * @param {object | null | undefined} activity
 * @param {number} profileFtp
 * @param {{ minDurationMin?: number, minIf?: number, maxIf?: number, maxVi?: number }} [options]
 */
export function isEligibleDecouplingRide(activity, profileFtp, options = {}) {
    const {
        minDurationMin = 60,
        minIf = 0.55,
        maxIf = 0.85,
        maxVi = 1.08,
    } = options;

    if (!activity || !ENDURANCE_RIDE_TYPES.has(activity.type)) return false;

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

function averagePositive(values) {
    const valid = values.filter((v) => Number.isFinite(v) && v > 0);
    if (valid.length === 0) return null;
    return valid.reduce((sum, v) => sum + v, 0) / valid.length;
}

/**
 * Split aligned stream samples into first/second half averages.
 * @param {number[]} power
 * @param {number[]} hr
 * @param {number[] | null} [timeSec]
 */
export function splitStreamHalves(power, hr, timeSec = null) {
    if (!Array.isArray(power) || !Array.isArray(hr) || power.length < 4 || hr.length !== power.length) {
        return null;
    }

    let splitIndex = Math.floor(power.length / 2);
    if (Array.isArray(timeSec) && timeSec.length === power.length) {
        const start = timeSec[0];
        const end = timeSec[timeSec.length - 1];
        if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
            const mid = start + (end - start) / 2;
            const idx = timeSec.findIndex((t) => t >= mid);
            if (idx > 0 && idx < power.length) splitIndex = idx;
        }
    }

    const firstPower = power.slice(0, splitIndex);
    const firstHr = hr.slice(0, splitIndex);
    const secondPower = power.slice(splitIndex);
    const secondHr = hr.slice(splitIndex);
    if (firstPower.length < 2 || secondPower.length < 2) return null;

    const first = {
        power: averagePositive(firstPower),
        hr: averagePositive(firstHr),
    };
    const second = {
        power: averagePositive(secondPower),
        hr: averagePositive(secondHr),
    };
    if (first.power == null || first.hr == null || second.power == null || second.hr == null) {
        return null;
    }
    return { first, second };
}

/**
 * @param {{ power: number, hr: number } | null | undefined} firstHalf
 * @param {{ power: number, hr: number } | null | undefined} secondHalf
 */
export function analyzeDecouplingFromHalves(firstHalf, secondHalf) {
    const efFirst = computeEfficiencyFactor(firstHalf?.power, firstHalf?.hr);
    const efSecond = computeEfficiencyFactor(secondHalf?.power, secondHalf?.hr);
    const decouplingPct = computeDecouplingPercent(efFirst, efSecond);
    return {
        efFirst,
        efSecond,
        decouplingPct,
        status: classifyDecouplingPercent(decouplingPct),
    };
}

/**
 * @param {number[]} power
 * @param {number[]} hr
 * @param {number[] | null} [timeSec]
 */
export function analyzeDecouplingFromStreams(power, hr, timeSec = null) {
    const halves = splitStreamHalves(power, hr, timeSec);
    if (!halves) return null;
    return analyzeDecouplingFromHalves(halves.first, halves.second);
}

/**
 * Analyze one activity. Uses cached/stream fields when present; otherwise EF-only.
 * @param {object | null | undefined} activity
 * @param {number} profileFtp
 */
export function analyzeActivityDecoupling(activity, profileFtp) {
    if (!activity) {
        return {
            eligible: false,
            ef: null,
            decouplingPct: null,
            status: DECOUPLING_STATUS.UNKNOWN,
            source: 'missing',
        };
    }

    const eligible = isEligibleDecouplingRide(activity, profileFtp);
    const ef = computeEfficiencyFactor(activity.norm_power, activity.avg_hr);

    if (Number.isFinite(Number(activity.decoupling_pct))) {
        const decouplingPct = Number(activity.decoupling_pct);
        return {
            eligible,
            ef,
            decouplingPct,
            status: classifyDecouplingPercent(decouplingPct),
            source: 'cached',
        };
    }

    if (Array.isArray(activity.power_stream) && Array.isArray(activity.hr_stream)) {
        const streamAnalysis = analyzeDecouplingFromStreams(
            activity.power_stream,
            activity.hr_stream,
            activity.time_stream,
        );
        if (streamAnalysis) {
            return {
                eligible,
                ef,
                ...streamAnalysis,
                source: 'streams',
            };
        }
    }

    return {
        eligible,
        ef,
        decouplingPct: null,
        efFirst: null,
        efSecond: null,
        status: DECOUPLING_STATUS.UNKNOWN,
        source: eligible ? 'ef-only' : 'ineligible',
    };
}

function averageEf(values) {
    const valid = values.filter((v) => Number.isFinite(v) && v > 0);
    if (valid.length === 0) return null;
    return valid.reduce((sum, v) => sum + v, 0) / valid.length;
}

/**
 * Weekly aerobic efficiency (EF) trend for eligible steady rides.
 * @param {object[]} activities
 * @param {number} profileFtp
 * @param {{ referenceYmd?: string, weeks?: number }} [options]
 */
export function buildAerobicEfficiencyTrend(activities, profileFtp, options = {}) {
    const referenceYmd = options.referenceYmd || new Date().toISOString().slice(0, 10);
    const weeks = Math.max(4, Number(options.weeks) || 12);
    const endMonday = getMondayYmd(referenceYmd);
    const startMonday = addDaysToYmd(endMonday, -(weeks - 1) * 7);

    const buckets = new Map();
    for (let i = 0; i < weeks; i += 1) {
        const weekStart = addDaysToYmd(startMonday, i * 7);
        buckets.set(weekStart, { weekStart, efValues: [], rideCount: 0 });
    }

    let eligibleRideCount = 0;
    for (const activity of activities || []) {
        if (!isEligibleDecouplingRide(activity, profileFtp)) continue;
        const ymd = normalizeDate(activity.date);
        if (!ymd || ymd < startMonday || ymd > addDaysToYmd(endMonday, 6)) continue;

        const ef = computeEfficiencyFactor(activity.norm_power, activity.avg_hr);
        if (ef == null) continue;

        const weekStart = getMondayYmd(ymd);
        const bucket = buckets.get(weekStart);
        if (!bucket) continue;

        bucket.efValues.push(ef);
        bucket.rideCount += 1;
        eligibleRideCount += 1;
    }

    const weeklyPoints = [...buckets.values()].map((bucket) => ({
        weekStart: bucket.weekStart,
        avgEf: averageEf(bucket.efValues),
        rideCount: bucket.rideCount,
    }));

    const populatedWeeks = weeklyPoints.filter((w) => w.avgEf != null);
    let trendStatus = AEROBIC_TREND_STATUS.INSUFFICIENT;
    let trendDelta = null;

    if (populatedWeeks.length >= 3) {
        const early = populatedWeeks.slice(0, Math.min(4, Math.floor(populatedWeeks.length / 2)));
        const late = populatedWeeks.slice(-Math.min(4, Math.ceil(populatedWeeks.length / 2)));
        const earlyAvg = averageEf(early.map((w) => w.avgEf));
        const lateAvg = averageEf(late.map((w) => w.avgEf));
        if (earlyAvg != null && lateAvg != null) {
            trendDelta = lateAvg - earlyAvg;
            if (trendDelta >= 0.04) trendStatus = AEROBIC_TREND_STATUS.IMPROVING;
            else if (trendDelta <= -0.04) trendStatus = AEROBIC_TREND_STATUS.DECLINING;
            else trendStatus = AEROBIC_TREND_STATUS.STABLE;
        }
    }

    const recentDecoupling = (activities || [])
        .map((activity) => {
            const analysis = analyzeActivityDecoupling(activity, profileFtp);
            if (!analysis || analysis.decouplingPct == null) return null;
            if (analysis.source !== 'streams' && analysis.source !== 'cached') return null;
            return {
                ...analysis,
                activityId: activity.id,
                date: activity.date,
                title: activity.title,
                decouplingSource: activity.decoupling_source || analysis.source,
                efFirst: analysis.efFirst ?? (Number.isFinite(Number(activity.decoupling_ef_first))
                    ? Number(activity.decoupling_ef_first)
                    : null),
                efSecond: analysis.efSecond ?? (Number.isFinite(Number(activity.decoupling_ef_second))
                    ? Number(activity.decoupling_ef_second)
                    : null),
            };
        })
        .filter(Boolean)
        .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
        .slice(0, 10);

    return {
        weeklyPoints,
        eligibleRideCount,
        populatedWeekCount: populatedWeeks.length,
        trendStatus,
        trendDelta,
        recentDecoupling,
    };
}

/**
 * Plain-language summary for Coach UI (English).
 * @param {ReturnType<typeof buildAerobicEfficiencyTrend>} trend
 */
export function summarizeAerobicDecoupling(trend) {
    if (!trend || trend.eligibleRideCount === 0) {
        return {
            headline: 'Not enough steady endurance data yet',
            detail: 'Log rides of 60+ min with heart rate in the aerobic range (IF ~0.55–0.85) to track aerobic efficiency.',
            trendStatus: AEROBIC_TREND_STATUS.INSUFFICIENT,
        };
    }

    const latestWeek = [...(trend.weeklyPoints || [])].reverse().find((w) => w.avgEf != null);
    const latestEf = latestWeek?.avgEf != null ? latestWeek.avgEf.toFixed(2) : null;

    if (trend.trendStatus === AEROBIC_TREND_STATUS.IMPROVING) {
        return {
            headline: 'Aerobic efficiency is improving',
            detail: latestEf
                ? `Recent steady rides average ${latestEf} W/bpm — more power per heartbeat than earlier weeks.`
                : 'Steady endurance rides show better power:HR efficiency than earlier in this block.',
            trendStatus: trend.trendStatus,
        };
    }

    if (trend.trendStatus === AEROBIC_TREND_STATUS.DECLINING) {
        return {
            headline: 'Aerobic efficiency is drifting down',
            detail: latestEf
                ? `Recent steady rides average ${latestEf} W/bpm — prioritise easy volume, sleep, and heat management.`
                : 'Power:HR on steady rides has softened — ease intensity and protect recovery.',
            trendStatus: trend.trendStatus,
        };
    }

    if (trend.trendStatus === AEROBIC_TREND_STATUS.STABLE) {
        return {
            headline: 'Aerobic efficiency is stable',
            detail: latestEf
                ? `Steady rides hold around ${latestEf} W/bpm — maintain consistent Z2 volume.`
                : 'Your aerobic efficiency on steady rides is holding steady across recent weeks.',
            trendStatus: trend.trendStatus,
        };
    }

    return {
        headline: 'Building aerobic efficiency baseline',
        detail: latestEf
            ? `Latest steady week averages ${latestEf} W/bpm — add a few more similar rides for a clear trend.`
            : 'Keep stacking steady endurance rides with HR data to establish a trend.',
        trendStatus: AEROBIC_TREND_STATUS.INSUFFICIENT,
    };
}

export function decouplingStatusLabel(status) {
    switch (status) {
        case DECOUPLING_STATUS.GOOD:
            return 'Low decoupling (≤5%)';
        case DECOUPLING_STATUS.MODERATE:
            return 'Moderate decoupling (5–10%)';
        case DECOUPLING_STATUS.HIGH:
            return 'High decoupling (>10%)';
        default:
            return 'Decoupling unavailable';
    }
}

/**
 * Portfolio stats for analyzed steady rides in the trend window.
 * @param {object[]} activities
 * @param {number} profileFtp
 * @param {{ referenceYmd?: string, weeks?: number }} [options]
 */
export function buildDecouplingPortfolioSummary(activities, profileFtp, options = {}) {
    const referenceYmd = options.referenceYmd || new Date().toISOString().slice(0, 10);
    const weeks = Math.max(4, Number(options.weeks) || 12);
    const endMonday = getMondayYmd(referenceYmd);
    const startMonday = addDaysToYmd(endMonday, -(weeks - 1) * 7);
    const windowEnd = addDaysToYmd(endMonday, 6);

    const analyzed = [];
    let pendingStreamCount = 0;

    for (const activity of activities || []) {
        if (!isEligibleDecouplingRide(activity, profileFtp)) continue;
        const ymd = normalizeDate(activity.date);
        if (!ymd || ymd < startMonday || ymd > windowEnd) continue;

        if (Number.isFinite(Number(activity.decoupling_pct))) {
            const decouplingPct = Number(activity.decoupling_pct);
            analyzed.push({
                decouplingPct,
                status: classifyDecouplingPercent(decouplingPct),
                efFirst: Number(activity.decoupling_ef_first),
                efSecond: Number(activity.decoupling_ef_second),
            });
        } else {
            pendingStreamCount += 1;
        }
    }

    const goodCount = analyzed.filter((r) => r.status === DECOUPLING_STATUS.GOOD).length;
    const moderateCount = analyzed.filter((r) => r.status === DECOUPLING_STATUS.MODERATE).length;
    const highCount = analyzed.filter((r) => r.status === DECOUPLING_STATUS.HIGH).length;

    const efFirstVals = analyzed.map((r) => r.efFirst).filter((v) => Number.isFinite(v));
    const efSecondVals = analyzed.map((r) => r.efSecond).filter((v) => Number.isFinite(v));

    const avgDecouplingPct = analyzed.length
        ? analyzed.reduce((sum, row) => sum + row.decouplingPct, 0) / analyzed.length
        : null;

    return {
        weeks,
        analyzedCount: analyzed.length,
        pendingStreamCount,
        avgDecouplingPct,
        goodCount,
        moderateCount,
        highCount,
        goodSharePct: analyzed.length ? (goodCount / analyzed.length) * 100 : null,
        avgEfFirst: averageEf(efFirstVals),
        avgEfSecond: averageEf(efSecondVals),
    };
}

/**
 * Coaching copy for a single ride with stream decoupling (English UI).
 * @param {object | null | undefined} activity
 */
export function describeRideDecouplingInterpretation(activity) {
    const pct = Number(activity?.decoupling_pct);
    if (!Number.isFinite(pct)) return null;

    const efFirst = Number(activity.decoupling_ef_first);
    const efSecond = Number(activity.decoupling_ef_second);
    const efLine = Number.isFinite(efFirst) && Number.isFinite(efSecond)
        ? ` Efficiency drifted from ${efFirst.toFixed(2)} to ${efSecond.toFixed(2)} W/bpm (NP÷HR).`
        : '';

    if (pct <= 5) {
        return {
            headline: 'Strong aerobic coupling on this ride',
            detail: `Heart rate stayed efficient for similar power across the ride — classic sign of good aerobic fitness on endurance work.${efLine}`,
        };
    }
    if (pct <= 10) {
        return {
            headline: 'Moderate cardiac drift',
            detail: `HR rose slightly relative to power in the second half.${efLine} Common with heat, fatigue, or glycogen depletion — check fueling and pacing.`,
        };
    }
    return {
        headline: 'High cardiac drift — worth attention',
        detail: `Power:HR efficiency dropped noticeably in the second half.${efLine} Often heat, dehydration, going out too hard, or accumulated fatigue.`,
    };
}

/** Plain-language rationale for steady-ride filter (English UI). */
export const STEADY_RIDE_DECOUPLING_RATIONALE = {
    title: 'Why only steady endurance rides?',
    bullets: [
        'Decoupling splits the ride in half and compares power÷heart rate (EF). That only means something when power is fairly steady.',
        'On interval or race rides, the second half is often harder — HR rises because of effort changes, not aerobic drift.',
        'We therefore use rides ≥60 min with IF ~0.55–0.85 and low variability (VI ≤1.08): your Z2 / endurance pace.',
        'Hard sessions still matter for fitness — they are just tracked with other metrics (load, NP, intervals), not Pa:HR decoupling.',
    ],
};
