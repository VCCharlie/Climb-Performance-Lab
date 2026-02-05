/**
 * Detects duplicate activities based on fuzzy matching.
 * Criteria:
 * - Start Time within +/- 15 minutes
 * - Distance within +/- 500 meters
 * - Moving Time within +/- 60 seconds
 * 
 * @param {Array} activities - List of activities to scan
 * @returns {Array} List of conflicts, where each conflict is { id: string, items: [activityA, activityB] }
 */
export const findDuplicates = (activities) => {
    if (!activities || activities.length < 2) return [];

    // 1. Sort by Date/Time (Ascending)
    const sorted = [...activities].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const conflicts = [];
    const processedIds = new Set();

    // Helper to parse date safely
    const getTime = (isoDate) => new Date(isoDate).getTime();

    // Thresholds
    const TIME_THRESHOLD_MS = 15 * 60 * 1000; // 15 mins
    const DIST_THRESHOLD_KM = 0.5; // 500m
    const DURATION_THRESHOLD_SEC = 60; // 60s

    for (let i = 0; i < sorted.length; i++) {
        const current = sorted[i];

        if (processedIds.has(current.id)) continue;

        const currentConflicts = [current];
        const currentTime = getTime(current.date);

        // Look ahead
        for (let j = i + 1; j < sorted.length; j++) {
            const candidate = sorted[j];
            if (processedIds.has(candidate.id)) continue;

            const candidateTime = getTime(candidate.date);

            // Optimization: If candidate is way past the time window, stop looking
            // (Since list is sorted by date)
            if (candidateTime - currentTime > TIME_THRESHOLD_MS) break;

            // Check Criteria
            const timeDiff = Math.abs(candidateTime - currentTime);
            const distDiff = Math.abs((Number(current.distance) || 0) - (Number(candidate.distance) || 0)); // Assumes distance in km
            const durationDiff = Math.abs((Number(current.moving_time) || 0) - (Number(candidate.moving_time) || 0));

            const isDuplicate =
                timeDiff <= TIME_THRESHOLD_MS &&
                distDiff <= DIST_THRESHOLD_KM &&
                durationDiff <= DURATION_THRESHOLD_SEC;

            if (isDuplicate) {
                currentConflicts.push(candidate);
                processedIds.add(candidate.id);
            }
        }

        if (currentConflicts.length > 1) {
            conflicts.push({
                id: `conflict_${current.id}`,
                items: currentConflicts
            });
            processedIds.add(current.id);
        }
    }

    return conflicts;
};
