/**
 * src/utils/dedup.js
 * Deduplication Logic
 */

export const isSameActivity = (a, b) => {
    // 1. Check ID (if same source)
    if (a.id === b.id) return true;

    // 2. Check Date (YYYY-MM-DD must match)
    if (!a.date || !b.date) return false;
    const dateA = a.date.split('T')[0];
    const dateB = b.date.split('T')[0];
    if (dateA !== dateB) return false;

    // 3. Check Type (Loose match: Ride vs VirtualRide is okish, but Run vs Ride is not)
    // Actually, we should probably be strict about "Sport" but allow "Ride" to match "VirtualRide"
    const isRideA = ['Ride', 'VirtualRide'].includes(a.type);
    const isRideB = ['Ride', 'VirtualRide'].includes(b.type);
    if (isRideA !== isRideB) return false; // Different major types

    // 4. Check Metrics (Time or Distance closeness)
    const durA = Number(a.moving_time) || 0;
    const durB = Number(b.moving_time) || 0;
    const distA = Number(a.distance) || 0;
    const distB = Number(b.distance) || 0;

    const timeDiff = Math.abs(durA - durB);
    const distDiff = Math.abs(distA - distB);

    // Match if:
    // - Time is within 5 minutes (300s) -> Strava vs Intervals variance
    // - OR Distance is within 0.5km -> GPS variance
    // - BUT NOT if both are zero? (Empty activities shouldn't match widely)
    if (durA === 0 && durB === 0 && distA === 0 && distB === 0) return false;

    return timeDiff < 300 || distDiff < 0.5;
};

export const findDuplicatesInList = (activities) => {
    if (!activities || activities.length < 2) return [];

    // Group by Date first for performance
    const groups = {};
    activities.forEach(act => {
        if (!act.date) return;
        const day = act.date.split('T')[0];
        if (!groups[day]) groups[day] = [];
        groups[day].push(act);
    });

    const duplicates = [];
    Object.values(groups).forEach(group => {
        if (group.length < 2) return;
        // Compare n^2 within the day
        for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
                const a = group[i];
                const b = group[j];
                if (isSameActivity(a, b)) {
                    duplicates.push({
                        a,
                        b,
                        reason: `Date match + Metrics overlap`
                    });
                }
            }
        }
    });
    return duplicates;
};
