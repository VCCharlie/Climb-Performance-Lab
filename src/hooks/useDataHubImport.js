import { useState, useMemo, useCallback } from 'react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { findDuplicatesInList } from '../utils';
import { protectEnrichedFieldsOnMerge } from '../utils/firestoreActivityMerge';
import { buildImportReplacementPlan } from '../utils/importDuplicateMatch';
import { persistImportedActivitiesReplacingDuplicates } from '../utils/importPersistence';
import { activityIntensityFactor } from '../utils/activityFilterMetrics';
import {
    filterStoredDuplicatePairs,
    recordDuplicatePairResolution,
} from '../utils/duplicateResolutions';
import { useToast } from '../context/ToastContext';

/**
 * JSON import preview, confirm flow, and duplicate resolution (Bolt 3d-bis follow-up).
 */
export function useDataHubImport({
    activities,
    onImport,
    onDelete,
    onImportComplete,
    profileFtp,
}) {
    const { showToast } = useToast();
    const [fetchedActivities, setFetchedActivities] = useState([]);
    const [selectedActivities, setSelectedActivities] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [rawData, setRawData] = useState(null);
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [duplicates, setDuplicates] = useState([]);
    const [previewSortConfig, setPreviewSortConfig] = useState({ key: 'date', direction: 'desc' });

    const requestPreviewSort = useCallback((key) => {
        setPreviewSortConfig((prev) => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
        }));
    }, []);

    const sortedFetchedActivities = useMemo(() => {
        if (!fetchedActivities) return [];
        const list = [...fetchedActivities];
        if (previewSortConfig.key) {
            list.sort((a, b) => {
                if (previewSortConfig.key === 'intensity_factor') {
                    const fa = activityIntensityFactor(a.norm_power, profileFtp);
                    const fb = activityIntensityFactor(b.norm_power, profileFtp);
                    const nullSentinel = previewSortConfig.direction === 'desc' ? -Infinity : Infinity;
                    const aNum = fa != null ? fa : nullSentinel;
                    const bNum = fb != null ? fb : nullSentinel;
                    if (aNum < bNum) return previewSortConfig.direction === 'asc' ? -1 : 1;
                    if (aNum > bNum) return previewSortConfig.direction === 'asc' ? 1 : -1;
                    return 0;
                }
                let aVal = a[previewSortConfig.key];
                let bVal = b[previewSortConfig.key];
                if (typeof aVal === 'string') {
                    aVal = aVal.toLowerCase();
                    bVal = bVal ? bVal.toLowerCase() : '';
                } else {
                    aVal = Number(aVal) || 0;
                    bVal = Number(bVal) || 0;
                }
                if (aVal < bVal) return previewSortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return previewSortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return list;
    }, [fetchedActivities, previewSortConfig, profileFtp]);

    const handleDataDetected = useCallback((parsedData) => {
        if (!parsedData || parsedData.length === 0) return;
        setFetchedActivities(parsedData);
        setSelectedActivities(parsedData.map((r) => r.id));
        setRawData(parsedData[0]);
        setShowModal(true);
    }, []);

    const handleManualFetchedActivity = useCallback((act) => {
        if (!act || act.id == null) return;
        handleDataDetected([act]);
    }, [handleDataDetected]);

    const toggleActivityTypeInPreview = useCallback((id) => {
        setFetchedActivities((prev) => prev.map((act) => (
            act.id === id
                ? { ...act, type: act.type === 'VirtualRide' ? 'Ride' : 'VirtualRide' }
                : act
        )));
    }, []);

    const confirmImport = useCallback(async () => {
        const toImport = fetchedActivities.filter((a) => selectedActivities.includes(a.id));
        let savedCount = 0;
        let cloudPersisted = !db;
        const replacementPlan = buildImportReplacementPlan(activities, toImport);
        const activitiesById = new Map((activities || []).map((activity) => [String(activity.id), activity]));
        const importPayloads = replacementPlan.activitiesToImport.map((activity) => {
            const existing = activitiesById.get(String(activity.id));
            return protectEnrichedFieldsOnMerge(activity, existing);
        });

        if (db) {
            try {
                await persistImportedActivitiesReplacingDuplicates({
                    activities,
                    toImport: importPayloads,
                    idsToDelete: replacementPlan.idsToDelete,
                    writeActivity: (id, payload) => setDoc(doc(db, 'activities', String(id)), payload, { merge: true }),
                    deleteActivity: (id) => deleteDoc(doc(db, 'activities', String(id))),
                    mergePayload: protectEnrichedFieldsOnMerge,
                });
                savedCount = importPayloads.length;
                cloudPersisted = true;
            } catch (e) {
                showToast(`Data imported locally, but cloud backup failed: ${e.message}`, {
                    variant: 'warning',
                    durationMs: 10000,
                });
            }
        }

        onImport(importPayloads);
        if (cloudPersisted && replacementPlan.idsToDelete.length > 0) {
            replacementPlan.idsToDelete.forEach((id) => onDelete(id));
        }

        setShowModal(false);
        setFetchedActivities([]);
        onImportComplete?.();
        showToast(
            `Imported ${savedCount} activit${savedCount === 1 ? 'y' : 'ies'}. Replaced ${cloudPersisted ? replacementPlan.replacedCount : 0} duplicate(s).`,
            { variant: 'success', durationMs: 8000 },
        );
    }, [fetchedActivities, selectedActivities, activities, onImport, onDelete, onImportComplete, showToast]);

    const findDuplicates = useCallback(() => {
        if (!activities || activities.length === 0) return;
        const foundDups = filterStoredDuplicatePairs(findDuplicatesInList(activities));
        if (foundDups.length > 0) {
            setDuplicates(foundDups);
            setShowDuplicateModal(true);
        } else {
            showToast('No duplicates found. Your activity list is clean (or earlier "keep both" choices are remembered).', {
                variant: 'info',
            });
        }
    }, [activities, showToast]);

    const resolveDuplicate = useCallback(async (action, dup) => {
        const { a, b } = dup;
        recordDuplicatePairResolution(a, b, action);

        let idsToDelete = [];
        if (action === 'keepA') idsToDelete.push(b.id);
        if (action === 'keepB') idsToDelete.push(a.id);
        if (action === 'deleteBoth') idsToDelete.push(a.id, b.id);

        if (idsToDelete.length > 0) {
            idsToDelete.forEach((id) => onDelete(id));
            if (db) {
                try {
                    await Promise.all(idsToDelete.map((id) => deleteDoc(doc(db, 'activities', String(id)))));
                } catch (e) {
                    console.error('Failed to delete resolved duplicates:', e);
                }
            }
        }
        setDuplicates((prev) => {
            const next = prev.filter((d) => d !== dup);
            if (next.length === 0) setShowDuplicateModal(false);
            return next;
        });
    }, [onDelete]);

    return {
        fetchedActivities,
        selectedActivities,
        setSelectedActivities,
        showModal,
        setShowModal,
        rawData,
        previewSortConfig,
        requestPreviewSort,
        sortedFetchedActivities,
        handleDataDetected,
        handleManualFetchedActivity,
        toggleActivityTypeInPreview,
        confirmImport,
        showDuplicateModal,
        setShowDuplicateModal,
        duplicates,
        findDuplicates,
        resolveDuplicate,
    };
}
