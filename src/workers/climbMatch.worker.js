import { buildClimbMatchIndex, findBestClimbUsingIndex } from '../utils/activityClimbMatch';

/**
 * Off-main-thread climb title matching for large activity logs (Bolt 4.1).
 * @param {{ type: 'match', requestId: number, activities: Array<{id, title}>, climbs: object[] }} msg
 */
self.onmessage = (event) => {
    const data = event.data;
    if (!data || data.type !== 'match') return;

    const { requestId, activities, climbs } = data;
    const index = buildClimbMatchIndex(climbs || []);
    const matches = [];

    for (const a of activities || []) {
        if (!a?.id || !a?.title) continue;
        const climb = findBestClimbUsingIndex(a.title, index);
        if (climb?.id != null) {
            matches.push({ activityId: String(a.id), climbId: String(climb.id) });
        }
    }

    self.postMessage({ type: 'result', requestId, matches });
};
