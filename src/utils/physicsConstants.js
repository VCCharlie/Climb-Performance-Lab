/**
 * Shared physics constants for climb power/speed models across the app.
 * Used by PhysicsEngine, RacePacing, GearOptimizer, WeatherClimb, and stage simulator.
 */

export const DEFAULT_CRR = 0.004;
export const DEFAULT_CDA = 0.32;
export const DEFAULT_GRAVITY = 9.81;
export const DEFAULT_AIR_DENSITY = 1.225;
/** Wheel power / crank power ratio (97.5% efficient drivetrain). */
export const DEFAULT_DRIVETRAIN_EFFICIENCY = 0.975;
/** Fraction of crank power lost in drivetrain (complement of efficiency). */
export const DEFAULT_DRIVETRAIN_LOSS_FRACTION = 1 - DEFAULT_DRIVETRAIN_EFFICIENCY;

export const DEFAULT_PHYSICS_SETTINGS = {
    crr: DEFAULT_CRR,
    cda: DEFAULT_CDA,
    drivetrainLossFraction: DEFAULT_DRIVETRAIN_LOSS_FRACTION,
};

/**
 * Merge saved physics overrides with defaults (non-destructive for partial saves).
 * @param {Record<string, unknown> | null | undefined} saved
 * @returns {{ crr: number, cda: number, drivetrainLossFraction: number }}
 */
export function mergePhysicsSettings(saved) {
    const base = { ...DEFAULT_PHYSICS_SETTINGS };
    if (!saved || typeof saved !== 'object') return base;

    const crr = Number(saved.crr);
    const cda = Number(saved.cda);
    const drivetrainLossFraction = Number(saved.drivetrainLossFraction);

    return {
        crr: Number.isFinite(crr) && crr > 0 ? crr : base.crr,
        cda: Number.isFinite(cda) && cda > 0 ? cda : base.cda,
        drivetrainLossFraction: Number.isFinite(drivetrainLossFraction) && drivetrainLossFraction >= 0 && drivetrainLossFraction < 1
            ? drivetrainLossFraction
            : base.drivetrainLossFraction,
    };
}

/**
 * Resolve physics params from userSettings with fallbacks.
 * @param {Record<string, unknown> | null | undefined} userSettings
 */
export function resolvePhysicsParams(userSettings) {
    return mergePhysicsSettings(userSettings?.physics);
}
