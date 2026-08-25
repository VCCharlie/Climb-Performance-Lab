/**
 * Rider phenotype guide from period peak powers (Coggan zone shape + ratios).
 * Inspired by power-profile frameworks — a training guide, not a diagnosis.
 *
 * Band summary (see PHENOTYPE_BANDS for UI tooltips):
 * - Sprinter: steep left drop (1 min >> 20 min), not a flat moderate curve
 * - Climber: 5–20 min relative strength peaks vs 1 min & 60 min (w/kg when weight known)
 * - Time trialist: 60 min within ~5–8% of 20 min AND short power does not dominate
 * - Rouleur: flat curve — similar Coggan category at every duration
 */

import { COGGAN_ZONES } from '../cogganZones.js';
import { getCogganZoneForIntensityFactor } from './cogganZoneForIntensity.js';

export const RIDER_PHENOTYPE_IDS = [
    'sprinter',
    'rouleur',
    'climber',
    'time_trialist',
    'building',
];

export const RIDER_PHENOTYPE_LABELS = {
    sprinter: 'Sprinter',
    rouleur: 'Rouleur',
    climber: 'Climber',
    time_trialist: 'Time trialist',
    building: 'Building profile',
};

/** @deprecated Use RIDER_PHENOTYPE_LABELS — kept for backward compatibility. */
export const RIDER_ARCHETYPE_LABELS = {
    ...RIDER_PHENOTYPE_LABELS,
    puncheur: 'Puncheur',
    diesel: 'Diesel',
    all_rounder: 'All-rounder',
};

/** English band thresholds — shown in PowerCategoryBars “How is this calculated?” */
export const PHENOTYPE_BANDS = [
    {
        id: 'sprinter',
        label: 'Sprinter',
        summary: 'Neuromuscular punch — 1 min and 5 min sit well above 20 min power.',
        thresholds: [
            '1 min / 20 min ≥ 1.58, or 5 min / 20 min ≥ 1.24 with 1 min / 5 min ≥ 1.18',
            'Short Coggan zones ≥ 2 above your 20 min zone',
            'Short durations must lead on % of all-time peak — flat 84–93% bands are rouleur, not sprinter',
            'Down-ranked when the curve is flat or TT-like',
        ],
    },
    {
        id: 'climber',
        label: 'Climber',
        summary: 'Strongest relative output at 5–20 min — climbing-friendly mid-duration power.',
        thresholds: [
            '20 min / 60 min ≥ 1.06, or 10 min / 60 min ≥ 1.10, or 5 min / 60 min ≥ 1.12',
            'Mid durations (5–20 min) average ≥ 0.4 Coggan zones above 1 min & 60 min edges',
            'w/kg bonus from 5–20 min peaks when weight is set (≥ 3.6 w/kg amateur, ≥ 4.2 strong)',
            'Down-ranked when 1 min / 20 min ≥ 1.45 (sprinter spike)',
        ],
    },
    {
        id: 'time_trialist',
        label: 'Time trialist',
        summary: 'Sustained engine — 60 min stays close to 20 min without short-power dominance.',
        thresholds: [
            '|60 min − 20 min| / 20 min ≤ 8%',
            '1 min / 20 min ≤ 1.15 and 5 min / 20 min ≤ 1.10 (short efforts not dominating)',
            '60 min / 20 min ≥ 0.92',
            'Not awarded on fully flat rouleur curves or when 20 min / 60 min ≥ 1.12 (climber tail)',
        ],
    },
    {
        id: 'rouleur',
        label: 'Rouleur',
        summary: 'Flat power curve — similar category across all durations.',
        thresholds: [
            'Coggan zone spread ≤ 1.25 with low variance (std ≤ 0.55)',
            'Step ratios (1→5→10→20→60 min) within ~12% of each other',
            '1 min and 60 min within 8% when all durations present',
        ],
    },
];

const PHENOTYPE_TAGLINES = {
    sprinter: 'Neuromuscular punch — short efforts sit well above your 20 min level',
    rouleur: 'Flat power curve — similar Coggan category across durations',
    climber: 'Strong 5–20 min output — climbing-friendly relative power',
    time_trialist: 'Sustained engine — 60 min stays close to 20 min power',
    building: 'Add more peak power data for this period',
};

