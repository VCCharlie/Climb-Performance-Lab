/**
 * Per-calendar-year FTP estimates for historical power caps (e.g. Long-term power trends).
 * Auto-computed from top efforts; manual overrides live in userSettings.historicalFtp.
 */

import { normalizeDate } from './formatters';

export const HISTORICAL_FTP_SOURCE_20 = '20min';
export const HISTORICAL_FTP_SOURCE_60 = '60min';

export const DEFAULT_HISTORICAL_FTP_CONFIG = {
    enabled: true,
    source: HISTORICAL_FTP_SOURCE_20,
    topN: 10,
    trimHigh: 1,
    minEfforts: 3,
};

/**
 * @param {object} [config]
 */
export function normalizeHistoricalFtpConfig(config = {}) {
    const source = config.source === HISTORICAL_FTP_SOURCE_60
        ? HISTORICAL_FTP_SOURCE_60
        : HISTORICAL_FTP_SOURCE_20;
    const topN = Math.max(1, Math.min(20, Number(config.topN) || DEFAULT_HISTORICAL_FTP_CONFIG.topN));
    const trimHigh = Math.max(
        0,
        Math.min(3, Number(config.trimHigh) ?? DEFAULT_HISTORICAL_FTP_CONFIG.trimHigh),
    );
    const minEfforts = Math.max(
        1,
        Math.min(topN, Number(config.minEfforts) || DEFAULT_HISTORICAL_FTP_CONFIG.minEfforts),
    );
    return {
        enabled: config.enabled !== false,
        source,
        topN,
        trimHigh,
        minEfforts,
    };
}

function calendarYearFromActivity(activity) {
    const ymd = normalizeDate(activity?.date);
    if (!ymd || ymd.length < 4) return null;
    const y = parseInt(ymd.slice(0, 4), 10);
    return Number.isFinite(y) ? y : null;
}

/**
 * Trimmed mean of the highest efforts in a year.
 * Takes the top `topN` values, drops the highest `trimHigh` outliers, then averages the rest.
 *
 * @param {number[]} values
 * @param {number} topN
 * @param {number} trimHigh
 * @param {number} minEfforts
 * @returns {number | null}
 */
export function trimmedMeanTopEfforts(values, topN, trimHigh, minEfforts) {
    const sorted = values.filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => b - a);
    const top = sorted.slice(0, topN);
    if (top.length < minEfforts) return null;

    let pool = top;
    if (trimHigh > 0 && top.length > trimHigh + minEfforts - 1) {
        pool = top.slice(trimHigh);
    }
    if (pool.length < minEfforts) return null;

    return pool.reduce((sum, v) => sum + v, 0) / pool.length;
}

/**
 * Auto-estimate FTP per calendar year from stored best power peaks.
 *
 * @param {object[]} activities
 * @param {object} [config]
 * @returns {Record<number, { year: number, autoFtp: number, rawAvg: number, effortCount: number, effortsUsed: number, trimmedCount: number, source: string }>}
 */
export function computeHistoricalFtpByYear(activities, config = {}) {
    const cfg = normalizeHistoricalFtpConfig(config);
    const field = cfg.source === HISTORICAL_FTP_SOURCE_60 ? 'best_60min' : 'best_20min';
    const byYear = new Map();

    for (const a of activities || []) {
        const year = calendarYearFromActivity(a);
        if (!year) continue;
        const watts = Number(a[field]) || 0;
        if (watts <= 0) continue;
        if (!byYear.has(year)) byYear.set(year, []);
        byYear.get(year).push(watts);
    }

    /** @type {Record<number, object>} */
    const result = {};

    for (const [year, wattsList] of byYear.entries()) {
        const rawAvg = trimmedMeanTopEfforts(wattsList, cfg.topN, cfg.trimHigh, cfg.minEfforts);
        if (rawAvg == null) continue;

        const autoFtp = cfg.source === HISTORICAL_FTP_SOURCE_20
            ? Math.round(rawAvg * 0.95)
            : Math.round(rawAvg);

        const top = [...wattsList].sort((a, b) => b - a).slice(0, cfg.topN);
        const trimmedCount = cfg.trimHigh > 0 && top.length > cfg.trimHigh + cfg.minEfforts - 1
            ? cfg.trimHigh
            : 0;

        result[year] = {
            year,
            autoFtp,
            rawAvg: Math.round(rawAvg * 10) / 10,
            effortCount: wattsList.length,
            effortsUsed: top.length - trimmedCount,
            trimmedCount,
            source: cfg.source,
        };
    }

    return result;
}

