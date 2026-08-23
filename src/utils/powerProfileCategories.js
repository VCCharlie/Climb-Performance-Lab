/**
 * Heuristic Sprint / Attack / Breakaway / Endurance scores from duration peaks.
 * Baseline = best in app history; period = selected window peaks.
 */

export const POWER_PROFILE_CATEGORIES = [
    { id: 'sprint', label: 'Sprint', peakKey: 'best_1min', fallbackSec: 5 },
    { id: 'attack', label: 'Attack', peakKey: 'best_5min', fallbackSec: 300 },
    { id: 'breakaway', label: 'Breakaway', peakKey: 'best_20min', fallbackSec: 1200 },
    { id: 'endurance', label: 'Endurance', peakKey: 'best_60min', fallbackSec: 3600 },
];

function rowWatts(rows, key) {
    const row = (rows || []).find((r) => r.key === key);
    const w = Number(row?.watts) || 0;
    return w > 0 ? w : 0;
}

function roundPct(n) {
    if (n == null || Number.isNaN(n)) return null;
    return Math.round(n * 10) / 10;
}

/**
 * @param {Array<{ key: string, label: string, watts: number }>} powerPeakRows — current period
 * @param {Array<{ key: string, label: string, watts: number }> | null} historyPeakRows — all-time peaks
 * @returns {Array<{
 *   id: string,
 *   label: string,
 *   peakKey: string,
 *   periodWatts: number,
 *   baselineWatts: number,
 *   pctOfBaseline: number | null,
 * }>}
 */
export function computePowerProfileCategoryBars(powerPeakRows, historyPeakRows) {
    return POWER_PROFILE_CATEGORIES.map((cat) => {
        const periodWatts = rowWatts(powerPeakRows, cat.peakKey);
        const historyWatts = rowWatts(historyPeakRows, cat.peakKey);
        const baselineWatts = historyWatts > 0 ? historyWatts : periodWatts;
        const pctOfBaseline = baselineWatts > 0 && periodWatts > 0
            ? roundPct((periodWatts / baselineWatts) * 100)
            : null;

        return {
            id: cat.id,
            label: cat.label,
            peakKey: cat.peakKey,
            periodWatts,
            baselineWatts,
            pctOfBaseline,
        };
    });
}
