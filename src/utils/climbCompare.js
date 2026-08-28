/**
 * Side-by-side climb comparison — reuses climb DB fields + physics/pacing estimates.
 */
import { calculateClimbCategory } from './calculations';
import { computePhysicsClimb, estimateSteadyTss } from './physicsEngineCore';
import { estimateClimbPacingMetrics } from './climbProfilerModel';
import { resolvePhysicsParams } from './physicsConstants';

/**
 * @param {object | null | undefined} climb
 * @param {object} userSettings
 * @param {{ intensityFraction?: number }} [opts]
 */
export function buildClimbComparisonMetrics(climb, userSettings, opts = {}) {
    if (!climb) return null;

    const intensityFraction = opts.intensityFraction ?? 0.85;
    const physicsDefaults = resolvePhysicsParams(userSettings);
    const totalWeight = (Number(userSettings?.weight) || 70) + (Number(userSettings?.bikeWeight) || 8);
    const ftp = Number(userSettings?.ftp) || 250;
    const targetWatts = Math.round(ftp * intensityFraction);

    const physics = computePhysicsClimb({
        selectedClimb: climb,
        userSettings,
        mode: 'predict',
        targetTimeStr: '1:00:00',
        targetWatts,
        cda: physicsDefaults.cda,
        crr: physicsDefaults.crr,
        loss: physicsDefaults.drivetrainLossFraction,
    });

    const pacing = estimateClimbPacingMetrics({
        ftp,
        totalWeightKg: totalWeight,
        elevationM: climb.elevation,
        avgGradePct: climb.avgGrade,
        lengthKm: climb.lengthKm,
        intensityFraction,
    });

    const category = calculateClimbCategory(climb.lengthKm, climb.avgGrade);
    const tss = estimateSteadyTss(physics.seconds, physics.watts, ftp);

    return {
        id: climb.id,
        name: climb.name,
        country: climb.country,
        flag: climb.flag,
        lengthKm: climb.lengthKm,
        elevation: climb.elevation,
        avgGrade: climb.avgGrade,
        cat: climb.cat || category.label,
        score: climb.score,
        physicsWatts: physics.watts,
        physicsWkg: Number(physics.wkg),
        physicsSeconds: physics.seconds,
        physicsTime: physics.time,
        physicsVam: physics.vam,
        pacingVam: pacing.vam,
        pacingMinutes: pacing.timeMinutes,
        pacingKj: pacing.energyKj,
        estimatedTss: tss,
        ifRatio: physics.ifRatio,
    };
}

/**
 * @param {object | null | undefined} climbA
 * @param {object | null | undefined} climbB
 * @param {object} userSettings
 * @param {{ intensityFraction?: number }} [opts]
 * @returns {Array<{ key: string, label: string, format: (m: object) => string, a: string, b: string, delta: string | null }>}
 */
export function buildClimbComparisonRows(climbA, climbB, userSettings, opts = {}) {
    const metricsA = buildClimbComparisonMetrics(climbA, userSettings, opts);
    const metricsB = buildClimbComparisonMetrics(climbB, userSettings, opts);
    if (!metricsA || !metricsB) return [];

    const spec = [
        { key: 'lengthKm', label: 'Length', format: (m) => `${m.lengthKm} km` },
        { key: 'elevation', label: 'Elevation', format: (m) => `${Math.round(m.elevation)} m` },
        { key: 'avgGrade', label: 'Avg gradient', format: (m) => `${m.avgGrade.toFixed(1)}%` },
        { key: 'cat', label: 'Category', format: (m) => m.cat || '—' },
        { key: 'physicsWatts', label: 'Est. power (@ IF)', format: (m) => `${m.physicsWatts} W` },
        { key: 'physicsWkg', label: 'Est. W/kg', format: (m) => `${m.physicsWkg.toFixed(2)} W/kg` },
        { key: 'physicsTime', label: 'Est. time (physics)', format: (m) => m.physicsTime?.slice(0, 5) || '—' },
        { key: 'physicsVam', label: 'VAM (physics)', format: (m) => `${m.physicsVam} m/h` },
        { key: 'pacingVam', label: 'VAM (pacing model)', format: (m) => `${m.pacingVam} m/h` },
        { key: 'estimatedTss', label: 'Est. TSS', format: (m) => `${Math.round(m.estimatedTss)}` },
    ];

    return spec.map(({ key, label, format }) => {
        const rawA = metricsA[key];
        const rawB = metricsB[key];
        const a = format(metricsA);
        const b = format(metricsB);

        let delta = null;
        if (typeof rawA === 'number' && typeof rawB === 'number' && Number.isFinite(rawA) && Number.isFinite(rawB)) {
            const diff = rawA - rawB;
            if (Math.abs(diff) >= 0.01) {
                const sign = diff > 0 ? '+' : '';
                delta = `${sign}${Number.isInteger(diff) ? diff : diff.toFixed(1)}`;
            }
        }

        return { key, label, a, b, delta };
    });
}
