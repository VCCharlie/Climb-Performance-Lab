/**
 * Race Pacing → Fueling handoff payload.
 */

import { buildRaceFuelingTimeline } from './fuelingTimeline';

/**
 * @param {object | null} raceStrategy output of RacePacing useMemo
 * @param {number} targetIntensity IF 0.6–1.0
 * @param {object[]} [selectedClimbs]
 */
export function buildFuelingHandoff(raceStrategy, targetIntensity, selectedClimbs = []) {
    if (!raceStrategy) return null;

    const duration = Math.max(15, Math.round(Number(raceStrategy.totalTime) || 0));
    const intensity = Math.min(1, Math.max(0.55, Number(targetIntensity) || 0.85));

    let maxElevation = 0;
    for (const c of selectedClimbs || []) {
        maxElevation = Math.max(maxElevation, Number(c?.elevation) || 0);
    }

    const rawCph = Number(raceStrategy.carbsPerHour);
    const carbsPerHour = Number.isFinite(rawCph) && rawCph > 0
        ? Math.min(120, Math.max(30, Math.round(rawCph)))
        : null;

    const totalCarbs = Math.round(Number(raceStrategy.totalCarbs) || 0);
    const climbTimeline = buildRaceFuelingTimeline(raceStrategy.climbDetails || []);

    return {
        duration,
        intensity,
        carbsPerHour,
        totalCarbs: totalCarbs > 0 ? totalCarbs : null,
        altitude: maxElevation >= 1200 ? Math.round(maxElevation * 0.55) : 0,
        fromRacePacing: true,
        climbCount: (selectedClimbs || []).length,
        climbTimeline,
    };
}
