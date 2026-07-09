/**
 * Synthetisch hellings- en hoogteprofiel + statistieken voor Climb Profiler.
 * Geen GPS-segmentdata: variatie is een benadering op basis van gemiddelde helling.
 */

import { COGGAN_ZONES } from '../cogganZones';

export function buildSyntheticProfile(selectedClimb, points = 50) {
    const totalDistance = selectedClimb.lengthKm;
    const totalElevation = selectedClimb.elevation;
    const avgGrade = selectedClimb.avgGrade;

    const data = [];
    let cumulativeElevation = 0;

    for (let i = 0; i <= points; i++) {
        const distanceKm = (i / points) * totalDistance;
        const progress = i / points;

        let gradientModifier = 1.0;
        if (avgGrade > 8) {
            gradientModifier = 0.7 + Math.sin(progress * Math.PI) * 0.5 + Math.sin(progress * Math.PI * 3) * 0.2;
        } else if (avgGrade > 6) {
            gradientModifier = 0.9 + Math.sin(progress * Math.PI * 4) * 0.3;
        } else {
            gradientModifier = 1.0 + Math.sin(progress * Math.PI * 2) * 0.15;
        }

        const gradient = avgGrade * gradientModifier;
        const segmentElevation = totalElevation / points;
        cumulativeElevation += segmentElevation;

            data.push({
                distance: distanceKm,
                elevation: cumulativeElevation,
                gradient: Math.max(0, Math.min(gradient, 25)),
                progress: progress * 100
            });
        }

    const lastElev = data[data.length - 1]?.elevation;
    if (lastElev > 0 && totalElevation > 0) {
        const scale = totalElevation / lastElev;
        data.forEach((d) => {
            d.elevation *= scale;
        });
    }

    return data;
}

export function computeTacticalZones(profileData, selectedClimb) {
    const zones = [];

    profileData.forEach((point, idx) => {
        if (point.gradient > 10 && idx > 0) {
            zones.push({
                km: point.distance,
                type: 'steep',
                gradient: point.gradient,
                label: `Steile passage · ${point.gradient.toFixed(1)}%`
            });
        }
    });

    profileData.forEach((point, idx) => {
        if (point.gradient < 5 && selectedClimb.avgGrade > 6 && idx > 0 && idx < profileData.length - 1) {
            if (idx % 10 === 0) {
                zones.push({
                    km: point.distance,
                    type: 'recovery',
                    gradient: point.gradient,
                    label: `Rustiger stuk · ${point.gradient.toFixed(1)}%`
                });
            }
        }
    });

    zones.push(
        { km: 0, type: 'start', label: 'Start' },
        { km: selectedClimb.lengthKm / 2, type: 'halfway', label: 'Halfweg' },
        { km: selectedClimb.lengthKm, type: 'finish', label: 'Top' }
    );

    return zones;
}

export function computePowerRecommendations(profileData, ftp, intensityFraction) {
    const basePower = ftp * intensityFraction;

    return profileData.map(point => {
        let powerMultiplier = 1.0;
        if (point.gradient > 12) powerMultiplier = 0.95;
        else if (point.gradient < 5) powerMultiplier = 1.1;

        const recommendedPower = Math.round(basePower * powerMultiplier);
        const ratio = ftp > 0 ? recommendedPower / ftp : 0;
        let zone = COGGAN_ZONES.find(z => ratio >= z.min && ratio < z.max);
        if (!zone) zone = COGGAN_ZONES[COGGAN_ZONES.length - 1];

        return {
            ...point,
            recommendedPower,
            zone
        };
    });
}

export function computeClimbStats(profileData, selectedClimb) {
    // ⚡ Bolt Optimization: Use single-pass reduce to avoid call stack limits on long profiles
    const maxGradient = profileData.reduce((max, p) => Math.max(max, p.gradient), -Infinity);
    const minGradient = profileData.reduce((min, p) => Math.min(min, p.gradient), Infinity);
    const steepSections = profileData.filter(p => p.gradient > 10).length;
    const steepPercentage = (steepSections / profileData.length) * 100;

    return {
        maxGradient,
        minGradient,
        steepPercentage,
        difficultyScore: (selectedClimb.lengthKm * selectedClimb.avgGrade * (1 + steepPercentage / 100)).toFixed(0)
    };
}

/**
 * VAM en geschatte klimtijd via omgekeerde Ferrari-relatie (zelfde basis als calculations.js).
 * @param {number} totalWeightKg — lichaam + fiets
 */
export function estimateClimbPacingMetrics({
    ftp,
    totalWeightKg,
    elevationM,
    avgGradePct,
    lengthKm,
    intensityFraction
}) {
    const w = Math.max(totalWeightKg || 70, 45);
    const f = Math.max(ftp || 200, 80);
    const g = Math.max(avgGradePct || 1, 0.5);
    const targetPower = f * Math.min(Math.max(intensityFraction, 0.5), 1.15);

    const gradientFactor = 200 + 10 * g;
    const vam = (targetPower / w) * gradientFactor;
    const elev = Math.max(elevationM || 0, 1);
    const timeHours = elev / Math.max(vam, 1);
    const timeMinutes = timeHours * 60;
    const energyKj = Math.round((targetPower * timeHours * 3600) / 1000);

    const avgKmh = lengthKm > 0 && timeHours > 0 ? lengthKm / timeHours : 0;

    return {
        targetPower: Math.round(targetPower),
        vam: Math.round(vam),
        timeHours,
        timeMinutes,
        energyKj,
        wPerKg: parseFloat((targetPower / w).toFixed(2)),
        avgKmh: parseFloat(avgKmh.toFixed(1))
    };
}
