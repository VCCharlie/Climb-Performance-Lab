/**
 * Map Intervals.icu zone-time payloads to compact per-zone second arrays on activities.
 */

import { COGGAN_ZONES } from '../cogganZones.js';

/** Coggan power zones Z1–Z7 */
export const POWER_ZONE_COUNT = COGGAN_ZONES.length;

const ZONE_ID_RE = /^Z?(\d+)$/i;

/**
 * @param {string} id
 * @returns {number} 1-based zone index, or 0 when unknown
 */
function zoneIndexFromId(id) {
    const match = ZONE_ID_RE.exec(String(id || '').trim());
    if (!match) return 0;
    const n = parseInt(match[1], 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * @param {number[] | null | undefined} arr
 * @param {number} [expectedLen]
 * @returns {number[] | null}
 */
export function normalizeZoneSecondsArray(arr, expectedLen = POWER_ZONE_COUNT) {
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const len = Math.max(1, Math.floor(Number(expectedLen) || POWER_ZONE_COUNT));
    const out = [];
    for (let i = 0; i < len; i += 1) {
        out.push(Math.max(0, Math.round(Number(arr[i]) || 0)));
    }
    return out;
}

/**
 * @param {number[] | null | undefined} zoneSec
 * @returns {boolean}
 */
export function hasZoneTimesData(zoneSec) {
    if (!Array.isArray(zoneSec)) return false;
    return zoneSec.some((sec) => Number(sec) > 0);
}

/**
 * @param {unknown} raw
 * @param {number} [expectedLen]
 * @returns {number[] | null}
 */
export function mapIntervalsPowerZoneTimes(raw, expectedLen = POWER_ZONE_COUNT) {
    if (raw == null) return null;

    if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'number') {
        const compact = normalizeZoneSecondsArray(raw, expectedLen);
        return hasZoneTimesData(compact) ? compact : null;
    }

    if (!Array.isArray(raw)) return null;

    const len = Math.max(1, Math.floor(Number(expectedLen) || POWER_ZONE_COUNT));
    const out = Array(len).fill(0);
    let touched = false;

    for (const entry of raw) {
        if (entry == null) continue;

        if (typeof entry === 'number') {
            const idx = out.findIndex((v) => v === 0 && !touched);
            if (idx >= 0 && idx < len) {
                out[idx] = Math.max(0, Math.round(entry));
                touched = true;
            }
            continue;
        }

        if (typeof entry !== 'object') continue;

        const zoneIdx = zoneIndexFromId(entry.id ?? entry.zone ?? entry.name);
        const secs = Math.max(
            0,
            Math.round(Number(entry.secs ?? entry.seconds ?? entry.time ?? entry.duration) || 0),
        );
        if (zoneIdx >= 1 && zoneIdx <= len && secs > 0) {
            out[zoneIdx - 1] = secs;
            touched = true;
        }
    }

    return touched ? out : null;
}

/**
 * @param {unknown} raw
 * @param {number} [expectedLen]
 * @returns {number[] | null}
 */
export function mapIntervalsHrZoneTimes(raw, expectedLen = 7) {
    if (raw == null) return null;

    if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'number') {
        const compact = normalizeZoneSecondsArray(raw, expectedLen);
        return hasZoneTimesData(compact) ? compact : null;
    }

    if (!Array.isArray(raw)) return null;

    const objectMapped = mapIntervalsPowerZoneTimes(raw, expectedLen);
    if (objectMapped) return objectMapped;

    return null;
}

/**
 * Build normalized zone-time fields from a raw Intervals payload or partial activity.
 *
 * @param {object | null | undefined} rawItem
 * @param {{ zone_times_ftp?: number, ftp?: number }} [context]
 * @returns {object}
 */
