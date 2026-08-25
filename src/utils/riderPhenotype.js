/**
 * Rider phenotype guide from period peak powers (Coggan zone shape + ratios).
 * Inspired by power-profile frameworks — a training guide, not a diagnosis.
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

/**
 * @param {Array<{ key: string, watts: number }> | null | undefined} powerPeakRows
 * @param {{ ftp?: number, weightKg?: number }} [options]
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

    const scores = {
        sprinter: 0,
        rouleur: 0,
        climber: 0,
        time_trialist: 0,
    };

    // Sprinter: short durations 2–3 Coggan categories above 20 min + steep 1 min vs 20 min
    if (z20 != null) {
        const shortLift1 = z1 != null ? z1 - z20 : 0;
        const shortLift5 = z5 != null ? z5 - z20 : 0;
        const maxShortLift = Math.max(shortLift1, shortLift5);
        const r120 = w1 > 0 && w20 > 0 ? w1 / w20 : 0;
        const r520 = w5 > 0 && w20 > 0 ? w5 / w20 : 0;

        if (maxShortLift >= 3) {
            scores.sprinter += 45 + (maxShortLift - 3) * 10;
        } else if (maxShortLift >= 2 && r120 >= 1.52) {
            scores.sprinter += 36;
        } else if (maxShortLift >= 2 && r120 >= 1.42 && r520 >= 1.22) {
            scores.sprinter += 28;
        } else if (maxShortLift >= 1 && r120 >= 1.62) {
            scores.sprinter += 18;
        }
        if (r520 >= 1.32) scores.sprinter += 12;
        if (r120 >= 1.68) scores.sprinter += 10;
    }

    const overallFlat = availableZones.length >= 3
        && zoneStd <= 0.55
        && w1 > 0
        && w60 > 0
        && (w1 - w60) / w1 <= 0.08;

    // Rouleur: flat curve — similar category at every duration
    if (availableZones.length >= 3) {
        if (overallFlat) {
            scores.rouleur += 50;
        } else if (zoneStd <= 0.45 && zoneSpread <= 1) {
            scores.rouleur += 42;
        } else if (zoneStd <= 0.75 && zoneSpread <= 1.25) {
            scores.rouleur += 28;
        } else if (zoneStd <= 1.0 && zoneSpread <= 1.5) {
            scores.rouleur += 14;
        }

        const ratios = [];
        if (w1 > 0 && w5 > 0) ratios.push(w1 / w5);
        if (w5 > 0 && w10 > 0) ratios.push(w5 / w10);
        if (w10 > 0 && w20 > 0) ratios.push(w10 / w20);
        if (w20 > 0 && w60 > 0) ratios.push(w20 / w60);
        if (ratios.length >= 2) {
            const ratioSpread = Math.max(...ratios) - Math.min(...ratios);
            if (ratioSpread <= 0.1) scores.rouleur += 22;
            else if (ratioSpread <= 0.15) scores.rouleur += 12;
        }
    }

    // Climber: best relative numbers at 5–20 min; w/kg when weight known
    const midZones = [z5, z10, z20].filter((z) => z != null);
    const edgeZones = [z1, z60].filter((z) => z != null);
    if (midZones.length >= 2 && edgeZones.length >= 1) {
        const midAvg = midZones.reduce((a, b) => a + b, 0) / midZones.length;
        const edgeAvg = edgeZones.reduce((a, b) => a + b, 0) / edgeZones.length;
        const midPeak = midAvg - edgeAvg;
        if (midPeak >= 0.75) scores.climber += 28 + midPeak * 8;
        else if (midPeak >= 0.35) scores.climber += 16 + midPeak * 6;

        const wkgCandidates = [
            w20 > 0 && weightKg > 0 ? w20 / weightKg : 0,
            w10 > 0 && weightKg > 0 ? w10 / weightKg : 0,
            w5 > 0 && weightKg > 0 ? w5 / weightKg : 0,
        ].filter((v) => v > 0);
        const bestWkg = wkgCandidates.length ? Math.max(...wkgCandidates) : 0;
        if (bestWkg >= 4.8) scores.climber += 28;
        else if (bestWkg >= 4.2) scores.climber += 18;
        else if (bestWkg >= 3.8) scores.climber += 10;

        if (w20 > 0 && w1 > 0 && w1 / w20 <= 1.14) scores.climber += 8;
        if (w20 > 0 && w5 > 0 && w5 / w20 >= 1.03 && w5 / w20 <= 1.14) scores.climber += 10;
    }

    // Time trialist: 60 min within ~5–8% of 20 min; flat sustained tail (not full rouleur flatness)
    if (w20 > 0 && w60 > 0 && !overallFlat) {
        const r2060 = w20 / w60;
        const pctDiff = Math.abs(w60 - w20) / w20;
        const shortHead = w1 > 0 ? w1 / w20 : 1;

        if (shortHead >= 1.08 && pctDiff <= 0.05) scores.time_trialist += 38;
        else if (shortHead >= 1.06 && pctDiff <= 0.08) scores.time_trialist += 30;
        else if (shortHead >= 1.04 && pctDiff <= 0.1) scores.time_trialist += 14;

        if (w60 / w20 >= 0.92 && w60 / w20 <= 1.04) scores.time_trialist += 14;

        if (z20 != null && z60 != null && Math.abs(z60 - z20) <= 1) {
            scores.time_trialist += 16;
        }
        if (r2060 >= 0.96 && r2060 <= 1.04) scores.time_trialist += 8;
    }
    if (w10 > 0 && w20 > 0 && w60 > 0 && !overallFlat) {
        const drop10to60 = (w10 - w60) / w10;
        if (drop10to60 <= 0.1) scores.time_trialist += 10;
    }

    if (overallFlat) {
        scores.time_trialist *= 0.45;
        scores.sprinter *= 0.5;
    }

    // Down-rank sprinter when the curve is actually flat / TT-like
    if (scores.sprinter >= 25 && (scores.rouleur >= 20 || scores.time_trialist >= 25)) {
        scores.sprinter *= 0.7;
    }
    if (scores.climber >= 20 && scores.sprinter >= 30) {
        scores.sprinter *= 0.75;
    }

    const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const [topId, topScore] = entries[0];
    const secondScore = entries[1]?.[1] ?? 0;

    if (topScore < 18) {
        if (zoneStd <= 0.85 && zoneSpread <= 1.75) {
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
