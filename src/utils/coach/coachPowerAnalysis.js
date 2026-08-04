/**
 * Multi-year top-N power analysis (deterministic — used by coach Q&A and playground).
 */

import { buildTopPowerEffortsByYear, parsePowerFieldFromQuestion } from './coachPowerHistory';
import { POWER_PEAK_FIELDS, effortExclusionKey } from './coachPlaygroundMetrics';

const DEFAULT_TOP_N = 10;
const DEFAULT_YEARS = 10;
const DEFAULT_TREND_WINDOW = 3;
const ANOMALY_Z = 2.5;

function toNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function mean(values) {
    if (!values.length) return null;
    return values.reduce((s, v) => s + v, 0) / values.length;
}

function stdDev(values, avg) {
    if (values.length < 2) return 0;
    const m = avg ?? mean(values);
    const variance = values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length;
    return Math.sqrt(variance);
}

function round1(n) {
    return n == null ? null : Math.round(n * 10) / 10;
}

function round0(n) {
    return n == null ? null : Math.round(n);
}

function getYear(iso) {
    if (!iso || typeof iso !== 'string') return null;
    const y = parseInt(iso.slice(0, 4), 10);
    return Number.isFinite(y) ? y : null;
}

function getEffortValue(activity, field) {
    const v = toNum(activity?.[field]);
    if (v != null && v > 0) return v;
    if (field === 'best_60min') return toNum(activity?.best_60min);
    if (field === 'best_20min') return toNum(activity?.best_20min);
    return null;
}

function trailingMovingAverage(values, windowSize) {
    const w = Math.max(1, windowSize);
    return values.map((_, i) => {
        const slice = values.slice(Math.max(0, i - w + 1), i + 1).filter((v) => v != null);
        if (!slice.length) return null;
        return round1(mean(slice));
    });
}

function detectAnomalyKeys(efforts, zThreshold = ANOMALY_Z) {
    const values = efforts.map((e) => e.watts);
    const avg = mean(values);
    const sd = stdDev(values, avg);
    if (!sd || sd < 1) return new Set();
    const flagged = new Set();
    efforts.forEach((e) => {
        if (Math.abs(e.watts - avg) / sd > zThreshold) flagged.add(e.key);
    });
    return flagged;
}

/**
 * @param {{ watts: number }[]} efforts
 */
export function flagAnomalousEfforts(efforts) {
    if (!efforts?.length) return [];
    if (efforts.length < 4) {
        return efforts.map((row) => ({ ...row, anomaly: false, reason: null }));
    }

    const sorted = [...efforts.map((r) => r.watts)].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1 || 1;
    const upperFence = q3 + 1.5 * iqr;
    const lowerFence = q1 - 1.5 * iqr;

    return efforts.map((row) => {
        const high = row.watts > upperFence;
        const low = row.watts < lowerFence;
        return {
            ...row,
            anomaly: high || low,
            reason: high
                ? 'High vs rest of top 10 — check power meter / trainer calibration'
                : low
                    ? 'Low outlier within top 10'
                    : null,
        };
    });
}

/**
 * @param {object[]} activities
 * @param {number} manualFtp
 * @param {object} [options]
 */
