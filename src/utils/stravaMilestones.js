/**
 * Next round-number milestones for Strava-style cumulative stats (rides, distance m, elevation m).
 */

const RIDE_STEPS = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000];

const DIST_KM_STEPS = [100, 250, 500, 1000, 2500, 5000, 10000, 15000, 20000, 25000, 30000, 40000, 50000, 75000, 100000];

const ELEV_STEPS = [500, 1000, 2500, 5000, 10000, 25000, 50000, 75000, 100000, 150000, 200000, 250000, 500000];

/** Cumulative moving time targets (seconds): 1h, 2h, 5h, 10h, … */
const MOVING_TIME_SEC_STEPS = [1, 2, 5, 10, 25, 50, 100, 250, 500, 750, 1000, 1500, 2000, 2500, 3000, 4000, 5000].map((h) => h * 3600);

function nextInSteps(current, steps) {
    const c = Math.max(0, Number(current) || 0);
    const hit = steps.find((s) => s > c);
    if (hit != null) return hit;
    const last = steps[steps.length - 1];
    let t = last;
    while (t <= c) t += last;
    return t;
}

/**
 * @param {number} count - ride count
 * @param {number} distanceM - total distance meters
 * @param {number} elevM - total elevation meters
 * @param {number} movingTimeSec - total moving time seconds
 */
export function computeRideMilestones(count, distanceM, elevM, movingTimeSec) {
    const km = (Number(distanceM) || 0) / 1000;
    const e = Number(elevM) || 0;
    const rides = Math.floor(Number(count) || 0);
    const mt = Math.max(0, Math.floor(Number(movingTimeSec) || 0));

    const rideTarget = nextInSteps(rides, RIDE_STEPS);
    const distTargetKm = nextInSteps(km, DIST_KM_STEPS);
    const elevTarget = nextInSteps(e, ELEV_STEPS);
    const timeTargetSec = nextInSteps(mt, MOVING_TIME_SEC_STEPS);

    return {
        rides: {
            current: rides,
            target: rideTarget,
            remaining: Math.max(0, rideTarget - rides),
            pct: rideTarget > 0 ? Math.min(100, (rides / rideTarget) * 100) : 0
        },
        distanceKm: {
            current: km,
            targetKm: distTargetKm,
            remainingKm: Math.max(0, distTargetKm - km),
            pct: distTargetKm > 0 ? Math.min(100, (km / distTargetKm) * 100) : 0
        },
        elevation: {
            current: e,
            target: elevTarget,
            remaining: Math.max(0, elevTarget - e),
            pct: elevTarget > 0 ? Math.min(100, (e / elevTarget) * 100) : 0
        },
        movingTime: {
            currentSec: mt,
            targetSec: timeTargetSec,
            remainingSec: Math.max(0, timeTargetSec - mt),
            pct: timeTargetSec > 0 ? Math.min(100, (mt / timeTargetSec) * 100) : 0
        }
    };
}
