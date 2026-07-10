import { useState, useMemo, useCallback } from 'react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { runInBatches } from '../utils';
import { protectEnrichedFieldsOnMerge } from '../utils/firestoreActivityMerge';
import { activitiesToCsv } from '../utils/activityCsvExport';
import {
    mergeActivitiesIntervalsPrimary,
    isStravaOnlyActivityId,
    isLikelyIntervalsActivityId,
    stripUndefinedFields,
} from '../utils/mergeActivities';
import { enrichActivityGearFromStrava } from '../utils/stravaGearEnrich';
import { enrichSelectedActivitiesFromStrava } from '../utils/stravaSelectedEnrich';
import { formatNlNumber } from '../utils/formatters';

/**
 * Bulk selection and batch operations for the Activity Log (edit, export, delete, merge, Strava enrich).
 */
export function useDataHubBulkActions({
    activities,
    onDelete,
    onImport,
    stravaGetToken,
    visibleActivityIdsFlat,
    setIsDeleting,
}) {
    const [bulkSelectedIds, setBulkSelectedIds] = useState(() => new Set());
    const [showMergeModal, setShowMergeModal] = useState(false);
    const [mergeError, setMergeError] = useState(null);
    const [isMerging, setIsMerging] = useState(false);
    const [showBulkEditModal, setShowBulkEditModal] = useState(false);
    const [isBulkSaving, setIsBulkSaving] = useState(false);
    const [isStravaEnriching, setIsStravaEnriching] = useState(false);
    const [stravaEnrichMsg, setStravaEnrichMsg] = useState(null);

    const allVisibleSelected = useMemo(
        () => visibleActivityIdsFlat.length > 0
            && visibleActivityIdsFlat.every((id) => bulkSelectedIds.has(id)),
        [visibleActivityIdsFlat, bulkSelectedIds],
    );

    const toggleBulkSelectOne = useCallback((id) => {
        const k = String(id);
        setBulkSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(k)) next.delete(k);
            else next.add(k);
            return next;
        });
    }, []);

    const toggleSelectAllVisible = useCallback(() => {
        setBulkSelectedIds((prev) => {
            if (visibleActivityIdsFlat.length === 0) return new Set();
            const allOn = visibleActivityIdsFlat.every((id) => prev.has(id));
            if (allOn) {
                const next = new Set(prev);
                visibleActivityIdsFlat.forEach((id) => next.delete(id));
                return next;
            }
            const next = new Set(prev);
            visibleActivityIdsFlat.forEach((id) => next.add(id));
            return next;
        });
    }, [visibleActivityIdsFlat]);

    const selectedActivitiesForBulk = useMemo(
        () => (activities || []).filter((a) => bulkSelectedIds.has(String(a.id))),
        [activities, bulkSelectedIds],
    );

    const exportBulkCsv = useCallback(() => {
        if (selectedActivitiesForBulk.length === 0) return;
        const csv = activitiesToCsv(selectedActivitiesForBulk);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `activities-export-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, [selectedActivitiesForBulk]);

    const confirmBulkDeleteSelected = useCallback(async () => {
        const ids = [...bulkSelectedIds];
        if (ids.length === 0) return;
        const n = ids.length;
        if (!window.confirm(`Delete ${n} activit${n === 1 ? 'y' : 'ies'}? This cannot be undone.`)) return;
        setIsDeleting?.(true);
        try {
            ids.forEach((id) => onDelete(id));
            if (db) {
                await Promise.all(ids.map((id) => deleteDoc(doc(db, 'activities', String(id)))));
            }
            setBulkSelectedIds(new Set());
        } catch (e) {
            alert(`Could not delete: ${e.message || e}`);
        } finally {
            setIsDeleting?.(false);
        }
    }, [bulkSelectedIds, onDelete, setIsDeleting]);

    const mergePairPreview = useMemo(() => {
        if (selectedActivitiesForBulk.length !== 2) return null;
        const [x, y] = selectedActivitiesForBulk;
        let intervals = null;
        let stravaSide = null;
        if (isLikelyIntervalsActivityId(x.id) && isStravaOnlyActivityId(y.id)) {
            intervals = x;
            stravaSide = y;
        } else if (isLikelyIntervalsActivityId(y.id) && isStravaOnlyActivityId(x.id)) {
            intervals = y;
            stravaSide = x;
        } else if (!String(x.id).startsWith('strava_') && String(y.id).startsWith('strava_')) {
            intervals = x;
            stravaSide = y;
        } else if (!String(y.id).startsWith('strava_') && String(x.id).startsWith('strava_')) {
            intervals = y;
            stravaSide = x;
        } else {
            return { error: 'Select one Intervals activity and one Strava-import row (id strava_…), or pick one non-strava_ id and one strava_ id.' };
        }
        if (String(intervals.id) === String(stravaSide.id)) {
            return { error: 'Cannot merge an activity with itself.' };
        }
        try {
            const merged = mergeActivitiesIntervalsPrimary(intervals, stravaSide);
            return { intervals, stravaSide, merged };
        } catch (e) {
            return { error: e.message || 'Merge failed' };
        }
    }, [selectedActivitiesForBulk]);

    const confirmMergePair = useCallback(async () => {
        if (!mergePairPreview || mergePairPreview.error || !mergePairPreview.merged) return;
        const { intervals, stravaSide, merged } = mergePairPreview;
        setIsMerging(true);
        setMergeError(null);
        try {
            let finalMerged = merged;
            if (stravaGetToken && merged.strava_id) {
                try {
                    const token = await stravaGetToken();
                    if (token) {
                        finalMerged = await enrichActivityGearFromStrava(merged, stravaSide, token);
                    }
                } catch (gearErr) {
                    console.warn('[Merge] Strava gear / detail enrich failed:', gearErr);
                }
            }
            if (db) {
                await setDoc(doc(db, 'activities', String(intervals.id)), finalMerged, { merge: true });
                await deleteDoc(doc(db, 'activities', String(stravaSide.id)));
            }
            onImport([finalMerged]);
            onDelete(stravaSide.id);
            setBulkSelectedIds(new Set());
            setShowMergeModal(false);
        } catch (e) {
            setMergeError(e.message || 'Merge failed');
        } finally {
            setIsMerging(false);
        }
    }, [mergePairPreview, stravaGetToken, onImport, onDelete]);

    const persistStravaEnrichUpdates = useCallback(async (updates, sourceList) => {
        if (!updates?.length) return;
        const sourceMap = new Map((sourceList || []).map((a) => [String(a.id), a]));
        const activitiesMap = new Map((activities || []).map((a) => [String(a.id), a]));
        const CHUNK = 25;
        for (let i = 0; i < updates.length; i += CHUNK) {
            const slice = updates.slice(i, i + CHUNK);
            if (db) {
                await Promise.all(
                    slice.map(({ id, data }) => {
                        const prev = sourceMap.get(String(id)) || activitiesMap.get(String(id)) || {};
                        return setDoc(
                            doc(db, 'activities', String(id)),
                            protectEnrichedFieldsOnMerge(data, prev),
                            { merge: true },
                        );
                    }),
                );
            }
            const mergedObjs = slice.map(({ id, data }) => {
                const prev = sourceMap.get(String(id)) || activitiesMap.get(String(id)) || {};
                return protectEnrichedFieldsOnMerge({ ...prev, ...data }, prev);
            });
            onImport(mergedObjs);
        }
    }, [activities, onImport]);

    const runStravaEnrichSelected = useCallback(async (subset) => {
        const list = subset && subset.length > 0 ? subset : [];
        if (!stravaGetToken) return;
        if (list.length === 0) {
            setStravaEnrichMsg('Select one or more activities (row checkboxes), then run Strava enrich.');
            return;
        }
        setIsStravaEnriching(true);
        setStravaEnrichMsg('Starting…');
        try {
            const token = await stravaGetToken();
            if (!token) {
                setStravaEnrichMsg('Could not get Strava token.');
                return;
            }
            const {
                updates,
                linkedCount,
                detailUpdatedCount,
                ridesProcessed,
                unchanged,
                failed,
            } = await enrichSelectedActivitiesFromStrava(list, token, {
                concurrency: 3,
                forceStravaDetail: true,
                onProgress: (m) => setStravaEnrichMsg(m),
            });
            if (updates.length === 0) {
                if (failed > 0) {
                    setStravaEnrichMsg(
                        `No fields updated (${formatNlNumber(failed)} Strava request(s) failed — check connection or rate limits). ${formatNlNumber(unchanged)} ride(s) already matched Strava.`,
                    );
                } else if (ridesProcessed === 0 && linkedCount === 0) {
                    setStravaEnrichMsg(
                        'No matching Strava bike activities found for the selected date span. Try linking manually via Find on Strava on a single row.',
                    );
                } else {
                    setStravaEnrichMsg(
                        `Nothing new from Strava for ${formatNlNumber(unchanged || list.length)} selected ride(s) — link, gear, route, HR, RPE, and segments already match.`,
                    );
                }
                return;
            }
            setStravaEnrichMsg(`Writing ${updates.length} activities…`);
            await persistStravaEnrichUpdates(updates, list);
            const parts = [];
            if (linkedCount > 0) parts.push(`${formatNlNumber(linkedCount)} newly linked`);
            if (detailUpdatedCount > 0) parts.push(`${formatNlNumber(detailUpdatedCount)} detail refresh`);
            setStravaEnrichMsg(
                `Done: updated ${formatNlNumber(updates.length)} selected ride(s) from Strava`
                + (parts.length ? ` (${parts.join(', ')})` : '')
                + ' — gear, route, HR, RPE, and segment badges when Strava returns them.',
            );
        } catch (e) {
            console.error('[Strava enrich]', e);
            setStravaEnrichMsg(`Error: ${e.message || e}`);
        } finally {
            setIsStravaEnriching(false);
        }
    }, [stravaGetToken, persistStravaEnrichUpdates]);

    const markBulkRecovery = useCallback(async () => {
        if (selectedActivitiesForBulk.length === 0) return;
        const LOW_TSS = 35;
        try {
            if (db) {
                await Promise.all(
                    selectedActivitiesForBulk.map((act) =>
                        setDoc(doc(db, 'activities', String(act.id)), { load: LOW_TSS }, { merge: true })
                    )
                );
            }
            onImport(
                selectedActivitiesForBulk.map((a) => ({
                    ...a,
                    load: LOW_TSS,
                }))
            );
            setBulkSelectedIds(new Set());
        } catch (e) {
            alert('Could not update activities: ' + e.message);
        }
    }, [selectedActivitiesForBulk, onImport]);

    const handleBulkApplyPatch = useCallback(async (patch) => {
        const list = selectedActivitiesForBulk;
        if (!list.length || !patch || typeof patch !== 'object') return;

        setIsBulkSaving(true);
        try {
            let token = null;
            const mayEnrichGear = 'gear_id' in patch || 'gear_name' in patch;
            if (stravaGetToken && mayEnrichGear && list.some((a) => a?.strava_id)) {
                try {
                    token = await stravaGetToken();
                } catch {
                    token = null;
                }
            }

            const activitiesMap = new Map((activities || []).map((a) => [String(a.id), a]));

            const results = await runInBatches(list, 15, async (act) => {
                const prev = activitiesMap.get(String(act.id)) || act;
                let toSave = stripUndefinedFields({ ...prev, ...patch });
                if (token && toSave.strava_id) {
                    try {
                        toSave = await enrichActivityGearFromStrava(toSave, null, token);
                    } catch (gearErr) {
                        console.warn('[Bulk edit] Strava enrich failed:', gearErr);
                    }
                }
                if (db) {
                    await setDoc(doc(db, 'activities', String(toSave.id)), toSave, { merge: true });
                }
                return toSave;
            });

            onImport(results);
            setBulkSelectedIds(new Set());
            setShowBulkEditModal(false);
        } catch (e) {
            alert(`Could not apply bulk edit: ${e.message || e}`);
        } finally {
            setIsBulkSaving(false);
        }
    }, [selectedActivitiesForBulk, activities, onImport, stravaGetToken]);

    const openMergeModal = useCallback(() => {
        setMergeError(null);
        setShowMergeModal(true);
    }, []);

    const closeMergeModal = useCallback(() => {
        setShowMergeModal(false);
        setMergeError(null);
    }, []);

    return {
        bulkSelectedIds,
        setBulkSelectedIds,
        allVisibleSelected,
        toggleBulkSelectOne,
        toggleSelectAllVisible,
        selectedActivitiesForBulk,
        exportBulkCsv,
        confirmBulkDeleteSelected,
        mergePairPreview,
        showMergeModal,
        mergeError,
        isMerging,
        confirmMergePair,
        openMergeModal,
        closeMergeModal,
        markBulkRecovery,
        handleBulkApplyPatch,
        showBulkEditModal,
        setShowBulkEditModal,
        isBulkSaving,
        runStravaEnrichSelected,
        isStravaEnriching,
        stravaEnrichMsg,
        setStravaEnrichMsg,
    };
}
