/**
 * Unified HR drift coaching analytics for steady, threshold, and race profiles.
 */

import { normalizeDate } from '../formatters';
import { getMondayYmd } from './coachWeekPlan';
import { addDaysToYmd } from '../dashboardVolumeTotals';
import {
    DRIFT_PROFILE,
    isEligibleThresholdDriftRide,
    isEligibleRaceDriftRide,
    driftProfileLabel,
} from './rideDurability';
import {
    isEligibleDecouplingRide,
    buildAerobicEfficiencyTrend,
    buildDecouplingPortfolioSummary,
    summarizeAerobicDecoupling,
    classifyDecouplingPercent,
    decouplingStatusLabel,
    DECOUPLING_STATUS,
    AEROBIC_TREND_STATUS,
    STEADY_RIDE_DECOUPLING_RATIONALE,
} from './aerobicDecoupling';

export const DRIFT_TAB_ORDER = [
    DRIFT_PROFILE.STEADY,
    DRIFT_PROFILE.THRESHOLD,
    DRIFT_PROFILE.RACE,
];

const PROFILE_META = {
    [DRIFT_PROFILE.STEADY]: {
        pctKey: 'decoupling_pct',
        efFirstKey: 'decoupling_ef_first',
        efSecondKey: 'decoupling_ef_second',
        statusKey: 'decoupling_status',
        sourceKey: 'decoupling_source',
        isEligible: isEligibleDecouplingRide,
        showWeeklyEfChart: true,
        driftMetricLabel: 'decoupling',
        emptyEligibleHint: 'Steady endurance rides with HR data (IF ~0.55–0.85)',
    },
    [DRIFT_PROFILE.THRESHOLD]: {
        pctKey: 'threshold_drift_pct',
        efFirstKey: 'threshold_drift_ef_first',
        efSecondKey: 'threshold_drift_ef_second',
        statusKey: 'threshold_drift_status',
        sourceKey: 'threshold_drift_source',
        isEligible: isEligibleThresholdDriftRide,
        showWeeklyEfChart: false,
        driftMetricLabel: 'threshold drift',
        emptyEligibleHint: 'Tempo / threshold rides (IF ~0.80–0.98, VI ≤1.35)',
    },
    [DRIFT_PROFILE.RACE]: {
        pctKey: 'race_drift_pct',
        efFirstKey: 'race_drift_ef_first',
        efSecondKey: 'race_drift_ef_second',
        statusKey: 'race_drift_status',
        sourceKey: 'race_drift_source',
        isEligible: isEligibleRaceDriftRide,
        showWeeklyEfChart: false,
        driftMetricLabel: 'race drift',
        emptyEligibleHint: 'Hard variable rides (IF ≥0.85, VI ≥1.05)',
    },
};

export const THRESHOLD_DRIFT_RATIONALE = {
    title: 'Why threshold tempo rides?',
    bullets: [
        'Threshold drift uses the same first-half vs second-half EF comparison, but on sustained hard aerobic / sub-threshold efforts.',
        'Eligible rides are typically ≥45 min with IF ~0.80–0.98 and moderate variability (VI ≤1.35) — tempo blocks, brisk group rides, long climbs.',
        'Steady Z2 rides use the Decoupling tab instead; interval sessions with big power swings use Race drift.',
        'Lower % is better: it means HR stayed coupled to power despite the harder overall intensity.',
    ],
};

export const RACE_DRIFT_RATIONALE = {
    title: 'Why race / variable efforts?',
    bullets: [
        'Race drift measures cardiac drift on high-intensity rides with meaningful power variability — races, hard group rides, fondos with surges.',
        'Eligible rides are ≥60 min with IF ≥0.85 and VI ≥1.05 (and not classified as steady or threshold).',
        'Interpret with context: some HR rise is expected when attacks and recoveries mix; compare similar event types over time.',
        'Use Activities → Decoupling backfill to analyze rides with stored power+HR streams.',
    ],
};

export function driftProfileRationale(profile) {
    switch (profile) {
        case DRIFT_PROFILE.THRESHOLD:
            return THRESHOLD_DRIFT_RATIONALE;
        case DRIFT_PROFILE.RACE:
            return RACE_DRIFT_RATIONALE;
        case DRIFT_PROFILE.STEADY:
        default:
            return STEADY_RIDE_DECOUPLING_RATIONALE;
    }
}

function averageFinite(values) {
    const valid = values.filter((v) => Number.isFinite(v));
    if (!valid.length) return null;
    return valid.reduce((sum, v) => sum + v, 0) / valid.length;
}

function mapRecentDriftRow(activity, meta) {
    const pct = Number(activity[meta.pctKey]);
    if (!Number.isFinite(pct)) return null;
    const efFirst = Number(activity[meta.efFirstKey]);
    const efSecond = Number(activity[meta.efSecondKey]);
    const status = activity[meta.statusKey] || classifyDecouplingPercent(pct);
    return {
        activityId: activity.id,
        date: activity.date,
        title: activity.title,
        driftPct: pct,
        status,
        source: activity[meta.sourceKey] || 'cached',
        efFirst: Number.isFinite(efFirst) ? efFirst : null,
        efSecond: Number.isFinite(efSecond) ? efSecond : null,
    };
}

