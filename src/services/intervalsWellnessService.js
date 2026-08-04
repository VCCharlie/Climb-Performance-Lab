/**
 * Fetch daily CTL/ATL wellness from Intervals.icu (direct API with local credentials).
 */

import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { hasLocalIntervalsCredentials } from './intervalsCloudApi';
import { addDaysToYmd } from '../utils/dashboardVolumeTotals';
import { safeLocalStorageSet } from '../utils/safeStorage';
import { devLog } from '../utils/safeLog';

const CACHE_MS = 60 * 60 * 1000;
const WELLNESS_TIMEOUT_MS = 20000;
const DEFAULT_LOOKBACK_DAYS = 365;

/**
 * @param {object} row — raw Intervals.icu wellness record
 * @returns {object | null}
 */
export function normalizeIntervalsWellnessRow(row) {
    const date = row?.id || row?.date;
    if (!date || typeof date !== 'string') return null;

    const ctl = Number(row.ctl);
    const atl = Number(row.atl);
    if (!Number.isFinite(ctl) && !Number.isFinite(atl)) return null;

    const roundedCtl = Number.isFinite(ctl) ? Math.round(ctl * 10) / 10 : null;
    const roundedAtl = Number.isFinite(atl) ? Math.round(atl * 10) / 10 : null;
    const tsb = roundedCtl != null && roundedAtl != null
        ? Math.round((roundedCtl - roundedAtl) * 10) / 10
        : null;

    return {
        date: date.slice(0, 10),
        ctl: roundedCtl,
        atl: roundedAtl,
        tsb,
        rampRate: Number.isFinite(Number(row.rampRate)) ? Math.round(Number(row.rampRate) * 10) / 10 : null,
        restingHR: Number.isFinite(Number(row.restingHR)) ? Number(row.restingHR) : null,
        hrv: Number.isFinite(Number(row.hrv)) ? Number(row.hrv) : null,
        weight: Number.isFinite(Number(row.weight)) ? Math.round(Number(row.weight) * 10) / 10 : null,
    };
}

/**
 * @param {object[]} rawRows
 * @returns {object[]}
 */
export function normalizeIntervalsWellnessRows(rawRows) {
    if (!Array.isArray(rawRows)) return [];
    return rawRows
        .map(normalizeIntervalsWellnessRow)
        .filter(Boolean)
        .sort((a, b) => a.date.localeCompare(b.date));
}

function todayYmd() {
    const now = new Date();
    const yy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
}

function cacheKey(athleteId, oldest, newest) {
    return `intervals_wellness_${athleteId}_${oldest}_${newest}`;
}

/**
 * @param {object} intervalsConfig
 * @param {{ oldest?: string, newest?: string, lookbackDays?: number }} [opts]
 * @returns {Promise<{ rows: object[], source: string | null, error?: string }>}
 */
export async function fetchIntervalsWellness(intervalsConfig, opts = {}) {
    if (!hasLocalIntervalsCredentials(intervalsConfig)) {
        return { rows: [], source: null, error: 'no_credentials' };
    }

    const newest = opts.newest || todayYmd();
    const lookbackDays = Number(opts.lookbackDays) || DEFAULT_LOOKBACK_DAYS;
    const oldest = opts.oldest || addDaysToYmd(newest, -lookbackDays);
    const athleteId = intervalsConfig.athleteId;

    const key = cacheKey(athleteId, oldest, newest);
    try {
        const cached = localStorage.getItem(key);
        if (cached) {
            const { timestamp, data } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_MS && Array.isArray(data)) {
                devLog(`[IntervalsWellness] Cache hit for ${oldest} → ${newest}`);
                return { rows: data, source: 'intervals.icu' };
            }
        }
    } catch {
        /* ignore corrupt cache */
    }

    const url = `https://intervals.icu/api/v1/athlete/${athleteId}/wellness?oldest=${oldest}&newest=${newest}`;
    const authString = btoa(`API_KEY:${intervalsConfig.apiKey}`);

    const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
            Authorization: `Basic ${authString}`,
            Accept: 'application/json',
        },
    }, WELLNESS_TIMEOUT_MS);

    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const message = errorData?.error || `HTTP ${response.status}`;
        throw new Error(message);
    }

    const raw = await response.json();
    const rows = normalizeIntervalsWellnessRows(raw);

    try {
        safeLocalStorageSet(key, JSON.stringify({ timestamp: Date.now(), data: rows }));
    } catch {
        /* cache write is best-effort */
    }

    devLog(`[IntervalsWellness] Fetched ${rows.length} days (${oldest} → ${newest})`);
    return { rows, source: 'intervals.icu' };
}
