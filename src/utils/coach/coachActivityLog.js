/**
 * Activity log serialization and volume summaries for coach Q&A / LLM context.
 */

import { ACTIVITY_COLUMNS } from '../../config';
import { normalizeDate } from '../formatters';
import { addDaysToYmd } from '../dashboardVolumeTotals';
import { activityIF, filterActivitiesInRange, movingTimeSec, sumTss, todayYmd } from './coachHelpers';

/** Max individual rides sent to LLM (most recent first). Yearly stats always cover full history. */
export const COACH_ACTIVITY_LOG_MAX_RIDES = 500;

const EXTRA_ACTIVITY_KEYS = ['best_90min', 'best_120min', 'best_150min', 'best_180min', 'id'];

const NUMERIC_ROUND = {
    distance: 1,
    climbing: 0,
    avg_speed: 1,
    norm_power: 0,
    avg_power: 0,
    load: 0,
    work: 0,
    rpe: 1,
};

function isRideType(type) {
    const t = String(type || '').toLowerCase();
    return t.includes('ride') || t.includes('virtual') || t.includes('gravel') || t.includes('mountain');
}

function roundValue(key, value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    const decimals = NUMERIC_ROUND[key] ?? 0;
    const factor = 10 ** decimals;
    return Math.round(n * factor) / factor;
}

/**
 * Normalize one activity row for coach (all Activity Log columns + 90/120 min peaks).
 * @param {object} activity
 * @param {number} [ftp]
 */
export function serializeActivityForCoach(activity, ftp = 0) {
    const date = normalizeDate(activity?.date);
    if (!date) return null;

    /** @type {Record<string, string | number>} */
    const row = { date };

    for (const col of ACTIVITY_COLUMNS) {
        const key = col.key;
        if (key === 'date') continue;
        const raw = activity[key];
        if (raw === undefined || raw === null || raw === '') continue;
        if (typeof raw === 'string' && !raw.trim()) continue;

        if (key === 'moving_time') {
            const sec = movingTimeSec(raw);
            if (sec > 0) {
                row.durationMin = Math.round(sec / 60);
            }
            continue;
        }

        if (key === 'strava_kom_summary' && typeof raw === 'string' && raw.length > 80) {
            row.strava_kom_summary = `${raw.slice(0, 77)}…`;
            continue;
        }

        if (typeof raw === 'number' || (typeof raw === 'string' && raw !== '' && !Number.isNaN(Number(raw)))) {
            const rounded = roundValue(key, raw);
            if (rounded != null && rounded !== 0) {
                row[key] = rounded;
            } else if (['distance', 'load', 'climbing'].includes(key) && rounded === 0) {
                row[key] = 0;
            }
        } else if (typeof raw === 'string') {
            row[key] = raw.trim();
        }
    }

    for (const key of EXTRA_ACTIVITY_KEYS) {
        if (key === 'id' && activity.id) {
            row.id = String(activity.id);
            continue;
        }
        const rounded = roundValue(key, activity[key]);
        if (rounded != null && rounded > 0) {
            row[key] = rounded;
        }
    }

    const ifVal = activityIF(activity, ftp);
    if (ifVal != null && !row.intensity_factor) {
        row.intensity_factor = Math.round(ifVal * 1000) / 1000;
    }

    return row;
}

function aggregateActivities(list) {
    let distanceKm = 0;
    let elevationM = 0;
    let movingSec = 0;
    let virtualRides = 0;
    let longRides = 0;

    for (const a of list) {
        distanceKm += Number(a.distance) || 0;
        elevationM += Number(a.climbing) || 0;
        const sec = movingTimeSec(a.moving_time);
        movingSec += sec;
        if (String(a.type || '').toLowerCase().includes('virtual')) virtualRides += 1;
        if (sec >= 2 * 3600) longRides += 1;
    }

    return {
        rideCount: list.length,
        distanceKm: Math.round(distanceKm * 10) / 10,
        elevationM: Math.round(elevationM),
        movingHours: Math.round((movingSec / 3600) * 10) / 10,
        tss: Math.round(sumTss(list)),
        virtualRides,
        longRides,
    };
}

/**
 * @param {object[]} activities
 * @param {string} endYmd
 */
function buildPeriodVolumes(activities, endYmd) {
    const windows = [
        { key: 'days7', days: 7 },
        { key: 'days28', days: 28 },
        { key: 'days90', days: 90 },
        { key: 'days365', days: 365 },
    ];

    /** @type {Record<string, ReturnType<typeof aggregateActivities>>} */
    const out = {};
    for (const { key, days } of windows) {
        const start = addDaysToYmd(endYmd, -(days - 1));
        const list = filterActivitiesInRange(activities, start, endYmd).filter((a) => isRideType(a.type));
        out[key] = aggregateActivities(list);
    }
    return out;
}

/**
 * @param {object[]} activities
 */
function buildYearlyStats(activities) {
    /** @type {Map<number, object[]>} */
    const byYear = new Map();

    for (const a of activities) {
        if (!isRideType(a.type)) continue;
        const ymd = normalizeDate(a.date);
        if (!ymd) continue;
        const year = parseInt(ymd.slice(0, 4), 10);
        if (!Number.isFinite(year)) continue;
        if (!byYear.has(year)) byYear.set(year, []);
        byYear.get(year).push(a);
    }

    return [...byYear.entries()]
        .sort(([a], [b]) => a - b)
        .map(([year, list]) => ({
            year,
            ...aggregateActivities(list),
        }));
}

/**
 * @param {object[]} activities
 * @param {number} [ftp]
 * @param {object} [options]
 */
export function buildCoachActivityLog(activities, ftp = 0, options = {}) {
    const endYmd = options.endYmd || todayYmd();
    const unlimited = Boolean(options.fullLog);
    const maxRides = unlimited
        ? (activities || []).length
        : (options.maxRides ?? COACH_ACTIVITY_LOG_MAX_RIDES);
    const rideActivities = (activities || []).filter((a) => isRideType(a.type));

    const sorted = [...rideActivities].sort((a, b) => {
        const da = normalizeDate(a.date) || '';
        const db = normalizeDate(b.date) || '';
        return db.localeCompare(da);
    });

    const serialized = sorted
        .slice(0, maxRides)
        .map((a) => serializeActivityForCoach(a, ftp))
        .filter(Boolean);

    const earliest = sorted.length > 0 ? normalizeDate(sorted[sorted.length - 1].date) : null;
    const latest = sorted.length > 0 ? normalizeDate(sorted[0].date) : null;

    return {
        totals: aggregateActivities(rideActivities),
        periodVolume: buildPeriodVolumes(rideActivities, endYmd),
        yearlyStats: buildYearlyStats(rideActivities),
        rides: serialized,
        ridesIncluded: serialized.length,
        ridesTotal: rideActivities.length,
        truncated: rideActivities.length > maxRides,
        dateRange: { earliest, latest },
        fieldsDocumented: [
            ...ACTIVITY_COLUMNS.map((c) => c.key).filter((k) => k !== 'date'),
            'durationMin',
            'best_90min',
            'best_120min',
            'best_150min',
            'best_180min',
        ],
    };
}
