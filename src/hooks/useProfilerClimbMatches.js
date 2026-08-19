import { useEffect, useMemo, useState } from 'react';
import { buildClimbMatchIndex, buildActivityClimbMatchText, findBestClimbForActivity } from '../utils/activityClimbMatch';

/** Use worker when filtered log exceeds this (main-thread fallback below). */
const WORKER_ACTIVITY_THRESHOLD = 250;

let workerInstance = null;

function getClimbMatchWorker() {
    if (typeof Worker === 'undefined') return null;
    if (!workerInstance) {
        workerInstance = new Worker(
            new URL('../workers/climbMatch.worker.js', import.meta.url),
            { type: 'module' },
        );
    }
    return workerInstance;
}

function buildClimbLookup(climbs) {
    const byId = new Map();
    for (const c of climbs || []) {
        if (c?.id != null) byId.set(String(c.id), c);
    }
    return byId;
}

function matchClimbsSync(activities, climbs) {
    const index = buildClimbMatchIndex(climbs);
    const map = new Map();
    for (const a of activities || []) {
        if (!a?.id) continue;
        if (!a.title && !a.description && !a.notes) continue;
        const { climb } = findBestClimbForActivity(a, index);
        if (climb) map.set(String(a.id), climb);
    }
    return map;
}

/**
 * Profiler climb matches for visible/filtered activities.
 * Uses a Web Worker when the list is large (Bolt 4.1).
 * @param {object[]} processedActivities
 * @param {object[]} climbs
 * @param {{ enabled?: boolean }} [options]
 */
export function useProfilerClimbMatches(processedActivities, climbs, options = {}) {
    const { enabled = true } = options;
    const [workerResult, setWorkerResult] = useState({ cacheKey: '', map: new Map() });
    const climbLookup = useMemo(() => buildClimbLookup(climbs), [climbs]);

    const activityPayload = useMemo(
        () => (processedActivities || [])
            .filter((a) => a?.id && (a.title || a.description || a.notes))
            .map((a) => ({
                id: String(a.id),
                title: a.title || '',
                description: a.description || a.notes || '',
                matchText: buildActivityClimbMatchText(a),
            })),
        [processedActivities],
    );

    const workerCacheKey = useMemo(() => {
        if (!activityPayload.length) return '';
        const first = activityPayload[0];
        const last = activityPayload[activityPayload.length - 1];
        return `${activityPayload.length}|${first.id}|${first.title}|${last.id}|${climbs?.length ?? 0}`;
    }, [activityPayload, climbs?.length]);

    const useWorker = activityPayload.length >= WORKER_ACTIVITY_THRESHOLD
        && climbs?.length > 0
        && typeof Worker !== 'undefined';

    useEffect(() => {
        if (!enabled || !useWorker || !workerCacheKey) return undefined;

        const worker = getClimbMatchWorker();
        if (!worker) return undefined;

        const cacheKey = workerCacheKey;

        const onMessage = (event) => {
            const msg = event.data;
            if (!msg || msg.type !== 'result') return;
            const map = new Map();
            for (const { activityId, climbId } of msg.matches || []) {
                const climb = climbLookup.get(climbId);
                if (climb) map.set(activityId, climb);
            }
            setWorkerResult({ cacheKey, map });
        };

        worker.addEventListener('message', onMessage);
        worker.postMessage({
            type: 'match',
            requestId: cacheKey,
            activities: activityPayload,
            climbs,
        });

        return () => {
            worker.removeEventListener('message', onMessage);
        };
    }, [enabled, useWorker, workerCacheKey, activityPayload, climbs, climbLookup]);

    return useMemo(() => {
        if (!enabled) return new Map();
        if (!processedActivities?.length || !climbs?.length) return new Map();
        if (!useWorker) return matchClimbsSync(processedActivities, climbs);
        if (workerResult.cacheKey === workerCacheKey) return workerResult.map;
        // Keep the last match map while the worker recomputes — avoids row height flicker in the log.
        if (workerResult.map.size > 0) return workerResult.map;
        return matchClimbsSync(processedActivities, climbs);
    }, [processedActivities, climbs, useWorker, workerResult, workerCacheKey, enabled]);
}