export function buildZoneTimesFields(rawItem, context = {}) {
    if (!rawItem || typeof rawItem !== 'object') return {};

    const powerRaw = rawItem.icu_zone_times ?? rawItem.power_zone_sec;
    const hrRaw = rawItem.icu_hr_zone_times ?? rawItem.hr_zone_sec;

    const power_zone_sec = mapIntervalsPowerZoneTimes(powerRaw);
    const hr_zone_sec = mapIntervalsHrZoneTimes(hrRaw);

    if (!power_zone_sec && !hr_zone_sec) return {};

    const fields = {};
    if (power_zone_sec) {
        fields.power_zone_sec = power_zone_sec;
        fields.zone_times_source = rawItem.zone_times_source || 'intervals';
    }
    if (hr_zone_sec) {
        fields.hr_zone_sec = hr_zone_sec;
    }

    const ftpCandidates = [
        context.zone_times_ftp,
        context.ftp,
        rawItem.zone_times_ftp,
        rawItem.icu_ftp,
        rawItem.ftp,
        rawItem.icu_rolling_ftp,
        rawItem.icu_pm_ftp,
        rawItem.icu_eftp,
    ];
    for (const candidate of ftpCandidates) {
        const n = Number(candidate);
        if (n > 0) {
            fields.zone_times_ftp = Math.round(n);
            break;
        }
    }

    return fields;
}

/**
 * Preserve enriched zone times when Intervals re-sync returns empty zone arrays.
 *
 * @param {object} incoming
 * @param {object} existing
 * @param {object} out
 */
export function protectZoneTimesOnMerge(incoming, existing, out) {
    if (!existing || !out) return;

    const incomingPower = incoming?.power_zone_sec;
    const existingPower = existing?.power_zone_sec;
    if (!hasZoneTimesData(incomingPower) && hasZoneTimesData(existingPower)) {
        out.power_zone_sec = existing.power_zone_sec;
        if (existing.zone_times_source) out.zone_times_source = existing.zone_times_source;
        if (existing.zone_times_ftp) out.zone_times_ftp = existing.zone_times_ftp;
    }

    const incomingHr = incoming?.hr_zone_sec;
    const existingHr = existing?.hr_zone_sec;
    if (!hasZoneTimesData(incomingHr) && hasZoneTimesData(existingHr)) {
        out.hr_zone_sec = existing.hr_zone_sec;
    }
}

/**
 * @param {object[]} activities
 * @returns {boolean}
 */
export function activitiesHaveZoneTimes(activities) {
    return (activities || []).some((act) => hasZoneTimesData(act?.power_zone_sec));
}

/**
 * Sum power zone seconds across activities (optionally within a date range).
 *
 * @param {object[]} activities
 * @param {string} [startYmd]
 * @param {string} [endYmd]
 * @returns {number[]}
 */
export function sumPowerZoneSeconds(activities, startYmd, endYmd) {
    const totals = Array(POWER_ZONE_COUNT).fill(0);
    for (const act of activities || []) {
        const ymd = String(act?.date || '').slice(0, 10);
        if (startYmd && ymd && ymd < startYmd) continue;
        if (endYmd && ymd && ymd > endYmd) continue;
        const zones = act?.power_zone_sec;
        if (!hasZoneTimesData(zones)) continue;
        for (let i = 0; i < POWER_ZONE_COUNT; i += 1) {
            totals[i] += Math.max(0, Number(zones[i]) || 0);
        }
    }
    return totals;
}

const EN_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** @typedef {'week' | 'month' | 'year'} ZoneChartCadence */

export const ZONE_CHART_CADENCES = [
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'year', label: 'Year' },
];

export const ZONE_CHART_LOOKBACK_PRESETS = [
    { value: '4w', label: '4 wk' },
    { value: '12w', label: '12 wk' },
    { value: '6m', label: '6 mo' },
    { value: '1y', label: '1 yr' },
    { value: '3y', label: '3 yr' },
    { value: 'dashboard', label: 'Dashboard' },
    { value: 'custom', label: 'Custom' },
];

