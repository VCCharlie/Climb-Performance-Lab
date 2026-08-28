/**
 * Multi-climb stage simulation for Physics tab (Tour-style day).
 * Reuses computePhysicsClimb for each segment + optional recovery between climbs.
 */

import { computePhysicsClimb, estimateSteadyTss } from './physicsEngineCore';
import {
    DEFAULT_CDA,
    DEFAULT_CRR,
    DEFAULT_DRIVETRAIN_LOSS_FRACTION,
} from './physicsConstants';

/**
 * @param {number} totalSeconds
 */
export function formatStageDuration(totalSeconds) {
    const s = Math.max(0, Math.round(Number(totalSeconds) || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) {
        return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }
    return `${m}:${String(sec).padStart(2, '0')}`;
}

/**
 * @param {object} params
 * @param {object[]} params.climbs
 * @param {{ weight: number, bikeWeight: number, ftp: number }} params.userSettings
 * @param {number} params.watts - steady power for each climb (predict mode)
 * @param {Record<string, number>} [params.recoveryMinutesById]
 * @param {number} [params.defaultRecoveryMinutes]
 * @param {number} [params.cda]
 * @param {number} [params.crr]
 * @param {number} [params.loss]
 * @param {number} [params.recoveryIntensityFactor] - IF for flat recovery between climbs
 */
export function simulatePhysicsStage({
    climbs,
    userSettings,
    watts,
    recoveryMinutesById = {},
    defaultRecoveryMinutes = 15,
    cda = DEFAULT_CDA,
    crr = DEFAULT_CRR,
    loss = DEFAULT_DRIVETRAIN_LOSS_FRACTION,
    recoveryIntensityFactor = 0.55,
}) {
    if (!climbs?.length) return null;

    const ftp = Number(userSettings?.ftp) || 0;
    const stageWatts = Math.max(0, Math.round(Number(watts) || 0));
    const segments = [];
    let cumulativeSeconds = 0;
    let totalClimbSeconds = 0;
    let totalRecoverySeconds = 0;
    let totalElevationM = 0;
    let totalTss = 0;
    let totalKj = 0;

    climbs.forEach((climb, index) => {
        const startOffsetSeconds = cumulativeSeconds;

        const calc = computePhysicsClimb({
            selectedClimb: climb,
            userSettings,
            mode: 'predict',
            targetTimeStr: '0:00',
            targetWatts: stageWatts,
            cda,
            crr,
            loss,
        });

        cumulativeSeconds += calc.seconds;
        totalClimbSeconds += calc.seconds;
        totalElevationM += Math.max(0, Number(climb.elevation) || 0);

        const climbTss = estimateSteadyTss(calc.seconds, calc.watts, ftp);
        const climbKj = (calc.watts * calc.seconds) / 1000;
        totalTss += climbTss;
        totalKj += climbKj;

        const isLast = index === climbs.length - 1;
        const recoveryMinutes = isLast
            ? 0
            : Math.max(0, Number(recoveryMinutesById[climb.id]) || defaultRecoveryMinutes);
        const recoverySeconds = recoveryMinutes * 60;
        const recoveryWatts = ftp > 0 ? Math.round(ftp * recoveryIntensityFactor) : 0;
        const recoveryTss = recoverySeconds > 0
            ? estimateSteadyTss(recoverySeconds, recoveryWatts, ftp)
            : 0;
        const recoveryKj = (recoveryWatts * recoverySeconds) / 1000;

        if (!isLast) {
            cumulativeSeconds += recoverySeconds;
            totalRecoverySeconds += recoverySeconds;
            totalTss += recoveryTss;
            totalKj += recoveryKj;
        }

        segments.push({
            index: index + 1,
            climb,
            startOffsetSeconds,
            climbSeconds: calc.seconds,
            climbTime: calc.time,
            watts: calc.watts,
            wkg: calc.wkg,
            vam: calc.vam,
            zone: calc.zone,
            ifRatio: calc.ifRatio,
            tss: climbTss,
            kj: Math.round(climbKj),
            recoveryMinutes,
            recoverySeconds,
            recoveryWatts,
            recoveryTss,
            cumulativeSecondsAfterSegment: cumulativeSeconds,
        });
    });

    const weightedWatts =
        totalClimbSeconds > 0
            ? Math.round(
                segments.reduce((sum, s) => sum + s.watts * s.climbSeconds, 0) / totalClimbSeconds,
            )
            : 0;

    return {
        segments,
        totals: {
            climbCount: climbs.length,
            totalClimbSeconds,
            totalRecoverySeconds,
            totalMovingSeconds: totalClimbSeconds + totalRecoverySeconds,
            totalElevationM: Math.round(totalElevationM),
            totalTss: Math.round(totalTss),
            totalKj: Math.round(totalKj),
            stageWatts,
            avgClimbWatts: weightedWatts,
            totalClimbTime: formatStageDuration(totalClimbSeconds),
            totalMovingTime: formatStageDuration(totalClimbSeconds + totalRecoverySeconds),
        },
    };
}

/**
 * @param {number} ftp
 * @param {number} intensityFactor
 */
export function stageWattsFromIntensity(ftp, intensityFactor) {
    const f = Number(ftp) || 0;
    const ifac = Math.max(0, Number(intensityFactor) || 0);
    return Math.round(f * ifac);
}
