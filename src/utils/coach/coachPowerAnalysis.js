/**
 * Multi-year top-N power analysis (deterministic — used by coach Q&A and playground).
 */

import { buildTopPowerEffortsByYear, parsePowerFieldFromQuestion } from './coachPowerHistory';

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

    const yearly = years.map((year) => {
        const raw = top.byYear[year] || [];
        const efforts = flagAnomalousEfforts(raw);
        const watts = efforts.map((r) => r.watts);
        const avg = watts.length
            ? Math.round((watts.reduce((sum, w) => sum + w, 0) / watts.length) * 10) / 10
            : null;
        const anomalies = efforts.filter((r) => r.anomaly);
        return { year, efforts, avg, count: efforts.length, anomalies };
    });

    const trend = yearly
        .filter((row) => row.avg != null && row.count > 0)
        .map((row) => ({ year: row.year, avg: row.avg, count: row.count }));

    return {
        field,
        limit,
        yearSpan,
        startYear,
        endYear,
        yearly,
        trend,
        label: field === 'best_20min' ? '20-minute' : '60-minute',
    };
}

/**
 * @param {ReturnType<typeof buildMultiYearPowerAnalysis>} analysis
 */
export function formatMultiYearPowerAnalysisReport(analysis) {
    const rowsWithData = analysis.yearly.filter((r) => r.count > 0);
    if (!rowsWithData.length) {
        return `No ${analysis.label} power efforts found for ${analysis.startYear}–${analysis.endYear}. `
            + 'Import rides with best 60-min / 20-min power fields from Intervals.icu or Garmin CSV.';
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
            'Trend (average of top 10 per year):',
            `• Strongest year: ${peak.year} (${peak.avg}W average)`,
            `• ${first.year} → ${last.year}: ${delta >= 0 ? '+' : ''}${delta}W change in yearly average`,
            `• Use the Power Analysis panel below for an interactive chart.`,
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
