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
    const isRideA = ['Ride', 'VirtualRide'].includes(a.type);
    const isRideB = ['Ride', 'VirtualRide'].includes(b.type);
    if (isRideA !== isRideB) return false; // Different major types

    // 4. Check start time proximity when full datetime is available.
    //    Two activities that started > 15 min apart are distinct, even if metrics overlap.
    const hasTimeA = a.date.includes('T');
    const hasTimeB = b.date.includes('T');
    if (hasTimeA && hasTimeB) {
        const startDiff = Math.abs(new Date(a.date).getTime() - new Date(b.date).getTime());
        if (startDiff > 15 * 60 * 1000) return false;
    }

    // 5. Check Metrics - ALL must be similar to count as a duplicate.
    //    Two different activities on the same day can share one similar metric
    //    (e.g. two 30 km rides), but are unlikely to have identical duration AND
    //    distance AND power.
    const durA = Number(a.moving_time) || 0;
    const durB = Number(b.moving_time) || 0;
    const distA = Number(a.distance) || 0;
    const distB = Number(b.distance) || 0;

    // Safety: empty activities shouldn't match each other
    if (durA === 0 && durB === 0 && distA === 0 && distB === 0) return false;

    const durationDiff = Math.abs(durA - durB);
    const distDiff = Math.abs(distA - distB);

    // Require BOTH duration AND distance to be similar (AND, not OR)
    if (durationDiff >= 300 || distDiff >= 0.5) return false;

    // Optionally check avg_power when both activities have a meaningful value
    const powA = Number(a.avg_power) || 0;
    const powB = Number(b.avg_power) || 0;
    if (powA > 0 && powB > 0) {
        const powDiff = Math.abs(powA - powB);
        if (powDiff / Math.max(powA, powB) > 0.15) return false; // > 15% verschil
    }

    return true;
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