export function buildMultiYearPowerAnalysis(activities, manualFtp = 0, options = {}) {
    const field = options.field || 'best_60min';
    const limit = options.limit ?? 10;
    const yearSpan = options.yearSpan ?? 10;
    const endYear = options.endYear ?? new Date().getFullYear();
    const startYear = endYear - yearSpan + 1;

    const top = buildTopPowerEffortsByYear(activities, manualFtp, field, limit, yearSpan + 5);
    const years = [];
    for (let y = startYear; y <= endYear; y += 1) years.push(y);

    const yearlyAvgs = [];
    const yearly = years.map((year) => {
        const raw = top.byYear[year] || [];
        const efforts = flagAnomalousEfforts(raw);
        const watts = efforts.map((r) => r.watts);
        const avg = watts.length
            ? Math.round((watts.reduce((sum, w) => sum + w, 0) / watts.length) * 10) / 10
            : null;
        const maxW = watts.length ? Math.max(...watts) : null;
        const anomalies = efforts.filter((r) => r.anomaly);
        yearlyAvgs.push(avg);
        return { year, efforts, avg, max: maxW, count: efforts.length, anomalies };
    });

    const avgTrend = trailingMovingAverage(yearlyAvgs, options.trendWindow ?? DEFAULT_TREND_WINDOW);
    yearly.forEach((row, i) => {
        row.trend = avgTrend[i];
    });

    const trend = yearly
        .filter((row) => row.avg != null && row.count > 0)
        .map((row) => ({
            year: row.year,
            avg: row.avg,
            trend: row.trend,
            max: row.max,
            count: row.count,
        }));

    const fieldMeta = POWER_PEAK_FIELDS.find((p) => p.id === field);
    return {
        field,
        limit,
        yearSpan,
        startYear,
        endYear,
        yearly,
        trend,
        label: fieldMeta?.label || (field === 'best_20min' ? '20-minute' : '60-minute'),
    };
}

/**
 * Playground variant with exclusions, all duration fields, and separate trend series.
 * @param {object[]} activities
 * @param {object} options
 */
export function buildPowerYearlyAnalysis(activities, options = {}) {
    const {
        field = 'best_60min',
        topN = DEFAULT_TOP_N,
        years = DEFAULT_YEARS,
        trendWindow = DEFAULT_TREND_WINDOW,
        excludedKeys = new Set(),
        autoDetectAnomalies = true,
        zThreshold = ANOMALY_Z,
    } = options;

    const currentYear = new Date().getFullYear();
    const minYear = currentYear - Math.max(1, years) + 1;

    const efforts = [];
    (activities || []).forEach((a) => {
        const watts = getEffortValue(a, field);
        const year = getYear(a.date);
        if (watts == null || year == null || year < minYear) return;
        const key = effortExclusionKey(a, field);
        efforts.push({
            key,
            year,
            watts,
            date: a.date,
            title: a.title || 'Ride',
            type: a.type || 'Ride',
            excluded: excludedKeys.has(key),
        });
    });

    const autoAnomalyKeys = autoDetectAnomalies
        ? detectAnomalyKeys(efforts.filter((e) => !e.excluded), zThreshold)
        : new Set();

    const activeEfforts = efforts.filter((e) => !e.excluded && !autoAnomalyKeys.has(e.key));

    const byYear = new Map();
    activeEfforts.forEach((e) => {
        if (!byYear.has(e.year)) byYear.set(e.year, []);
        byYear.get(e.year).push(e);
    });

    const yearlyAvgs = [];
    const yearlyMaxes = [];
    const yearly = [];

    for (let y = minYear; y <= currentYear; y++) {
        const yearEfforts = (byYear.get(y) || []).sort((a, b) => b.watts - a.watts);
        const top = yearEfforts.slice(0, topN);
        const wattsList = top.map((e) => e.watts);
        const avg = wattsList.length ? round1(mean(wattsList)) : null;
        const maxW = wattsList.length ? round0(Math.max(...wattsList)) : null;
        yearlyAvgs.push(avg);
        yearlyMaxes.push(maxW);
        yearly.push({
            year: y,
            avg,
            max: maxW,
            count: yearEfforts.length,
            topEfforts: top,
        });
    }

    const avgTrend = trailingMovingAverage(yearlyAvgs, trendWindow);
    const maxTrend = trailingMovingAverage(yearlyMaxes, trendWindow);

    yearly.forEach((row, i) => {
        row.trend = avgTrend[i];
        row.maxTrend = maxTrend[i];
    });

    return {
        yearly,
        efforts: efforts.sort((a, b) => b.watts - a.watts || String(b.date).localeCompare(String(a.date))),
        anomalyKeys: autoAnomalyKeys,
        field,
        formatEffortDate: formatEffortDateIso,
    };
}

function formatEffortDateIso(iso) {
    if (!iso || typeof iso !== 'string') return '—';
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
}

