import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { buildActivityFirestoreMergePayload } from '../utils/activityFirestoreWrite.js';
import { resolveOwnerUid } from '../utils/activityOwnership.js';
import { enrichSelectedActivitiesFromStrava } from '../utils/stravaSelectedEnrich';
import { activityLikelyNeedsStravaTitle } from '../utils/stravaTitleHeuristics';
import { buildMergeProtectOpts } from '../utils/mergeProtectOptions.js';
import { devLog } from '../utils/safeLog';
import {
    readStravaEnrichPendingQueue,
    reconcileStravaEnrichPendingQueue,
    removeStravaEnrichPendingIds,
    writeStravaEnrichPendingQueue,
    formatStravaEnrichRetryGuidance,
} from '../utils/stravaEnrichPendingQueue';

/** Background auto-enrich window (days) — keep small to avoid Strava 429s. */
const AUTO_ENRICH_LOOKBACK_DAYS = 7;

/**
 * Strava silent/auto enrichment and per-activity "Find on Strava" panel state (Bolt 3d-bis follow-up).
 */
export function useDataHubStravaEnrich({
    stravaGetToken,
    activities,
    startDate,
    endDate,
    onImport,
    onBeforeOpenPanel,
    userSettings,
}) {
    const [showStravaEnrichPanel, setShowStravaEnrichPanel] = useState(false);
    const [stravaDateOverride, setStravaDateOverride] = useState(null);
    const [enrichmentTarget, setEnrichmentTarget] = useState(null);
    const [stravaListProgress, setStravaListProgress] = useState(null);
    const [stravaAutoEnrichNotice, setStravaAutoEnrichNotice] = useState(null);
    const [stravaEnrichPending, setStravaEnrichPending] = useState(() => readStravaEnrichPendingQueue());
    const [pendingRetryMessage, setPendingRetryMessage] = useState(null);
    const [isRetryingPendingEnrich, setIsRetryingPendingEnrich] = useState(false);
    const autoEnrichRanRef = useRef(false);

    const dismissStravaAutoEnrichNotice = useCallback(() => {
        setStravaAutoEnrichNotice(null);
    }, []);

    const handleFindOnStrava = useCallback((activity) => {
        if (!activity || !activity.date) return;
        onBeforeOpenPanel?.();
        const activityDate = activity.date.split('T')[0];
        setEnrichmentTarget(activity);
        setStravaDateOverride(activityDate);
        setShowStravaEnrichPanel(true);
    }, [onBeforeOpenPanel]);

    const closeStravaEnrichPanel = useCallback(() => {
        setShowStravaEnrichPanel(false);
        setStravaDateOverride(null);
        setEnrichmentTarget(null);
    }, []);

    /** Open Link to Strava overlay focused on Pending enrich (no single-activity target). */
    const openStravaEnrichPendingPanel = useCallback(() => {
        if (!stravaGetToken) return;
        onBeforeOpenPanel?.();
        setEnrichmentTarget(null);
        setStravaDateOverride(null);
        setShowStravaEnrichPanel(true);
    }, [stravaGetToken, onBeforeOpenPanel]);

    const stravaSearchDates = useMemo(() => ({
        startDate: stravaDateOverride || startDate,
        endDate: stravaDateOverride || endDate,
    }), [stravaDateOverride, startDate, endDate]);

    const mergeProtectOpts = useMemo(
        () => buildMergeProtectOpts(userSettings),
        [userSettings?.bikeComputerProfileTitles, userSettings?.syncDataSourcePrefs],
    );
    const deviceProfileTitles = mergeProtectOpts.deviceProfileTitles;

    const persistEnrichUpdates = useCallback(async (result, inRange) => {
        if (!result?.updates?.length || !db) return 0;
        const activitiesMap = new Map((activities || []).map((a) => [String(a.id), a]));
        const mergedUpdates = result.updates.map(({ id, data }) => {
            const existing = activitiesMap.get(String(id));
            const payload = buildActivityFirestoreMergePayload(
                data,
                existing,
                mergeProtectOpts,
                resolveOwnerUid(),
            );
            return { id, payload, merged: existing ? { ...existing, ...payload } : payload };
        });
        await Promise.all(
            mergedUpdates.map(({ id, payload }) =>
                setDoc(doc(db, 'activities', String(id)), payload, { merge: true }),
            ),
        );
        onImport(mergedUpdates.map(({ merged }) => merged));
        return result.updates.length;
    }, [activities, mergeProtectOpts, onImport]);

    const applyEnrichResultSideEffects = useCallback((inRange, result) => {
        const queue = reconcileStravaEnrichPendingQueue(inRange, result, deviceProfileTitles);
        setStravaEnrichPending(queue);

        if (result.rateLimitHits > 0 || queue.length > 0) {
            setStravaAutoEnrichNotice(formatStravaEnrichRetryGuidance({
                pendingCount: queue.length,
                rateLimitHits: result.rateLimitHits,
                partialSaved: result.updates?.length > 0,
            }));
        }
        return queue;
    }, [deviceProfileTitles]);

    const performSilentStravaEnrichment = useCallback(async (actsToEnrich, customStart, customEnd) => {
        if (!stravaGetToken) return 0;
        try {
            const token = await stravaGetToken();
            if (!token) return 0;

            const start = customStart || startDate;
            const end = customEnd || endDate;
            const inRange = (actsToEnrich || []).filter((act) => {
                const actDate = act.date?.split('T')[0];
                return actDate && actDate >= start && actDate <= end;
            });
            if (inRange.length === 0) return 0;

            setStravaListProgress({ page: 1, bikeCount: 0 });
            const result = await enrichSelectedActivitiesFromStrava(inRange, token, {
                skipShortNoPowerRides: true,
                forceStravaDetail: false,
                concurrency: 2,
                deviceProfileTitles,
                dataSourcePrefs: mergeProtectOpts.dataSourcePrefs,
                onRateLimit: (hits) => {
                    setStravaAutoEnrichNotice(formatStravaEnrichRetryGuidance({
                        pendingCount: stravaEnrichPending.length,
                        rateLimitHits: hits,
                    }));
                },
                onProgress: (m) => {
                    if (String(m).includes('page')) {
                        setStravaListProgress((prev) => ({ page: prev?.page || 1, bikeCount: prev?.bikeCount || 0 }));
                    }
                },
            });
            setStravaListProgress(null);

            applyEnrichResultSideEffects(inRange, result);
            const saved = await persistEnrichUpdates(result, inRange);
            return saved;
        } catch (err) {
            console.error('[Silent Enrichment] Failed:', err);
            setStravaListProgress(null);
            if (err?.message && /rate limit|429/i.test(err.message)) {
                setStravaAutoEnrichNotice(formatStravaEnrichRetryGuidance({
                    pendingCount: stravaEnrichPending.length,
                    rateLimitHits: 1,
                }));
                throw err;
            }
            setStravaAutoEnrichNotice(
                err?.message || 'Strava enrichment failed. Connect Strava in Settings and try again.',
            );
        }
        return 0;
    }, [
        stravaGetToken,
        startDate,
        endDate,
        mergeProtectOpts,
        applyEnrichResultSideEffects,
        persistEnrichUpdates,
        stravaEnrichPending.length,
    ]);

    const retryStravaEnrichPending = useCallback(async () => {
        if (!stravaGetToken || stravaEnrichPending.length === 0) return;
        setIsRetryingPendingEnrich(true);
        setPendingRetryMessage('Retrying pending rides…');
        try {
            const token = await stravaGetToken();
            if (!token) {
                setPendingRetryMessage('Could not get Strava token.');
                return;
            }
            const idSet = new Set(stravaEnrichPending.map((e) => e.activityId));
            const subset = (activities || []).filter((a) => idSet.has(String(a.id)));
            if (subset.length === 0) {
                setPendingRetryMessage('Pending rides are not in the current activity list.');
                return;
            }
            const result = await enrichSelectedActivitiesFromStrava(subset, token, {
                concurrency: 2,
                forceStravaDetail: true,
                deviceProfileTitles,
                dataSourcePrefs: mergeProtectOpts.dataSourcePrefs,
                onProgress: (m) => setPendingRetryMessage(String(m)),
            });
            await persistEnrichUpdates(result, subset);
            const queue = applyEnrichResultSideEffects(subset, result);
            if (queue.length === 0) {
                setPendingRetryMessage('All pending rides enriched.');
            } else {
                setPendingRetryMessage(formatStravaEnrichRetryGuidance({
                    pendingCount: queue.length,
                    rateLimitHits: result.rateLimitHits,
                    partialSaved: result.updates?.length > 0,
                }));
            }
        } catch (e) {
            setPendingRetryMessage(`Retry failed: ${e.message || e}`);
        } finally {
            setIsRetryingPendingEnrich(false);
        }
    }, [
        stravaGetToken,
        stravaEnrichPending,
        activities,
        deviceProfileTitles,
        persistEnrichUpdates,
        applyEnrichResultSideEffects,
    ]);

    const dismissPendingEnrichEntry = useCallback((activityId) => {
        const next = removeStravaEnrichPendingIds([activityId]);
        setStravaEnrichPending(next);
    }, []);

    const clearStravaEnrichPending = useCallback(() => {
        writeStravaEnrichPendingQueue([]);
        setStravaEnrichPending([]);
        setPendingRetryMessage(null);
    }, []);

    useEffect(() => {
        const refresh = () => setStravaEnrichPending(readStravaEnrichPendingQueue());
        refresh();
        window.addEventListener('cpl-strava-enrich-pending-updated', refresh);
        return () => window.removeEventListener('cpl-strava-enrich-pending-updated', refresh);
    }, [activities?.length]);

    useEffect(() => {
        if (autoEnrichRanRef.current) return;
        if (!stravaGetToken || !activities || activities.length === 0) return;

        const lookbackStart = new Date();
        lookbackStart.setDate(lookbackStart.getDate() - AUTO_ENRICH_LOOKBACK_DAYS);
        const cutoff = lookbackStart.toISOString().split('T')[0];

        const needsEnrichment = activities.filter((act) => {
            const actDate = act.date?.split('T')[0];
            if (!actDate || actDate < cutoff) return false;
            const missingHr = !act.avg_hr || act.avg_hr === 0;
            const missingRpe = !act.rpe || act.rpe === 0;
            const missingStravaId = !act.strava_id;
            const missingStravaTitle = activityLikelyNeedsStravaTitle(act, deviceProfileTitles);
            return missingHr || missingRpe || missingStravaId || missingStravaTitle;
        });

        if (needsEnrichment.length === 0) return;

        autoEnrichRanRef.current = true;

        const autoEnd = new Date().toISOString().split('T')[0];

        devLog(`[Auto-Enrichment] ${needsEnrichment.length} activities need Strava data, starting background enrichment…`);
        const timer = window.setTimeout(() => {
            performSilentStravaEnrichment(needsEnrichment, cutoff, autoEnd).then((count) => {
                if (count > 0) {
                    devLog(`[Auto-Enrichment] Enriched ${count} activities with Strava data.`);
                }
            }).catch((err) => {
                console.warn('[Auto-Enrichment] Background enrichment failed:', err.message);
            });
        }, 0);

        return () => window.clearTimeout(timer);
    }, [stravaGetToken, activities, performSilentStravaEnrichment, deviceProfileTitles]);

    const handleImportFromStrava = useCallback(async (newActs) => {
        if (!newActs || newActs.length === 0) return;
        onImport(newActs);
        if (db) {
            try {
                const activitiesMap = new Map((activities || []).map((a) => [String(a.id), a]));

                await Promise.all(newActs.map((act) => {
                    const existing = activitiesMap.get(String(act.id));
                    const payload = buildActivityFirestoreMergePayload(
                        act,
                        existing,
                        mergeProtectOpts,
                        resolveOwnerUid(),
                    );
                    return setDoc(doc(db, 'activities', String(act.id)), payload, { merge: true });
                }));
            } catch (e) {
                console.error('Strava import Firestore error:', e);
            }
        }
    }, [activities, onImport, mergeProtectOpts]);

    return {
        showStravaEnrichPanel,
        setShowStravaEnrichPanel,
        closeStravaEnrichPanel,
        enrichmentTarget,
        stravaSearchDates,
        stravaListProgress,
        stravaAutoEnrichNotice,
        dismissStravaAutoEnrichNotice,
        handleFindOnStrava,
        openStravaEnrichPendingPanel,
        handleImportFromStrava,
        performSilentStravaEnrichment,
        stravaEnrichPending,
        retryStravaEnrichPending,
        dismissPendingEnrichEntry,
        clearStravaEnrichPending,
        pendingRetryMessage,
        isRetryingPendingEnrich,
    };
}