/**
 * @param {object[]} activities
 * @param {number} profileFtp
 * @param {'steady' | 'threshold' | 'race'} profile
 * @param {{ referenceYmd?: string, weeks?: number }} [options]
 */
export function buildDriftProfileTrend(activities, profileFtp, profile, options = {}) {
    if (profile === DRIFT_PROFILE.STEADY) {
        const trend = buildAerobicEfficiencyTrend(activities, profileFtp, options);
        return {
            profile,
            ...trend,
            recentDrift: (trend.recentDecoupling || []).map((row) => ({
                activityId: row.activityId,
                date: row.date,
                title: row.title,
                driftPct: row.decouplingPct,
                status: row.status,
                source: row.decouplingSource || row.source,
                efFirst: row.efFirst,
                efSecond: row.efSecond,
            })),
            showWeeklyEfChart: true,
            weeklyDriftPoints: null,
        };
    }

    const meta = PROFILE_META[profile];
    const referenceYmd = options.referenceYmd || new Date().toISOString().slice(0, 10);
    const weeks = Math.max(4, Number(options.weeks) || 12);
    const endMonday = getMondayYmd(referenceYmd);
    const startMonday = addDaysToYmd(endMonday, -(weeks - 1) * 7);
    const windowEnd = addDaysToYmd(endMonday, 6);

    const buckets = new Map();
    for (let i = 0; i < weeks; i += 1) {
        const weekStart = addDaysToYmd(startMonday, i * 7);
        buckets.set(weekStart, { weekStart, driftValues: [], rideCount: 0 });
    }

    let eligibleRideCount = 0;
    for (const activity of activities || []) {
        if (!meta.isEligible(activity, profileFtp)) continue;
        const ymd = normalizeDate(activity.date);
        if (!ymd || ymd < startMonday || ymd > windowEnd) continue;

        eligibleRideCount += 1;
        const weekStart = getMondayYmd(ymd);
        const bucket = buckets.get(weekStart);
        if (!bucket) continue;

        bucket.rideCount += 1;
        const pct = Number(activity[meta.pctKey]);
        if (Number.isFinite(pct)) bucket.driftValues.push(pct);
    }

    const weeklyDriftPoints = [...buckets.values()].map((bucket) => ({
        weekStart: bucket.weekStart,
        avgDriftPct: averageFinite(bucket.driftValues),
        rideCount: bucket.rideCount,
        analyzedCount: bucket.driftValues.length,
    }));

    const populatedWeeks = weeklyDriftPoints.filter((w) => w.avgDriftPct != null);
    let trendStatus = AEROBIC_TREND_STATUS.INSUFFICIENT;
    let trendDelta = null;

    if (populatedWeeks.length >= 3) {
        const early = populatedWeeks.slice(0, Math.min(4, Math.floor(populatedWeeks.length / 2)));
        const late = populatedWeeks.slice(-Math.min(4, Math.ceil(populatedWeeks.length / 2)));
        const earlyAvg = averageFinite(early.map((w) => w.avgDriftPct));
        const lateAvg = averageFinite(late.map((w) => w.avgDriftPct));
        if (earlyAvg != null && lateAvg != null) {
            trendDelta = earlyAvg - lateAvg;
            if (trendDelta >= 1.5) trendStatus = AEROBIC_TREND_STATUS.IMPROVING;
            else if (trendDelta <= -1.5) trendStatus = AEROBIC_TREND_STATUS.DECLINING;
            else trendStatus = AEROBIC_TREND_STATUS.STABLE;
        }
    }

    const recentDrift = (activities || [])
        .filter((activity) => meta.isEligible(activity, profileFtp))
        .map((activity) => mapRecentDriftRow(activity, meta))
        .filter(Boolean)
        .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
        .slice(0, 10);

    return {
        profile,
        weeklyPoints: [],
        weeklyDriftPoints,
        eligibleRideCount,
        populatedWeekCount: populatedWeeks.length,
        trendStatus,
        trendDelta,
        recentDrift,
        showWeeklyEfChart: false,
    };
}

/**
 * @param {object[]} activities
 * @param {number} profileFtp
 * @param {'steady' | 'threshold' | 'race'} profile
 * @param {{ referenceYmd?: string, weeks?: number }} [options]
 */