/**
 * @param {ReturnType<typeof buildMultiYearPowerAnalysis>} analysis
 */
export function formatMultiYearPowerAnalysisReport(analysis) {
    const rowsWithData = analysis.yearly.filter((r) => r.count > 0);
    if (!rowsWithData.length) {
        return `No ${analysis.label} power efforts found for ${analysis.startYear}–${analysis.endYear}. `
            + 'Import rides with best power peak fields from Intervals.icu or Garmin CSV.';
    }

    const lines = [
        `Here is your top ${analysis.limit} ${analysis.label} power per calendar year (${analysis.startYear}–${analysis.endYear}), `
        + 'with yearly averages and anomaly checks.',
        '',
        'Year | Top values (W) | Avg (W) | Anomalies',
        '--- | --- | --- | ---',
    ];

    for (const row of rowsWithData) {
        const values = row.efforts.map((e) => e.watts).join(', ');
        const anomalyText = row.anomalies.length
            ? row.anomalies.map((a) => `${a.watts}W on ${a.date}`).join('; ')
            : 'None';
        lines.push(`${row.year} | ${values} | ${row.avg} | ${anomalyText}`);
    }

    if (analysis.trend.length >= 2) {
        const first = analysis.trend[0];
        const last = analysis.trend[analysis.trend.length - 1];
        const delta = Math.round((last.avg - first.avg) * 10) / 10;
        const peak = analysis.trend.reduce((best, row) => (row.avg > best.avg ? row : best), analysis.trend[0]);
        lines.push(
            '',
            'Trend (trailing average of yearly top-N means):',
            `• Strongest year: ${peak.year} (${peak.avg}W average)`,
            `• ${first.year} → ${last.year}: ${delta >= 0 ? '+' : ''}${delta}W change in yearly average`,
            `• Use the Data Playground below for an interactive chart.`,
        );
    }

    return lines.join('\n');
}

/**
 * @param {string} question
 */
export function matchesMultiYearPowerAnalysisQuestion(question) {
    const q = String(question || '').toLowerCase();
    const hasDuration = /\b60[\s-]?min|\b20[\s-]?min|ftp|power/.test(q);
    const hasTop = (/\b(top|best|highest)\b/.test(q) && /\b(5|10|five|ten|\d+)\b/.test(q))
        || /\b10\s+values?\b/.test(q)
        || /\beach\s+year\b/.test(q)
        || /\bper\s+year\b/.test(q)
        || /\bfor every year\b/.test(q);
    const hasMultiYear = /\b(past|last)\s+\d+\s+years?\b/.test(q)
        || /\b\d+\s+years?\b/.test(q)
        || /\b10[\s-]?year\b/.test(q)
        || /\btrend\b/.test(q)
        || /\byearly\s+average/.test(q);
    return hasDuration && hasTop && hasMultiYear;
}

/**
 * @param {string} question
 */
export function parseYearSpanFromQuestion(question) {
    const q = String(question || '').toLowerCase();
    const past = q.match(/\b(?:past|last)\s+(\d+)\s+years?\b/);
    if (past) return Number(past[1]);
    if (/\b10[\s-]?year|\bten\s+years?\b/.test(q)) return 10;
    if (/\b5[\s-]?year|\bfive\s+years?\b/.test(q)) return 5;
    return 10;
}

/**
 * @param {string} question
 * @param {object[]} activities
 * @param {object} userSettings
 */
export function answerMultiYearPowerAnalysis(question, activities, userSettings) {
    const ftp = Number(userSettings?.ftp) || 0;
    const field = parsePowerFieldFromQuestion(question);
    const yearSpan = parseYearSpanFromQuestion(question);
    const analysis = buildMultiYearPowerAnalysis(activities, ftp, {
        field,
        limit: 10,
        yearSpan,
    });
    return {
        title: '',
        answer: formatMultiYearPowerAnalysisReport(analysis),
        analysis,
    };
}

export { POWER_PEAK_FIELDS, DEFAULT_TOP_N, DEFAULT_YEARS, DEFAULT_TREND_WINDOW, ANOMALY_Z };
