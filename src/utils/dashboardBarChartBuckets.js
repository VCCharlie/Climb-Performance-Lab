/**
 * Single-pass bucket index for Dashboard Overview bar charts.
 * Builds week/month/year × all/indoor/outdoor buckets with all four metrics at once.
 */

import { normalizeDate, formatDateDDMMYYYY } from './formatters';
import { ymdToMondayYmd } from './dashboardVolumeTotals';

const METRIC_FIELDS = {
    distance: (a) => Number(a.distance) || 0,
    tss: (a) => Number(a.load) || 0,
    elevation: (a) => Number(a.climbing) || 0,
    moving_time: (a) => Number(a.moving_time) || 0,
};

function emptyBucket() {
    return { distance: 0, tss: 0, elevation: 0, moving_time: 0 };
}

function createRideTypeMaps() {
    return { all: {}, indoor: {}, outdoor: {} };
}

function createIndexShell() {
    return {
        week: createRideTypeMaps(),
        month: createRideTypeMaps(),
        year: createRideTypeMaps(),
    };
}

function rideTypesForActivity(activity) {
    const isIndoor = ['VirtualRide', 'VirtualRun'].includes(activity?.type);
    return isIndoor ? ['all', 'indoor'] : ['all', 'outdoor'];
}

function addToBucket(bucket, activity) {
    bucket.distance += METRIC_FIELDS.distance(activity);
    bucket.tss += METRIC_FIELDS.tss(activity);
    bucket.elevation += METRIC_FIELDS.elevation(activity);
    bucket.moving_time += METRIC_FIELDS.moving_time(activity);
}

/**
 * @param {object[]} activities
 * @returns {{ week: object, month: object, year: object }}
 */
export function buildOverviewBarChartIndex(activities) {
    const index = createIndexShell();

    for (const a of activities || []) {
        const ymd = normalizeDate(a?.date);
        if (!ymd || ymd.length < 10) continue;

        const weekKey = ymdToMondayYmd(ymd);
        if (!weekKey) continue;
        const monthKey = ymd.slice(0, 7);
        const yearKey = ymd.slice(0, 4);

        const keys = [
            ['week', weekKey],
            ['month', monthKey],
            ['year', yearKey],
        ];

        for (const rt of rideTypesForActivity(a)) {
            for (const [granularity, key] of keys) {
                const map = index[granularity][rt];
                if (!map[key]) map[key] = emptyBucket();
                addToBucket(map[key], a);
            }
        }
    }

    return index;
}

function bucketLabel(groupBy, key) {
    if (groupBy === 'week') {
        const label = formatDateDDMMYYYY(key);
        return label === '-' ? key : label;
    }
    if (groupBy === 'month') {
        const label = formatDateDDMMYYYY(`${key}-01`);
        return label === '-' ? key : label;
    }
    return key;
}

/**
 * @param {ReturnType<typeof buildOverviewBarChartIndex>} index
 * @param {'week'|'month'|'year'} groupBy
 * @param {'all'|'indoor'|'outdoor'} rideType
 * @param {'distance'|'tss'|'elevation'|'moving_time'} metric
 * @returns {{ label: string, value: number }[]}
 */
export function seriesFromBarChartIndex(index, groupBy, rideType, metric) {
    const map = index?.[groupBy]?.[rideType];
    if (!map) return [];

    const isTime = metric === 'moving_time';

    return Object.keys(map)
        .sort()
        .map((key) => {
            let value = map[key][metric] || 0;
            if (isTime) {
                value = Math.round((value / 3600) * 10) / 10;
            } else {
                value = Math.round(value);
            }
            return { label: bucketLabel(groupBy, key), value };
        });
}