export const PHENOTYPE_DURATION_KEYS = [
    'best_1min',
    'best_5min',
    'best_10min',
    'best_20min',
    'best_60min',
];

function rowWatts(rows, key) {
    const row = (rows || []).find((r) => r.key === key);
    const w = Number(row?.watts) || 0;
    return w > 0 ? w : 0;
}

function cogganZoneIndex(watts, ftp) {
    if (!ftp || ftp <= 0 || !watts || watts <= 0) return null;
    const zone = getCogganZoneForIntensityFactor(watts / ftp);
    if (!zone) return null;
    const idx = COGGAN_ZONES.findIndex((z) => z.name === zone.name);
    return idx >= 0 ? idx + 1 : null;
}

function estimateFtp(powerPeakRows, manualFtp) {
    if (manualFtp > 0) return manualFtp;
    const w20 = rowWatts(powerPeakRows, 'best_20min');
    const w60 = rowWatts(powerPeakRows, 'best_60min');
    if (w20 > 0) return Math.round(w20 * 0.95);
    if (w60 > 0) return Math.round(w60 * 0.95);
    const w10 = rowWatts(powerPeakRows, 'best_10min');
    if (w10 > 0) return Math.round(w10 * 0.9);
    return 0;
}

function stdDev(values) {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
}

function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
}

function ratio(a, b) {
    if (!a || !b || b <= 0) return 0;
    return a / b;
}

function pctOfBaseline(periodW, baselineW) {
    if (!periodW || !baselineW || baselineW <= 0) return null;
    return (periodW / baselineW) * 100;
}

/**
 * Relative (% of all-time) shape — flat bands mean rouleur, not sprinter.
 * @returns {{
 *   pcts: Record<string, number | null>,
 *   spread: number,
 *   isFlatBand: boolean,
 *   shortLeadsPct: boolean,
 *   midLeadsPct: boolean,
 *   enduranceLeadsPct: boolean,
 * }}
 */
function analyzePctShape(powerPeakRows, historyPeakRows) {
    const pcts = {};
    const values = [];
    for (const key of PHENOTYPE_DURATION_KEYS) {
        const periodW = rowWatts(powerPeakRows, key);
        const historyW = rowWatts(historyPeakRows, key);
        const baseline = historyW > 0 ? historyW : periodW;
        const pct = pctOfBaseline(periodW, baseline);
        pcts[key] = pct;
        if (pct != null && pct > 0) values.push(pct);
    }

    if (values.length < 2) {
        return {
            pcts,
            spread: 0,
            isFlatBand: false,
            shortLeadsPct: false,
            midLeadsPct: false,
            enduranceLeadsPct: false,
        };
    }

    const spread = Math.max(...values) - Math.min(...values);
    const maxPct = Math.max(...values);
    const minPct = Math.min(...values);

    const shortPct = Math.max(pcts.best_1min ?? 0, pcts.best_5min ?? 0);
    const midPct = [pcts.best_5min, pcts.best_10min, pcts.best_20min]
        .filter((p) => p != null)
        .reduce((acc, p) => acc + p, 0) / Math.max(1, [pcts.best_5min, pcts.best_10min, pcts.best_20min].filter((p) => p != null).length);
    const endurancePct = pcts.best_60min ?? 0;

    return {
        pcts,
        spread,
        isFlatBand: spread <= 10 && minPct >= 75,
        shortLeadsPct: shortPct >= maxPct - 1.5 && shortPct > endurancePct + 4,
        midLeadsPct: midPct >= maxPct - 2 && midPct > shortPct + 2,
        enduranceLeadsPct: endurancePct >= maxPct - 1.5 && endurancePct > shortPct + 2,
    };
}

/**
 * @param {Array<{ key: string, watts: number }> | null | undefined} powerPeakRows
 * @param {{ ftp?: number, weightKg?: number, historyPeakRows?: Array<{ key: string, watts: number }> }} [options]
 * @returns {{
 *   id: string,
 *   label: string,
 *   tagline: string,
 *   confidence: number,
 *   scores: Record<string, number>,
 *   zoneIndices: Record<string, number | null>,
 * }}
 */
