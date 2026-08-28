/**
 * Climb time/power estimates using the personal power-duration curve (best_*min anchors).
 */
import {
    buildAnchorsCache,
    interpolatePowerAt,
} from './powerDurationTable';
import { computePhysicsClimb, EMPTY_PHYSICS_CALC } from './physicsEngineCore';
import { resolvePhysicsParams } from './physicsConstants';

function maxAnchorSec(anchors) {
    if (!anchors?.length) return 0;
    return anchors.reduce((max, a) => Math.max(max, a.sec), 0);
}

/**
 * Strongest sustainable power (W) at duration t across all activities.
 *
 * @param {object[]} activities
 * @param {number} manualFtp
 * @param {number} durationSec
 * @returns {{ watts: number | null, sourceActivityId: string | null }}
 */
export function sustainablePowerAtDuration(activities, manualFtp, durationSec) {
    const sec = Number(durationSec);
    if (!activities?.length || !Number.isFinite(sec) || sec <= 0) {
        return { watts: null, sourceActivityId: null };
    }

    const ftp = Number(manualFtp) || 0;
    const cache = buildAnchorsCache(activities, ftp);
    let bestW = null;
    let bestId = null;

    for (const act of activities) {
        const id = act?.id != null ? String(act.id) : null;
        if (!id) continue;
        const anchors = cache.get(id) || [];
        if (sec > maxAnchorSec(anchors)) continue;
        const w = interpolatePowerAt(anchors, sec);
        if (w == null || w <= 0) continue;
        if (bestW === null || w > bestW) {
            bestW = w;
            bestId = id;
        }
    }

    return { watts: bestW, sourceActivityId: bestId };
}

/**
 * Estimate climb performance using FTP first, then refine with power-curve sustainable watts.
 *
 * @param {object} params
 * @param {object} params.selectedClimb
 * @param {object} params.userSettings
 * @param {object[]} [params.activities]
 * @param {number} [params.intensityFraction] — initial IF when no curve (default 0.85)
 * @param {number} [params.cda]
 * @param {number} [params.crr]
 * @param {number} [params.loss]
 * @returns {{
 *   ftpEstimate: object,
 *   curveEstimate: object | null,
 *   curvePowerW: number | null,
 *   curveSourceActivityId: string | null,
 *   usedPowerCurve: boolean,
 * }}
 */
export function estimateClimbWithPowerCurve({
    selectedClimb,
    userSettings,
    activities = [],
    intensityFraction = 0.85,
    cda,
    crr,
    loss,
}) {
    const physicsDefaults = resolvePhysicsParams(userSettings);
    const resolvedCda = cda ?? physicsDefaults.cda;
    const resolvedCrr = crr ?? physicsDefaults.crr;
    const resolvedLoss = loss ?? physicsDefaults.drivetrainLossFraction;
    const ftp = Number(userSettings?.ftp) || 250;
    const seedWatts = Math.round(ftp * intensityFraction);

    const seedCalc = selectedClimb
        ? computePhysicsClimb({
            selectedClimb,
            userSettings,
            mode: 'predict',
            targetTimeStr: '1:00:00',
            targetWatts: seedWatts,
            cda: resolvedCda,
            crr: resolvedCrr,
            loss: resolvedLoss,
        })
        : { ...EMPTY_PHYSICS_CALC };

    const { watts: curvePowerW, sourceActivityId } = sustainablePowerAtDuration(
        activities,
        ftp,
        seedCalc.seconds,
    );

    if (!curvePowerW || curvePowerW <= 0) {
        return {
            ftpEstimate: seedCalc,
            curveEstimate: null,
            curvePowerW: null,
            curveSourceActivityId: null,
            usedPowerCurve: false,
        };
    }

    const curveEstimate = computePhysicsClimb({
        selectedClimb,
        userSettings,
        mode: 'predict',
        targetTimeStr: '1:00:00',
        targetWatts: curvePowerW,
        cda: resolvedCda,
        crr: resolvedCrr,
        loss: resolvedLoss,
    });

    return {
        ftpEstimate: seedCalc,
        curveEstimate,
        curvePowerW,
        curveSourceActivityId: sourceActivityId,
        usedPowerCurve: true,
    };
}