/**
 * @param {string} [referenceEndYmd] - YYYY-MM-DD; defaults to today (local)
 * @returns {string}
 */
function toLocalYmd(referenceEndYmd) {
    if (referenceEndYmd && String(referenceEndYmd).length >= 10) {
        return String(referenceEndYmd).slice(0, 10);
    }
    const d = new Date();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Compute YMD bounds for the zone chart lookback preset.
 *
 * @param {string} preset - one of ZONE_CHART_LOOKBACK_PRESETS values
 * @param {{
 *   referenceEndYmd?: string,
 *   dashboardStartYmd?: string,
 *   dashboardEndYmd?: string,
 *   customStartYmd?: string,
 *   customEndYmd?: string,
 * }} [options]
 * @returns {{ startYmd: string, endYmd: string }}
 */
export function computeZoneChartLookbackYmd(preset, options = {}) {
    const endYmd = options.customEndYmd?.slice(0, 10)
        || options.dashboardEndYmd?.slice(0, 10)
        || toLocalYmd(options.referenceEndYmd);

    if (preset === 'dashboard' && options.dashboardStartYmd) {
        return {
            startYmd: options.dashboardStartYmd.slice(0, 10),
            endYmd,
        };
    }

    if (preset === 'custom') {
        const startYmd = options.customStartYmd?.slice(0, 10)
            || options.dashboardStartYmd?.slice(0, 10)
            || '2000-01-01';
        return { startYmd, endYmd };
    }

    const end = new Date(`${endYmd}T12:00:00`);
    const start = new Date(end);
    start.setHours(0, 0, 0, 0);

    if (preset === '4w') start.setDate(start.getDate() - 27);
    else if (preset === '12w') start.setDate(start.getDate() - 83);
    else if (preset === '6m') start.setMonth(start.getMonth() - 6);
    else if (preset === '1y') start.setFullYear(start.getFullYear() - 1);
    else if (preset === '3y') start.setFullYear(start.getFullYear() - 3);
    else start.setDate(start.getDate() - 83);

    const startYmd = `${start.getFullYear()}-${`${start.getMonth() + 1}`.padStart(2, '0')}-${`${start.getDate()}`.padStart(2, '0')}`;
    return { startYmd, endYmd };
}

/**
 * @param {string} ymd
 * @param {ZoneChartCadence} cadence
 * @returns {string}
 */
function bucketKeyFromYmd(ymd, cadence) {
    if (cadence === 'year') return ymd.slice(0, 4);
    if (cadence === 'month') return ymd.slice(0, 7);
    const d = new Date(`${ymd}T12:00:00`);
    const day = d.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + mondayOffset);
    return monday.toISOString().slice(0, 10);
}

/**
 * @param {string} bucketKey
 * @param {ZoneChartCadence} cadence
 * @returns {string}
 */
function bucketLabelFromKey(bucketKey, cadence) {
    if (cadence === 'year') return bucketKey;
    if (cadence === 'month') {
        const [y, m] = bucketKey.split('-');
        return `${EN_MONTHS_SHORT[parseInt(m, 10) - 1]} ${y.slice(-2)}`;
    }
    const [, m, d] = bucketKey.split('-');
    return `${EN_MONTHS_SHORT[parseInt(m, 10) - 1]} ${d}`;
}

/**
 * @param {number[]} secs
 * @returns {{ z1: number, z2: number, z3: number, z4: number, z5: number, z6: number, z7: number, totalHours: number }}
 */
function hoursRowFromSeconds(secs) {
    const hours = secs.map((s) => Math.round((s / 3600) * 10) / 10);
    const totalHours = Math.round(hours.reduce((sum, h) => sum + h, 0) * 10) / 10;
    return {
        z1: hours[0],
        z2: hours[1],
        z3: hours[2],
        z4: hours[3],
        z5: hours[4],
        z6: hours[5],
        z7: hours[6],
        totalHours,
    };
}