/**
 * Year → effective FTP (override wins over auto).
 * @param {object} userSettings
 * @param {object[]} activities
 * @returns {Record<number, number>}
 */
export function resolveHistoricalFtpMap(userSettings, activities) {
    const hist = userSettings?.historicalFtp || {};
    const config = normalizeHistoricalFtpConfig(hist.config);
    if (!config.enabled) return {};

    const computed = computeHistoricalFtpByYear(activities, config);
    const overrides = hist.overrides || {};
    /** @type {Record<number, number>} */
    const map = {};

    for (const [yearStr, data] of Object.entries(computed)) {
        const year = Number(yearStr);
        const overrideRaw = overrides[yearStr] ?? overrides[year];
        if (overrideRaw != null && overrideRaw !== '' && Number(overrideRaw) > 0) {
            map[year] = Math.round(Number(overrideRaw));
        } else if (data.autoFtp > 0) {
            map[year] = data.autoFtp;
        }
    }

    for (const [yearStr, val] of Object.entries(overrides)) {
        const year = Number(yearStr);
        if (map[year] > 0) continue;
        const n = Number(val);
        if (n > 0) map[year] = Math.round(n);
    }

    return map;
}

/**
 * @param {number} year
 * @param {Record<number, number> | null} historicalFtpMap
 * @param {number} [fallbackFtp]
 */
export function resolveFtpForYear(year, historicalFtpMap, fallbackFtp = 0) {
    const y = Number(year);
    if (historicalFtpMap?.[y] > 0) return historicalFtpMap[y];
    return Number(fallbackFtp) || 0;
}

/**
 * Rows for the Settings table (newest year first).
 * @param {object[]} activities
 * @param {object} userSettings
 */
export function buildHistoricalFtpYearRows(activities, userSettings) {
    const hist = userSettings?.historicalFtp || {};
    const config = normalizeHistoricalFtpConfig(hist.config);
    const computed = computeHistoricalFtpByYear(activities, config);
    const overrides = hist.overrides || {};

    const allYears = new Set([
        ...Object.keys(computed).map(Number),
        ...Object.keys(overrides).map(Number),
    ]);

    return [...allYears]
        .filter((y) => Number.isFinite(y))
        .sort((a, b) => b - a)
        .map((year) => {
            const auto = computed[year] || null;
            const overrideRaw = overrides[year] ?? overrides[String(year)];
            const hasOverride = overrideRaw != null && overrideRaw !== '' && Number(overrideRaw) > 0;
            const effectiveFtp = hasOverride
                ? Math.round(Number(overrideRaw))
                : auto?.autoFtp ?? null;

            return {
                year,
                autoFtp: auto?.autoFtp ?? null,
                rawAvg: auto?.rawAvg ?? null,
                effortCount: auto?.effortCount ?? 0,
                effortsUsed: auto?.effortsUsed ?? 0,
                trimmedCount: auto?.trimmedCount ?? 0,
                overrideFtp: hasOverride ? Math.round(Number(overrideRaw)) : null,
                effectiveFtp,
            };
        });
}

export function getDefaultHistoricalFtpSettings() {
    return {
        config: { ...DEFAULT_HISTORICAL_FTP_CONFIG },
        overrides: {},
    };
}
