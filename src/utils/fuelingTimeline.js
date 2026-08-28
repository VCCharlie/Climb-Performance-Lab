/**
 * Nutrition timeline builders for FuelingStrategy.
 * Race handoff uses climb order; generic mode uses 20/40/80 minute cadence.
 */

/**
 * Generic fueling reminders every ~20 minutes (gel at 40, bar at 80 when intensity allows).
 * @param {number} durationMinutes
 * @param {number} intensity IF 0–1
 * @returns {Array<{ time: number, action: string, kind: string }>}
 */
export function buildGenericFuelingTimeline(durationMinutes, intensity = 0.85) {
    const duration = Math.max(0, Number(durationMinutes) || 0);
    const events = [];
    const numEvents = Math.floor(duration / 20);

    for (let i = 1; i <= numEvents; i += 1) {
        const time = i * 20;
        let action = 'Drink';
        let kind = 'drink';

        if (time % 40 === 0) {
            action = 'Drink + Gel';
            kind = 'gel';
        }
        if (time % 80 === 0 && intensity < 0.85) {
            action = 'Drink + Solid Bar';
            kind = 'bar';
        }

        events.push({ time, action, kind });
    }

    return events;
}

/**
 * Build timeline aligned to climb order from Race Pacing handoff.
 * @param {Array<{ climb: object, timeMinutes: number, cumulativeTime: number, recovery: number }>} climbDetails
 * @returns {Array<{ time: number, action: string, kind: string, climbName?: string }>}
 */
export function buildRaceFuelingTimeline(climbDetails) {
    if (!Array.isArray(climbDetails) || climbDetails.length === 0) {
        return [];
    }

    const events = [{ time: 0, action: 'Pre-race: Drink + light carbs', kind: 'drink' }];

    climbDetails.forEach((detail, index) => {
        const climbName = detail?.climb?.name || `Climb ${index + 1}`;
        const startMinute = index === 0
            ? 0
            : Math.round((Number(detail.cumulativeTime) - Number(detail.timeMinutes) - Number(detail.recovery)) || 0);

        if (index > 0 && startMinute > 0) {
            const preClimb = Math.max(0, startMinute - 5);
            events.push({
                time: preClimb,
                action: 'Drink + Gel before next climb',
                kind: 'gel',
                climbName,
            });
        }

        events.push({
            time: Math.max(0, Math.round(startMinute)),
            action: `Start climb ${index + 1}: ${climbName}`,
            kind: 'climb',
            climbName,
        });

        const climbEnd = Math.round(Number(detail.cumulativeTime) - Number(detail.recovery) || startMinute + detail.timeMinutes);
        if (climbEnd > startMinute) {
            events.push({
                time: climbEnd,
                action: `Top of ${climbName}: Drink`,
                kind: 'drink',
                climbName,
            });
        }

        const recovery = Number(detail.recovery) || 0;
        if (recovery >= 20) {
            events.push({
                time: Math.round(climbEnd + Math.min(10, recovery / 2)),
                action: 'Recovery: Drink + Gel',
                kind: 'gel',
                climbName,
            });
        }
    });

    const seen = new Set();
    return events
        .sort((a, b) => a.time - b.time)
        .filter((event) => {
            const key = `${event.time}|${event.action}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}

/**
 * Pick race climb timeline or generic fallback.
 * @param {object} options
 * @param {boolean} options.fromRacePacing
 * @param {Array} [options.raceClimbTimeline]
 * @param {number} options.durationMinutes
 * @param {number} options.intensity
 */
export function resolveFuelingTimeline({
    fromRacePacing,
    raceClimbTimeline,
    durationMinutes,
    intensity,
}) {
    if (fromRacePacing && Array.isArray(raceClimbTimeline) && raceClimbTimeline.length > 0) {
        return raceClimbTimeline;
    }
    return buildGenericFuelingTimeline(durationMinutes, intensity);
}