export function inferRiderPhenotype(powerPeakRows, options = {}) {
    const ftp = estimateFtp(powerPeakRows, Number(options.ftp) || 0);
    const weightKg = Number(options.weightKg) || 0;
    const historyPeakRows = options.historyPeakRows || null;
    const pctShape = historyPeakRows?.length
        ? analyzePctShape(powerPeakRows, historyPeakRows)
        : null;

    const watts = {};
    for (const key of PHENOTYPE_DURATION_KEYS) {
        watts[key] = rowWatts(powerPeakRows, key);
    }

    const presentCount = PHENOTYPE_DURATION_KEYS.filter((k) => watts[k] > 0).length;
    if (presentCount < 2 || ftp <= 0) {
        return {
            id: 'building',
            label: RIDER_PHENOTYPE_LABELS.building,
            tagline: PHENOTYPE_TAGLINES.building,
            confidence: 0,
            scores: {},
            zoneIndices: {},
        };
    }

    const zoneIndices = {};
    for (const key of PHENOTYPE_DURATION_KEYS) {
        zoneIndices[key] = watts[key] > 0 ? cogganZoneIndex(watts[key], ftp) : null;
    }

    const z1 = zoneIndices.best_1min;
    const z5 = zoneIndices.best_5min;
    const z10 = zoneIndices.best_10min;
    const z20 = zoneIndices.best_20min;
    const z60 = zoneIndices.best_60min;

    const availableZones = PHENOTYPE_DURATION_KEYS
        .map((k) => zoneIndices[k])
        .filter((z) => z != null);
    const zoneSpread = availableZones.length
        ? Math.max(...availableZones) - Math.min(...availableZones)
        : 0;
    const zoneStd = stdDev(availableZones);

    const w1 = watts.best_1min;
    const w5 = watts.best_5min;
    const w10 = watts.best_10min;
    const w20 = watts.best_20min;
    const w60 = watts.best_60min;

    const r120 = ratio(w1, w20);
    const r520 = ratio(w5, w20);
    const r15 = ratio(w1, w5);
    const r2060 = ratio(w20, w60);
    const r1060 = ratio(w10, w60);
    const r560 = ratio(w5, w60);
    const pct2060 = w20 > 0 && w60 > 0 ? Math.abs(w60 - w20) / w20 : 1;
    const shortHead = r120;

    const moderateLeftDrop = r120 >= 1.28 && r120 < 1.55;
    const steepLeftDrop = r120 >= 1.55;
    const gradualCurve = r120 > 0 && r120 < 1.55 && r520 > 0 && r520 < 1.35;

    const scores = {
        sprinter: 0,
        rouleur: 0,
        climber: 0,
        time_trialist: 0,
    };

    const overallFlat = availableZones.length >= 4
        && zoneStd <= 0.55
        && zoneSpread <= 1.25
        && w1 > 0
        && w60 > 0
        && (w1 - w60) / w1 <= 0.08;

    const endToEndFlat = w1 > 0 && w60 > 0 && (w1 - w60) / w1 <= 0.10;
    const peakWatts = Math.max(w1, w5, w10, w20, w60);
    const midNearPeak = [w5, w10, w20].filter((w) => w > 0).some((w) => w >= peakWatts * 0.94);

    // Sprinter: steep left-side drop — short >> long in watts AND relative shape (not flat % band)
    const pctFlat = pctShape?.isFlatBand === true;
    const relativeShortDominance = pctShape ? pctShape.shortLeadsPct : true;

    if (z20 != null && steepLeftDrop && !pctFlat && relativeShortDominance) {
        const shortLift1 = z1 != null ? z1 - z20 : 0;
        const shortLift5 = z5 != null ? z5 - z20 : 0;
        const maxShortLift = Math.max(shortLift1, shortLift5);

        if (maxShortLift >= 3 && r120 >= 1.62) {
            scores.sprinter += 48 + (maxShortLift - 3) * 8;
        } else if (maxShortLift >= 2 && r120 >= 1.58) {
            scores.sprinter += 38;
        } else if (r120 >= 1.65 && r520 >= 1.28) {
            scores.sprinter += 32;
        } else if (r120 >= 1.58 && r520 >= 1.24 && r15 >= 1.18) {
            scores.sprinter += 28;
        } else if (r520 >= 1.30 && r120 >= 1.55) {
            scores.sprinter += 18;
        }
    } else if (z20 != null && moderateLeftDrop && !pctFlat && relativeShortDominance && r520 >= 1.22) {
        scores.sprinter += 10;
    }

    if (pctFlat || gradualCurve || (moderateLeftDrop && !steepLeftDrop)) {
        scores.sprinter *= pctFlat ? 0.08 : 0.35;
    }
    if (pctShape && !pctShape.shortLeadsPct && scores.sprinter > 0) {
        scores.sprinter *= 0.25;
    }

    // Rouleur: flat curve — similar category at every duration (absolute + % of all-time)
    if (pctFlat) {
        scores.rouleur += 50 + Math.max(0, 10 - (pctShape.spread || 0)) * 2;
    } else if (pctShape?.spread != null && pctShape.spread <= 12) {
        scores.rouleur += 28;
    }
    if (availableZones.length >= 3 && (overallFlat || endToEndFlat)) {
        if (overallFlat) {
            scores.rouleur += 52;
        } else if (zoneStd <= 0.45 && zoneSpread <= 1) {
            scores.rouleur += 44;
        } else if (zoneStd <= 0.65 && zoneSpread <= 1.15) {
            scores.rouleur += 30;
        } else if (zoneStd <= 0.85 && zoneSpread <= 1.35) {
            scores.rouleur += 16;
        }

        const stepRatios = [];
        if (w1 > 0 && w5 > 0) stepRatios.push(w1 / w5);
        if (w5 > 0 && w10 > 0) stepRatios.push(w5 / w10);
        if (w10 > 0 && w20 > 0) stepRatios.push(w10 / w20);
        if (w20 > 0 && w60 > 0) stepRatios.push(w20 / w60);
        if (stepRatios.length >= 3) {
            const ratioSpread = Math.max(...stepRatios) - Math.min(...stepRatios);
            if (ratioSpread <= 0.08) scores.rouleur += 24;
            else if (ratioSpread <= 0.12) scores.rouleur += 14;
        }
    }

    // Climber: 5–20 min relative strength peaks vs shorter & longer durations
    if (pctShape?.midLeadsPct) {
        scores.climber += 24;
    } else if (pctShape?.enduranceLeadsPct && pctFlat) {
        scores.climber += 8;
    }
    const midZones = [z5, z10, z20].filter((z) => z != null);
    const edgeZones = [z1, z60].filter((z) => z != null);
    if (midZones.length >= 2 && edgeZones.length >= 1) {
        const midAvg = midZones.reduce((a, b) => a + b, 0) / midZones.length;
        const edgeAvg = edgeZones.reduce((a, b) => a + b, 0) / edgeZones.length;
        const midPeak = midAvg - edgeAvg;

        if (midPeak >= 0.75) scores.climber += 32 + midPeak * 8;
        else if (midPeak >= 0.45) scores.climber += 22 + midPeak * 6;
        else if (midPeak >= 0.25) scores.climber += 12;

        if (midNearPeak) {
            if (r2060 >= 1.12) scores.climber += 22;
            else if (r2060 >= 1.08) scores.climber += 16;
            else if (r1060 >= 1.12) scores.climber += 14;
            else if (r560 >= 1.14) scores.climber += 12;
        } else if (r120 <= 1.48 && r2060 >= 1.08) {
            scores.climber += 14;
        } else if (r120 <= 1.48 && r1060 >= 1.14) {
            scores.climber += 10;
        }

        const wkgCandidates = [
            w20 > 0 && weightKg > 0 ? w20 / weightKg : 0,
            w10 > 0 && weightKg > 0 ? w10 / weightKg : 0,
            w5 > 0 && weightKg > 0 ? w5 / weightKg : 0,
        ].filter((v) => v > 0);
        const bestWkg = wkgCandidates.length ? Math.max(...wkgCandidates) : 0;
        if (bestWkg >= 4.8) scores.climber += 26;
        else if (bestWkg >= 4.2) scores.climber += 18;
        else if (bestWkg >= 3.8) scores.climber += 12;
        else if (bestWkg >= 3.6) scores.climber += 6;

        if (w20 > 0 && w5 > 0 && r520 >= 1.02 && r520 <= 1.14) scores.climber += 8;
        if (r120 > 0 && r120 <= 1.18 && r2060 >= 1.06) scores.climber += 10;

        if (r120 >= 1.45) scores.climber *= 0.55;
    }

    // Time trialist: 60 min close to 20 min — only when short power does NOT dominate
    const climberTail = r2060 >= 1.14 || (r2060 >= 1.10 && midNearPeak);
    const shortDominates = shortHead > 1.15 || r520 > 1.10;

    if (w20 > 0 && w60 > 0 && !overallFlat && !climberTail && !shortDominates) {
        if (pct2060 <= 0.05 && shortHead <= 1.12) {
            scores.time_trialist += 42;
        } else if (pct2060 <= 0.08 && shortHead <= 1.15) {
            scores.time_trialist += 34;
        } else if (pct2060 <= 0.10 && shortHead <= 1.12) {
            scores.time_trialist += 18;
        }

        const w60over20 = w60 / w20;
        if (w60over20 >= 0.94 && w60over20 <= 1.04) scores.time_trialist += 12;
        else if (w60over20 >= 0.92 && w60over20 <= 1.05) scores.time_trialist += 6;

        if (z20 != null && z60 != null && Math.abs(z60 - z20) <= 1) {
            scores.time_trialist += 12;
        }
    }

    if (w10 > 0 && w20 > 0 && w60 > 0 && !overallFlat && !climberTail && !shortDominates) {
        const drop10to60 = (w10 - w60) / w10;
        if (drop10to60 <= 0.08) scores.time_trialist += 8;
    }

    if (overallFlat) {
        scores.time_trialist *= 0.35;
        scores.sprinter *= 0.45;
    }

    if (pctFlat) {
        scores.sprinter *= 0.15;
        scores.time_trialist *= 0.55;
    }

    if (climberTail && scores.time_trialist > 0) {
        scores.time_trialist *= 0.4;
    }

    if (shortDominates && scores.time_trialist > 0) {
        scores.time_trialist *= 0.5;
    }

    if (scores.sprinter >= 25 && (scores.rouleur >= 22 || scores.time_trialist >= 22)) {
        scores.sprinter *= 0.65;
    }
    if (scores.climber >= 22 && scores.sprinter >= 28 && midNearPeak) {
        scores.sprinter *= 0.7;
    }
    if (scores.climber >= 28 && scores.time_trialist >= 20) {
        scores.time_trialist *= 0.75;
    }

    const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const [topId, topScore] = entries[0];
    const secondScore = entries[1]?.[1] ?? 0;

    if (topScore <= 0) {
        return {
            id: 'building',
            label: RIDER_PHENOTYPE_LABELS.building,
            tagline: PHENOTYPE_TAGLINES.building,
            confidence: 0,
            scores,
            zoneIndices,
        };
    }

    if (topScore < 16) {
        if (zoneStd <= 0.9 && zoneSpread <= 1.75) {
            return {
                id: 'rouleur',
                label: RIDER_PHENOTYPE_LABELS.rouleur,
                tagline: PHENOTYPE_TAGLINES.rouleur,
                confidence: 42,
                scores,
                zoneIndices,
            };
        }
    }

    const confidence = topScore > 0
        ? clamp(Math.round(((topScore - secondScore) / topScore) * 100), 28, 92)
        : 0;

    return {
        id: topId,
        label: RIDER_PHENOTYPE_LABELS[topId],
        tagline: PHENOTYPE_TAGLINES[topId],
        confidence,
        scores,
        zoneIndices,
    };
}

/** @deprecated Use inferRiderPhenotype — kept for existing imports */
export function inferRiderArchetype(powerPeakRows, options = {}) {
    return inferRiderPhenotype(powerPeakRows, options);
}