/**
 * Stacked-bar rows for time-in-zones visualization (hours per bucket).
 *
 * @param {object[]} activities
 * @param {string} [startYmd]
 * @param {string} [endYmd]
 * @param {ZoneChartCadence} [cadence]
 * @returns {Array<{ label: string, bucketKey: string, weekKey: string, z1: number, z2: number, z3: number, z4: number, z5: number, z6: number, z7: number, totalHours: number }>}
 */
export function powerZoneChartRows(activities, startYmd, endYmd, cadence = 'week') {
    const bucketMap = new Map();

    for (const act of activities || []) {
        const ymd = String(act?.date || '').slice(0, 10);
        if (!ymd || ymd.length < 10) continue;
        if (startYmd && ymd < startYmd) continue;
        if (endYmd && ymd > endYmd) continue;

        const zones = act?.power_zone_sec;
        if (!hasZoneTimesData(zones)) continue;

        const bucketKey = bucketKeyFromYmd(ymd, cadence);
        if (!bucketMap.has(bucketKey)) {
            bucketMap.set(bucketKey, Array(POWER_ZONE_COUNT).fill(0));
        }
        const bucket = bucketMap.get(bucketKey);
        for (let i = 0; i < POWER_ZONE_COUNT; i += 1) {
            bucket[i] += Math.max(0, Number(zones[i]) || 0);
        }
    }

    return Array.from(bucketMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([bucketKey, secs]) => {
            const hours = hoursRowFromSeconds(secs);
            return {
                label: bucketLabelFromKey(bucketKey, cadence),
                bucketKey,
                weekKey: cadence === 'week' ? bucketKey : bucketKey,
                ...hours,
            };
        });
}

/**
 * @param {ReturnType<typeof powerZoneChartRows>} rows
 * @returns {ReturnType<typeof powerZoneChartRows>}
 */
export function powerZoneChartRowsAsPercent(rows) {
    return (rows || []).map((row) => {
        const total = Number(row.totalHours) || 0;
        if (total <= 0) {
            return {
                ...row,
                z1: 0,
                z2: 0,
                z3: 0,
                z4: 0,
                z5: 0,
                z6: 0,
                z7: 0,
                totalHours: 0,
                totalPercent: 0,
            };
        }
        const pct = (hours) => Math.round((hours / total) * 1000) / 10;
        return {
            ...row,
            z1: pct(row.z1),
            z2: pct(row.z2),
            z3: pct(row.z3),
            z4: pct(row.z4),
            z5: pct(row.z5),
            z6: pct(row.z6),
            z7: pct(row.z7),
            totalPercent: 100,
        };
    });
}

/**
 * Weekly stacked-bar rows for time-in-zones visualization.
 *
 * @param {object[]} activities
 * @param {string} [startYmd]
 * @param {string} [endYmd]
 * @returns {ReturnType<typeof powerZoneChartRows>}
 */
export function weeklyPowerZoneChartRows(activities, startYmd, endYmd) {
    return powerZoneChartRows(activities, startYmd, endYmd, 'week');
}

/**
 * Monthly stacked-bar rows for time-in-zones visualization.
 *
 * @param {object[]} activities
 * @param {string} [startYmd]
 * @param {string} [endYmd]
 * @returns {ReturnType<typeof powerZoneChartRows>}
 */
export function monthlyPowerZoneChartRows(activities, startYmd, endYmd) {
    return powerZoneChartRows(activities, startYmd, endYmd, 'month');
}

/**
 * Yearly stacked-bar rows for time-in-zones visualization.
 *
 * @param {object[]} activities
 * @param {string} [startYmd]
 * @param {string} [endYmd]
 * @returns {ReturnType<typeof powerZoneChartRows>}
 */
export function yearlyPowerZoneChartRows(activities, startYmd, endYmd) {
    return powerZoneChartRows(activities, startYmd, endYmd, 'year');
}