export function buildDriftProfilePortfolio(activities, profileFtp, profile, options = {}) {
    if (profile === DRIFT_PROFILE.STEADY) {
        const portfolio = buildDecouplingPortfolioSummary(activities, profileFtp, options);
        return {
            profile,
            ...portfolio,
            driftMetricLabel: 'decoupling',
        };
    }

    const meta = PROFILE_META[profile];
    const referenceYmd = options.referenceYmd || new Date().toISOString().slice(0, 10);
    const weeks = Math.max(4, Number(options.weeks) || 12);
    const endMonday = getMondayYmd(referenceYmd);
    const startMonday = addDaysToYmd(endMonday, -(weeks - 1) * 7);
    const windowEnd = addDaysToYmd(endMonday, 6);

    const analyzed = [];
    let pendingStreamCount = 0;

    for (const activity of activities || []) {
        if (!meta.isEligible(activity, profileFtp)) continue;
        const ymd = normalizeDate(activity.date);
        if (!ymd || ymd < startMonday || ymd > windowEnd) continue;

        const pct = Number(activity[meta.pctKey]);
        if (Number.isFinite(pct)) {
            analyzed.push({
                driftPct: pct,
                status: activity[meta.statusKey] || classifyDecouplingPercent(pct),
                efFirst: Number(activity[meta.efFirstKey]),
                efSecond: Number(activity[meta.efSecondKey]),
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

    const avgDriftPct = analyzed.length
        ? analyzed.reduce((sum, row) => sum + row.driftPct, 0) / analyzed.length
        : null;

    return {
        profile,
        weeks,
        driftMetricLabel: meta.driftMetricLabel,
        analyzedCount: analyzed.length,
        pendingStreamCount,
        avgDriftPct,
        goodCount,
        moderateCount,
        highCount,
        goodSharePct: analyzed.length ? (goodCount / analyzed.length) * 100 : null,
        avgEfFirst: averageFinite(efFirstVals),
        avgEfSecond: averageFinite(efSecondVals),
    };
}

/**
 * @param {ReturnType<typeof buildDriftProfileTrend>} trend
 * @param {'steady' | 'threshold' | 'race'} profile
 */
export function summarizeDriftProfile(trend, profile) {
    const meta = PROFILE_META[profile];
    const label = driftProfileLabel(profile);

    if (profile === DRIFT_PROFILE.STEADY) {
        return summarizeAerobicDecoupling(trend);
    }

    if (!trend || trend.eligibleRideCount === 0) {
        return {
            headline: `Not enough ${label.toLowerCase()} data yet`,
            detail: `Log rides matching ${meta.emptyEligibleHint} with heart rate to track ${meta.driftMetricLabel}.`,
            trendStatus: AEROBIC_TREND_STATUS.INSUFFICIENT,
        };
    }

    const latestWeek = [...(trend.weeklyDriftPoints || [])].reverse().find((w) => w.avgDriftPct != null);
    const latestPct = latestWeek?.avgDriftPct != null ? latestWeek.avgDriftPct.toFixed(1) : null;

    if (trend.trendStatus === AEROBIC_TREND_STATUS.IMPROVING) {
        return {
            headline: `${label} is improving`,
            detail: latestPct
                ? `Recent analyzed rides average ${latestPct}% drift — HR is staying more coupled to power than earlier weeks.`
                : `${label} percentages are trending down across recent analyzed rides.`,
            trendStatus: trend.trendStatus,
        };
    }

    if (trend.trendStatus === AEROBIC_TREND_STATUS.DECLINING) {
        return {
            headline: `${label} is rising`,
            detail: latestPct
                ? `Recent rides average ${latestPct}% drift — watch fatigue, heat, and pacing on similar efforts.`
                : `${label} has crept up on comparable rides — prioritise recovery before the next hard block.`,
            trendStatus: trend.trendStatus,
        };
    }

    if (trend.trendStatus === AEROBIC_TREND_STATUS.STABLE) {
        return {
            headline: `${label} is stable`,
            detail: latestPct
                ? `Analyzed rides hold around ${latestPct}% drift — consistent durability on this intensity band.`
                : `${label} is holding steady across recent analyzed rides.`,
            trendStatus: trend.trendStatus,
        };
    }

    return {
        headline: `Building ${label.toLowerCase()} baseline`,
        detail: latestPct
            ? `Latest analyzed week averages ${latestPct}% — run Decoupling backfill on more eligible rides for a clearer trend.`
            : `Analyze a few more eligible rides with stream backfill to establish a ${meta.driftMetricLabel} trend.`,
        trendStatus: AEROBIC_TREND_STATUS.INSUFFICIENT,
    };
}

/**
 * Count eligible rides with stored drift per profile (for tab badges).
 * @param {object[]} activities
 * @param {number} profileFtp
 */
export function countDriftProfileSignals(activities, profileFtp) {
    const counts = {};
    for (const profile of DRIFT_TAB_ORDER) {
        const meta = PROFILE_META[profile];
        let eligible = 0;
        let analyzed = 0;
        for (const activity of activities || []) {
            if (!meta.isEligible(activity, profileFtp)) continue;
            eligible += 1;
            if (Number.isFinite(Number(activity[meta.pctKey]))) analyzed += 1;
        }
        counts[profile] = { eligible, analyzed };
    }
    return counts;
}

export { decouplingStatusLabel, DECOUPLING_STATUS, AEROBIC_TREND_STATUS, driftProfileLabel };
