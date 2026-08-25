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

/** Readable rider archetype labels (Formbeat Phase C). */
export const RIDER_ARCHETYPE_LABELS = {
    sprinter: 'Sprinter',
    puncheur: 'Puncheur',
    climber: 'Climber',
    time_trialist: 'Time trialist',
    diesel: 'Diesel',
    all_rounder: 'All-rounder',
    building: 'Building profile',
};

const ARCHETYPE_TAGLINES = {
    sprinter: 'Explosive top-end power',
    puncheur: 'Sharp 3–8 min efforts',
    climber: 'Sustained climbing power',
    time_trialist: 'Strong 20–60 min output',
    diesel: 'Deep aerobic engine',
    all_rounder: 'Balanced across durations',
    building: 'Add more peak power data',
};

/**
 * Heuristic rider archetype from duration peaks (1 / 5 / 20 / 60 min).
 * Uses relative strength and cross-duration ratios — not CP/W'.
 *
 * @param {Array<{ key: string, watts: number }> | null | undefined} powerPeakRows
 * @returns {{
 *   id: string,
 *   label: string,
 *   tagline: string,
 *   scores: Record<string, number>,
 * }}
 */
export function inferRiderArchetype(powerPeakRows) {
    const w1 = rowWatts(powerPeakRows, 'best_1min');
    const w5 = rowWatts(powerPeakRows, 'best_5min');
    const w20 = rowWatts(powerPeakRows, 'best_20min');
    const w60 = rowWatts(powerPeakRows, 'best_60min');

    const present = [w1, w5, w20, w60].filter((w) => w > 0);
    if (present.length < 2) {
        return {
            id: 'building',
            label: RIDER_ARCHETYPE_LABELS.building,
            tagline: ARCHETYPE_TAGLINES.building,
            scores: {},
        };
    }

    const maxW = Math.max(w1, w5, w20, w60);
    const rel = {
        sprint: w1 / maxW,
        attack: w5 / maxW,
        breakaway: w20 / maxW,
        endurance: w60 / maxW,
    };

    const r15 = w1 > 0 && w5 > 0 ? w1 / w5 : null;
    const r520 = w5 > 0 && w20 > 0 ? w5 / w20 : null;
    const r2060 = w20 > 0 && w60 > 0 ? w20 / w60 : null;

    if (r15 != null && r15 >= 1.18) {
        return {
            id: 'sprinter',
            label: RIDER_ARCHETYPE_LABELS.sprinter,
            tagline: ARCHETYPE_TAGLINES.sprinter,
            scores: { r15, r520, r2060 },
        };
    }

    if (r520 != null && r520 >= 1.1 && (r15 == null || r15 < 1.18)) {
        return {
            id: 'puncheur',
            label: RIDER_ARCHETYPE_LABELS.puncheur,
            tagline: ARCHETYPE_TAGLINES.puncheur,
            scores: { r15, r520, r2060 },
        };
    }

    if (
        r2060 != null
        && r2060 >= 0.98
        && r2060 <= 1.04
        && rel.endurance >= 0.9
        && (r520 == null || r520 <= 1.08)
        && (r15 == null || r15 <= 1.14)
    ) {
        return {
            id: 'diesel',
            label: RIDER_ARCHETYPE_LABELS.diesel,
            tagline: ARCHETYPE_TAGLINES.diesel,
            scores: { r15, r520, r2060 },
        };
    }

    if (
        r2060 != null
        && r2060 >= 0.95
        && r2060 <= 1.04
        && (r520 == null || r520 <= 1.06)
        && (r15 == null || r15 <= 1.12)
    ) {
        return {
            id: 'time_trialist',
            label: RIDER_ARCHETYPE_LABELS.time_trialist,
            tagline: ARCHETYPE_TAGLINES.time_trialist,
            scores: { r15, r520, r2060 },
        };
    }

    if (
        rel.breakaway >= 0.84
        && rel.endurance >= 0.78
        && (r15 == null || r15 <= 1.08)
        && (r520 == null || r520 <= 1.08)
    ) {
        return {
            id: 'climber',
            label: RIDER_ARCHETYPE_LABELS.climber,
            tagline: ARCHETYPE_TAGLINES.climber,
            scores: { r15, r520, r2060 },
        };
    }

    return {
        id: 'all_rounder',
        label: RIDER_ARCHETYPE_LABELS.all_rounder,
        tagline: ARCHETYPE_TAGLINES.all_rounder,
        scores: { r15, r520, r2060 },
    };
}
