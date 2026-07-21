import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { protectEnrichedFieldsOnMerge } from '../utils/firestoreActivityMerge';
import { enrichSelectedActivitiesFromStrava } from '../utils/stravaSelectedEnrich';
import { activityLikelyNeedsStravaTitle } from '../utils/stravaTitleHeuristics';
import { devLog } from '../utils/safeLog';

/** Background auto-enrich window (days) — keep small to avoid Strava 429s. */
const AUTO_ENRICH_LOOKBACK_DAYS = 7;

const RATE_LIMIT_NOTICE =
    'Strava is temporarily limiting requests. Titles and details may update later — try again in about 15 minutes.';

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
}) {
    const [showStravaEnrichPanel, setShowStravaEnrichPanel] = useState(false);
    const [stravaDateOverride, setStravaDateOverride] = useState(null);
    const [enrichmentTarget, setEnrichmentTarget] = useState(null);
    const [stravaListProgress, setStravaListProgress] = useState(null);
    const [stravaAutoEnrichNotice, setStravaAutoEnrichNotice] = useState(null);
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

    const stravaSearchDates = useMemo(() => ({
        startDate: stravaDateOverride || startDate,
        endDate: stravaDateOverride || endDate,
    }), [stravaDateOverride, startDate, endDate]);

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
                onRateLimit: () => {
                    setStravaAutoEnrichNotice(RATE_LIMIT_NOTICE);
                },
                onProgress: (m) => {
                    if (String(m).includes('page')) {
                        setStravaListProgress((prev) => ({ page: prev?.page || 1, bikeCount: prev?.bikeCount || 0 }));
                    }
                },
            });
            setStravaListProgress(null);

            if (result.rateLimitHits > 0) {
                setStravaAutoEnrichNotice(RATE_LIMIT_NOTICE);
            }

            if (result.updates.length > 0 && db) {
                await Promise.all(
                    result.updates.map(({ id, data }) =>
                        setDoc(doc(db, 'activities', String(id)), data, { merge: true }),
                    ),
                );
                return result.updates.length;
            }
        } catch (err) {
            console.error('[Silent Enrichment] Failed:', err);
            setStravaListProgress(null);
            if (err?.message && /rate limit|429/i.test(err.message)) {
                setStravaAutoEnrichNotice(RATE_LIMIT_NOTICE);
                throw err;
            }
        }
        return 0;
    }, [stravaGetToken, startDate, endDate]);

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
            const missingStravaTitle = activityLikelyNeedsStravaTitle(act);
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
    }, [stravaGetToken, activities, performSilentStravaEnrichment]);

    const handleImportFromStrava = useCallback(async (newActs) => {
        if (!newActs || newActs.length === 0) return;
        onImport(newActs);
        if (db) {
            try {
                const activitiesMap = new Map((activities || []).map((a) => [String(a.id), a]));

                await Promise.all(newActs.map((act) => {
                    const existing = activitiesMap.get(String(act.id));
                    const payload = protectEnrichedFieldsOnMerge(act, existing);
                    return setDoc(doc(db, 'activities', String(act.id)), payload, { merge: true });
                }));
            } catch (e) {
                console.error('Strava import Firestore error:', e);
            }
        }
    }, [activities, onImport]);

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
        handleImportFromStrava,
        performSilentStravaEnrichment,
    };
}
