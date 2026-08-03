/**
 * Terrain profiles for climbing readiness — elevation targets and coach hints.
 */

export const TERRAIN_PROFILE_HILLY = 'hilly';
export const TERRAIN_PROFILE_FLAT = 'flat';
export const TERRAIN_PROFILE_MIXED = 'mixed';

const VALID_PROFILES = new Set([
    TERRAIN_PROFILE_HILLY,
    TERRAIN_PROFILE_FLAT,
    TERRAIN_PROFILE_MIXED,
]);

/** Weekly elevation targets (m) per terrain — used for scoring and hints. */
const ELEVATION_TARGETS = {
    [TERRAIN_PROFILE_HILLY]: { goodAt: 600, maxAt: 1200 },
    [TERRAIN_PROFILE_FLAT]: { goodAt: 200, maxAt: 450 },
    [TERRAIN_PROFILE_MIXED]: { goodAt: 350, maxAt: 700 },
};

/**
 * @param {unknown} value
 * @returns {'hilly' | 'flat' | 'mixed'}
 */
export function normalizeTerrainProfile(value) {
    if (typeof value === 'string' && VALID_PROFILES.has(value)) return value;
    return TERRAIN_PROFILE_HILLY;
}

/**
 * @param {'hilly' | 'flat' | 'mixed'} profile
 * @param {number} [periodDays]
 */
export function elevationTargetsForProfile(profile, periodDays = 7) {
    const base = ELEVATION_TARGETS[normalizeTerrainProfile(profile)];
    const days = Math.max(1, Number(periodDays) || 7);
    const scale = days / 7;
    return {
        goodAt: Math.round(base.goodAt * scale),
        maxAt: Math.round(base.maxAt * scale),
    };
}

/**
 * Monday = 0 … Sunday = 6 (calendar week, Mon–Sun).
 * @param {Date} referenceDate
 */
export function dayIndexInCalendarWeek(referenceDate) {
    const local = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
    const dow = local.getDay();
    return dow === 0 ? 6 : dow - 1;
}

/**
 * @param {'hilly' | 'flat' | 'mixed'} profile
 */
export function lowVolumeBadgeLabel(profile) {
    const p = normalizeTerrainProfile(profile);
    if (p === TERRAIN_PROFILE_FLAT) {
        return 'Add vertical stimulus (dunes, trainer, or trip)';
    }
    if (p === TERRAIN_PROFILE_MIXED) {
        return 'Needs more climbing stimulus';
    }
    return 'Needs more climbing volume';
}

/**
 * @param {'hilly' | 'flat' | 'mixed'} profile
 */
export function terrainProfileLabel(profile) {
    const p = normalizeTerrainProfile(profile);
    if (p === TERRAIN_PROFILE_FLAT) return 'Flat / coastal';
    if (p === TERRAIN_PROFILE_MIXED) return 'Mixed terrain';
    return 'Hilly / mountains';
}

/**
 * @param {object} params
 */
export function buildClimbingReadinessHints({
    terrainProfile,
    elevationScore,
    z2Score,
    tssScore,
    tsb,
    ftp,
    rideCount,
    referenceDate,
    periodDays = 7,
    z2Band,
}) {
    const profile = normalizeTerrainProfile(terrainProfile);
    const hints = [];
    const isWeeklyPeriod = periodDays <= 7;
    const dayIndex = dayIndexInCalendarWeek(referenceDate);
    const earlyWeek = isWeeklyPeriod && dayIndex <= 1;
    const noRidesYet = rideCount === 0;

    if (elevationScore < 60) {
        if (noRidesYet && earlyWeek) {
            hints.push('Week just started — elevation updates as you ride.');
        } else if (
            z2Score >= 60 &&
            tssScore >= 55 &&
            profile === TERRAIN_PROFILE_FLAT
        ) {
            hints.push(
                'Vertical is light this week, but Z2 and load look fine for flat coastal terrain.',
            );
        } else if (profile === TERRAIN_PROFILE_FLAT) {
            hints.push(
                'On flat terrain: dune loops, dike repeats, low-cadence torque on flats, or a trainer climb block (85–90% FTP).',
            );
        } else if (profile === TERRAIN_PROFILE_MIXED) {
            hints.push(
                'Mix dune or hill repeats with steady Z2 — or use a trainer / virtual climb when mountains are out of reach.',
            );
        } else {
            hints.push('Add hill repeats or a longer climb ride this week.');
        }
    }

    if (ftp > 0 && z2Score < 60) {
        if (z2Band) {
            hints.push(
                `More steady Z2 time (${z2Band.minPct}–${z2Band.maxPct}% FTP, about ${z2Band.minW}–${z2Band.maxW} W) supports climbing endurance.`,
            );
        } else {
            hints.push('More steady Z2 time (roughly 55–75% FTP) supports climbing endurance.');
        }
    }

    if (tssScore < 55) {
        hints.push('Weekly training load is light — build volume gradually if you feel fresh.');
    }

    if (tsb != null && tsb < -10) {
        if (profile === TERRAIN_PROFILE_FLAT) {
            hints.push('TSB is negative — balance hard sessions with easier recovery rides.');
        } else {
            hints.push('TSB is negative — balance hard climbs with easier recovery days.');
        }
    }

    if (tsb != null && tsb > 25) {
        if (profile === TERRAIN_PROFILE_FLAT) {
            hints.push(
                'You are very fresh — a quality climb stimulus (trainer, Zwift, or dune repeats) could sharpen form.',
            );
        } else {
            hints.push('You are very fresh — a quality climb session could sharpen race form.');
        }
    }

    return hints.slice(0, 3);
}
