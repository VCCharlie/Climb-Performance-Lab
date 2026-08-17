import { useState, useCallback } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { SPORT_TYPES } from '../config';
import { protectEnrichedFieldsOnMerge } from '../utils/firestoreActivityMerge';
import { stripUndefinedFields } from '../utils/mergeActivities';
import { enrichSelectedActivitiesFromStrava } from '../utils/stravaSelectedEnrich';
import {
    fetchStravaActivitiesInRange,
    linkIntervalsActivitiesToStravaList,
    applyStravaFuzzyMatchesToIntervals,
} from '../utils/stravaLinkIntervalsFetch';
import useIntervalsSync from './useIntervalsSync';
import { resolveDeviceProfileTitlesFromSettings } from '../utils/bikeComputerProfileTitles';
import { useToast } from '../context/ToastContext';
import { safeLocalStorageSet } from '../utils/safeStorage';
import { countMergeCategories, formatIntervalsSyncSummary } from '../utils/importSyncStats';

/**
 * Intervals.icu sync + fetch-new flows for DataHub (selected-row sync and date-range fetch).
 */
export function useDataHubIntervalsSync({
    intervalsConfig,
    activities,
    onImport,
    stravaGetToken,
    bulkSelectedIds,
    selectedActivitiesForBulk,
    userSettings,
}) {
    const deviceProfileTitles = resolveDeviceProfileTitlesFromSettings(userSettings);
    const { showToast } = useToast();

    const recordIntervalsSyncSuccess = useCallback(() => {
        const now = new Date().toISOString();
        safeLocalStorageSet(ACTIVITY_LOG_INTERVALS_LAST_SYNC_KEY, now);
        setLastIntervalsSyncAt(now);
    }, []);
    const { syncIntervals, isSyncing, syncProgress } = useIntervalsSync(intervalsConfig);
    const [syncStatus, setSyncStatus] = useState(null);
    const [syncErrorDetail, setSyncErrorDetail] = useState(null);
    const [lastIntervalsSyncAt, setLastIntervalsSyncAt] = useState(() => readLastIntervalsSyncAt());
    const [syncDates, setSyncDates] = useState(() => ({
        start: new Date(new Date().setDate(new Date().getDate() - 14)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
    }));
    const [syncMode, setSyncMode] = useState('fetch-range');
    const [sportFilters, setSportFilters] = useState(() =>
        SPORT_TYPES.reduce((acc, type) => ({ ...acc, [type]: true }), {}),
    );
    const [isFetchingNewIntervals, setIsFetchingNewIntervals] = useState(false);
    const [stravaEnrichEnabled, setStravaEnrichEnabled] = useState(true);

    const getSelectedSportTypes = useCallback(
        () => Object.keys(sportFilters).filter((k) => sportFilters[k]),
        [sportFilters],
    );

    const toggleSportFilter = useCallback((type) => {
        setSportFilters((prev) => ({ ...prev, [type]: !prev[type] }));
    }, []);

    const setAllSportFilters = useCallback((val) => {
        setSportFilters(SPORT_TYPES.reduce((acc, type) => ({ ...acc, [type]: val }), {}));
    }, []);

    const handleSync = useCallback(async (overrideBulkIds, overrideSelectedActs) => {
        const selectedIdSet = overrideBulkIds ?? bulkSelectedIds;
        const selectedActs = overrideSelectedActs ?? selectedActivitiesForBulk;

        if (selectedIdSet.size === 0) {
            setSyncStatus('error');
            setSyncErrorDetail('Select one or more activities (checkboxes), then use Refresh selected in the Intervals.icu sync panel.');
            setTimeout(() => setSyncStatus(null), 7000);
            return;
        }

        const selectedActsList = selectedActs;
        const dateParts = selectedActsList
            .reduce((acc, a) => {
                const dp = (a?.date && String(a.date).split('T')[0]) || '';
                if (dp) acc.push(dp);
                return acc;
            }, [])
            .sort();
        if (dateParts.length === 0) {
            setSyncStatus('error');
            setSyncErrorDetail('Selected activities have no valid date; cannot determine Intervals.icu range.');
            setTimeout(() => setSyncStatus(null), 7000);
            return;
        }

        const syncStart = dateParts[0];
        const syncEnd = dateParts[dateParts.length - 1];
        const bulkIdSet = new Set([...selectedIdSet].map(String));

        let working = selectedActsList.map((a) => ({ ...a }));

        setSyncStatus('started');
        setSyncErrorDetail(`Step 1/2: Intervals.icu ${syncStart} → ${syncEnd} (${selectedIdSet.size} selected)…`);

        try {
            const selectedTypes = getSelectedSportTypes();
            if (selectedTypes.length === 0) {
                setSyncStatus('error');
                setSyncErrorDetail('Select at least one sport type to sync.');
                showToast('Select at least one sport type to sync.', { variant: 'warning' });
                setTimeout(() => setSyncStatus(null), 7000);
                return;
            }

            const syncResult = await syncIntervals(syncStart, syncEnd, selectedTypes);
            const newActivitiesRaw = syncResult.activities || [];
            const newActivities = newActivitiesRaw.filter((a) => bulkIdSet.has(String(a.id)));

            const activitiesMap = new Map((activities || []).map((a) => [String(a.id), a]));

            const mergeNewInto = (act) => {
                const existing = activitiesMap.get(String(act.id));
                return existing ? protectEnrichedFieldsOnMerge(act, existing) : act;
            };
            const mergedNews = newActivities.map(mergeNewInto);

            const workingIndexMap = new Map();
            for (let i = 0; i < working.length; i++) {
                workingIndexMap.set(String(working[i].id), i);
            }

            for (const n of mergedNews) {
                const i = workingIndexMap.get(String(n.id));
                if (i !== undefined) {
                    working[i] = protectEnrichedFieldsOnMerge({ ...working[i], ...n }, working[i]);
                }
            }

            setSyncErrorDetail(
                mergedNews.length < newActivitiesRaw.length
                    ? `Step 2/2: ${mergedNews.length} of ${newActivitiesRaw.length} fetched id(s) match selection. Strava…`
                    : `Step 2/2: Strava link + segment refresh for ${selectedIdSet.size} selected ride(s)…`,
            );
            setSyncStatus('enriching');

            if (db && mergedNews.length > 0) {
                await Promise.all(
                    mergedNews.map((act) => {
                        const existing = activitiesMap.get(String(act.id));
                        const payload = protectEnrichedFieldsOnMerge(act, existing);
                        return setDoc(doc(db, 'activities', String(act.id)), payload, { merge: true });
                    }),
                );
            }
            if (mergedNews.length > 0) {
                onImport(mergedNews);
            }

            let enrichedLinkCount = 0;
            let segmentRefreshCount = 0;
            let detailFailed = 0;
            if (stravaEnrichEnabled && stravaGetToken) {
                try {
                    const token = await stravaGetToken();
                    if (token) {
                        const enrichResult = await enrichSelectedActivitiesFromStrava(working, token, {
                            forceStravaDetail: true,
                            concurrency: 3,
                            deviceProfileTitles,
                            onProgress: (m) => setSyncErrorDetail(String(m)),
                        });
                        enrichedLinkCount = enrichResult.linkedCount;
                        segmentRefreshCount = enrichResult.detailUpdatedCount;
                        detailFailed = enrichResult.failed;
                        if (enrichResult.updates.length > 0) {
                            const workingMap = new Map((working || []).map((a) => [String(a.id), a]));
                            if (db) {
                                await Promise.all(
                                    enrichResult.updates.map(({ id, data }) => {
                                        const strId = String(id);
                                        const existingRow = workingMap.get(strId) || activitiesMap.get(strId) || {};
                                        return setDoc(
                                            doc(db, 'activities', String(id)),
                                            protectEnrichedFieldsOnMerge(data, existingRow),
                                            { merge: true },
                                        );
                                    }),
                                );
                            }
                            const updatesMap = new Map(enrichResult.updates.map((u) => [String(u.id), u]));
                            for (let i = 0; i < working.length; i++) {
                                const strId = String(working[i].id);
                                const update = updatesMap.get(strId);
                                if (update) {
                                    const updated = stripUndefinedFields({ ...working[i], ...update.data });
                                    working[i] = updated;
                                    workingMap.set(strId, updated);
                                }
                            }
                            onImport(enrichResult.updates.map(({ id, data }) => {
                                const prev = workingMap.get(String(id)) || {};
                                return protectEnrichedFieldsOnMerge({ ...prev, ...data }, prev);
                            }));
                        }
                    }
                } catch (e) {
                    console.warn('[Sync] Strava enrich failed:', e);
                }
            }

            onImport(working);

            recordIntervalsSyncSuccess();
            setSyncStatus('done');
            const parts = [];
            if (mergedNews.length > 0) parts.push(`${mergedNews.length} Intervals row(s) saved`);
            if (newActivitiesRaw.length > mergedNews.length) {
                parts.push(`${newActivitiesRaw.length - mergedNews.length} fetched id(s) not in selection`);
            }
            if (enrichedLinkCount > 0) parts.push(`${enrichedLinkCount} Strava link update(s)`);
            if (segmentRefreshCount > 0) parts.push(`${segmentRefreshCount} Strava detail + segment refresh`);
            if (detailFailed > 0) parts.push(`${detailFailed} detail error(s)`);
            setSyncErrorDetail(
                parts.length > 0
                    ? `✅ Sync complete. ${parts.join(' · ')}.`
                    : '✅ Sync complete. No Intervals changes for selected ids; Strava refresh attempted.',
            );
            showToast(
                parts.length > 0
                    ? `Sync complete. ${parts.join(' · ')}.`
                    : 'Sync complete. No Intervals changes for selected rows.',
                { variant: 'success' },
            );
            setTimeout(() => setSyncStatus(null), 9000);
        } catch (e) {
            console.error('Sync failed:', e);
            setSyncStatus('error');
            setSyncErrorDetail(`❌ Error: ${e.message}`);
            showToast(e.message || 'Sync failed.', { variant: 'error', durationMs: 10000 });
        }
    }, [
        bulkSelectedIds,
        selectedActivitiesForBulk,
        activities,
        syncIntervals,
        stravaGetToken,
        onImport,
        deviceProfileTitles,
        getSelectedSportTypes,
        showToast,
        stravaEnrichEnabled,
        recordIntervalsSyncSuccess,
    ]);

    const fetchAndMergeIntervalsRange = useCallback(async (syncStart, syncEnd) => {
        if (!syncStart || !syncEnd) {
            setSyncStatus('error');
            setSyncErrorDetail('Choose a valid From and To date for fetching new activities.');
            setTimeout(() => setSyncStatus(null), 7000);
            return;
        }
        if (syncStart > syncEnd) {
            setSyncStatus('error');
            setSyncErrorDetail('From date must be on or before To date.');
            setTimeout(() => setSyncStatus(null), 7000);
            return;
        }

        setIsFetchingNewIntervals(true);
        setSyncStatus('started');
        setSyncErrorDetail(`Fetching Intervals.icu ${syncStart} → ${syncEnd}…`);

        try {
            const selectedTypes = getSelectedSportTypes();
            if (selectedTypes.length === 0) {
                setSyncStatus('error');
                setSyncErrorDetail('Select at least one sport type to sync.');
                showToast('Select at least one sport type to sync.', { variant: 'warning' });
                setTimeout(() => setSyncStatus(null), 7000);
                return;
            }
            const syncResult = await syncIntervals(syncStart, syncEnd, selectedTypes);
            const newActivitiesRaw = syncResult.activities || [];
            const syncStats = syncResult.stats;
            const mergeCounts = countMergeCategories(newActivitiesRaw, activities);

            const activitiesMap = new Map((activities || []).map((a) => [String(a.id), a]));

            const mergeNewInto = (act) => {
                const existing = activitiesMap.get(String(act.id));
                return existing ? protectEnrichedFieldsOnMerge(act, existing) : act;
            };
            let merged = (newActivitiesRaw || []).map(mergeNewInto);

            if (stravaEnrichEnabled && stravaGetToken && merged.length > 0) {
                setSyncErrorDetail(`Linking Strava for ${syncStart} → ${syncEnd}…`);
                try {
                    const token = await stravaGetToken();
                    if (token) {
                        const stravaList = await fetchStravaActivitiesInRange(token, syncStart, syncEnd);
                        merged = linkIntervalsActivitiesToStravaList(merged, stravaList);
                        applyStravaFuzzyMatchesToIntervals(merged, stravaList);
                    }
                } catch (err) {
                    console.warn('[Fetch new] Strava list / link failed:', err);
                }
            }

            if (merged.length > 0 && db) {
                await Promise.all(
                    merged.map((act) => {
                        const existing = activitiesMap.get(String(act.id));
                        const payload = protectEnrichedFieldsOnMerge(act, existing);
                        return setDoc(doc(db, 'activities', String(act.id)), payload, { merge: true });
                    }),
                );
            }
            if (merged.length > 0) {
                onImport(merged);
            }

            let enrichCount = 0;
            let segmentRefreshCount = 0;
            let detailFailed = 0;
            if (stravaEnrichEnabled && stravaGetToken && merged.length > 0) {
                setSyncStatus('enriching');
                setSyncErrorDetail('Strava: auto-link + gear/HR/RPE/KOM for fetched rides…');
                try {
                    const token = await stravaGetToken();
                    if (token) {
                        const enrichResult = await enrichSelectedActivitiesFromStrava(merged, token, {
                            forceStravaDetail: true,
                            concurrency: 3,
                            deviceProfileTitles,
                            onProgress: (m) => setSyncErrorDetail(String(m)),
                        });
                        enrichCount = enrichResult.updates.length;
                        segmentRefreshCount = enrichResult.detailUpdatedCount;
                        detailFailed = enrichResult.failed;
                        if (enrichResult.updates.length > 0) {
                            const mergedMap = new Map((merged || []).map((a) => [String(a.id), a]));
                            if (db) {
                                await Promise.all(
                                    enrichResult.updates.map(({ id, data }) => {
                                        const strId = String(id);
                                        const existingRow = mergedMap.get(strId) || activitiesMap.get(strId) || {};
                                        return setDoc(
                                            doc(db, 'activities', String(id)),
                                            protectEnrichedFieldsOnMerge(data, existingRow),
                                            { merge: true },
                                        );
                                    }),
                                );
                            }
                            const updatesMap = new Map(enrichResult.updates.map((u) => [String(u.id), u]));
                            for (let i = 0; i < merged.length; i++) {
                                const strId = String(merged[i].id);
                                const update = updatesMap.get(strId);
                                if (update) {
                                    const updatedData = stripUndefinedFields({ ...merged[i], ...update.data });
                                    merged[i] = updatedData;
                                    mergedMap.set(strId, updatedData);
                                }
                            }
                            onImport(enrichResult.updates.map(({ id, data }) => {
                                const prev = mergedMap.get(String(id)) || {};
                                return protectEnrichedFieldsOnMerge({ ...prev, ...data }, prev);
                            }));
                        }
                    }
                } catch (e) {
                    console.warn('[Fetch new] Strava enrich failed:', e);
                }
                onImport(merged);
            }

            recordIntervalsSyncSuccess();
            setSyncStatus('done');
            const summary = formatIntervalsSyncSummary(syncStats, mergeCounts);
            const parts = [summary];
            if (stravaEnrichEnabled && stravaGetToken && merged.length > 0) {
                parts.push('Strava link + enrich');
                if (enrichCount > 0) parts.push(`${enrichCount} field update(s) from Strava`);
                if (segmentRefreshCount > 0) parts.push(`${segmentRefreshCount} detail/KOM refresh`);
                if (detailFailed > 0) parts.push(`${detailFailed} detail error(s)`);
            } else if (merged.length > 0 && !stravaEnrichEnabled) {
                parts.push('Strava enrich skipped');
            } else if (merged.length > 0) {
                parts.push('connect Strava in Settings for auto-link + details');
            }
            const detailText = merged.length > 0
                ? `✅ ${parts.join(' · ')}.`
                : summary;
            setSyncErrorDetail(detailText);
            showToast(
                merged.length > 0 ? parts.join(' · ') : summary,
                { variant: merged.length > 0 ? 'success' : 'info' },
            );
            setTimeout(() => setSyncStatus(null), 9000);
        } catch (e) {
            console.error('Fetch new from Intervals failed:', e);
            setSyncStatus('error');
            setSyncErrorDetail(`❌ ${e.message || e}`);
            showToast(e.message || 'Intervals fetch failed.', { variant: 'error', durationMs: 10000 });
            setTimeout(() => setSyncStatus(null), 10000);
        } finally {
            setIsFetchingNewIntervals(false);
        }
    }, [
        syncIntervals,
        activities,
        stravaGetToken,
        onImport,
        deviceProfileTitles,
        getSelectedSportTypes,
        showToast,
        stravaEnrichEnabled,
        recordIntervalsSyncSuccess,
    ]);

    const handleFetchNewFromIntervals = useCallback(async () => {
        return fetchAndMergeIntervalsRange(syncDates.start, syncDates.end);
    }, [fetchAndMergeIntervalsRange, syncDates.start, syncDates.end]);

    const handleRunSync = useCallback((overrideBulkIds, overrideSelectedActs) => {
        if (syncMode === 'refresh-selected') {
            return handleSync(overrideBulkIds, overrideSelectedActs);
        }
        return handleFetchNewFromIntervals();
    }, [syncMode, handleSync, handleFetchNewFromIntervals]);

    return {
        syncStatus,
        syncErrorDetail,
        syncDates,
        setSyncDates,
        fetchIntervalsDates: syncDates,
        setFetchIntervalsDates: setSyncDates,
        syncMode,
        setSyncMode,
        sportFilters,
        toggleSportFilter,
        setAllSportFilters,
        stravaEnrichEnabled,
        setStravaEnrichEnabled,
        handleRunSync,
        isFetchingNewIntervals,
        handleSync,
        handleFetchNewFromIntervals,
        fetchAndMergeIntervalsRange,
        isSyncing,
        syncProgress,
        lastIntervalsSyncAt,
    };
}
