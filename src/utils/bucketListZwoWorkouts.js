/**
 * Generate climb-specific .zwo prep workouts from bucket list climbs.
 */

/**
 * Rough climb duration at tempo pace (for repeat block sizing).
 * @param {object} climb
 */
export function estimateClimbEffortSeconds(climb) {
    const elevation = Math.max(0, Number(climb?.elevation) || 0);
    const grade = Number(climb?.avgGrade) || 0;
    const lengthKm = Math.max(0, Number(climb?.lengthKm) || 0);

    if (elevation > 0) {
        const vam = grade >= 9 ? 900 : grade >= 6 ? 800 : 700;
        return Math.round((elevation / vam) * 3600);
    }
    if (lengthKm > 0) {
        const speedKmh = grade >= 8 ? 14 : 16;
        return Math.round((lengthKm / speedKmh) * 3600);
    }
    return 1200;
}

/**
 * Hill-repeat prep workout tailored to a single climb profile.
 * @param {object} climb
 * @param {{ ftp?: number }} [options]
 */
export function buildClimbPrepZwoWorkout(climb, options = {}) {
    if (!climb) return null;

    const grade = Number(climb.avgGrade) || 0;
    const totalSec = estimateClimbEffortSeconds(climb);
    const onPower = grade >= 9 ? 0.90 : grade >= 6 ? 0.87 : 0.82;
    const onDuration = Math.min(1200, Math.max(480, Math.round(totalSec * 0.45)));
    const offDuration = grade >= 8 ? 360 : 300;
    const repeats = totalSec > 2400 ? 2 : totalSec > 1200 ? 3 : 4;

    const title = `Climb prep: ${climb.name}`;
    const description = [
        `Preparation for ${climb.name} (${climb.lengthKm} km, ${climb.elevation} m, ${grade}% avg).`,
        `${repeats}× ${Math.round(onDuration / 60)} min at ${Math.round(onPower * 100)}% FTP with ${Math.round(offDuration / 60)} min recovery.`,
        'Simulate on a hill or trainer incline when possible.',
    ].join(' ');

    return {
        id: `climb_prep_${climb.id}`,
        climbId: climb.id,
        title,
        description,
        type: 'interval',
        zwoSteps: [
            { type: 'Warmup', duration: 900, powerLow: 0.50, powerHigh: 0.70 },
            {
                type: 'IntervalsT',
                repeat: repeats,
                onDuration,
                offDuration,
                onPower,
                offPower: 0.55,
            },
            { type: 'Cooldown', duration: 600, powerLow: 0.60, powerHigh: 0.50 },
        ],
    };
}

/**
 * Workouts for climbs marked planned or want in the bucket list.
 * @param {object[]} climbs
 * @param {Record<string, string>} climbStatus
 * @param {{ ftp?: number, statuses?: string[] }} [options]
 */
export function listBucketListPrepWorkouts(climbs, climbStatus = {}, options = {}) {
    const statuses = options.statuses || ['planned', 'want'];
    const statusSet = new Set(statuses);

    return (climbs || [])
        .filter((climb) => statusSet.has(climbStatus[climb.id]))
        .map((climb) => buildClimbPrepZwoWorkout(climb, options))
        .filter(Boolean);
}

/**
 * @param {object[]} climbs
 * @param {Record<string, string>} climbStatus
 * @param {{ statuses?: string[] }} [options]
 */
export function countBucketListPrepWorkouts(climbs, climbStatus = {}, options = {}) {
    return listBucketListPrepWorkouts(climbs, climbStatus, options).length;
}
