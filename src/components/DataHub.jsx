import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from '../firebase';
import { findDuplicatesInList } from '../utils';
import { protectEnrichedFieldsOnMerge } from '../utils/firestoreActivityMerge';
import { stripUndefinedFields } from '../utils/mergeActivities';
import { buildImportReplacementPlan } from '../utils/importDuplicateMatch';
import { persistImportedActivitiesReplacingDuplicates } from '../utils/importPersistence';
import { enrichActivityGearFromStrava } from '../utils/stravaGearEnrich';
import { enrichSelectedActivitiesFromStrava } from '../utils/stravaSelectedEnrich';
import { resolveStravaGearDisplay } from '../utils/stravaBikesLocalMap';
import { activityIntensityFactor } from '../utils/activityFilterMetrics';
import { normalizeDate, formatDateDDMMYYYY } from '../utils/formatters';
import { devLog } from '../utils/safeLog';

import { MONTH_ORDER } from '../config';
import { getCoreClimbDatabase } from '../services/climbDatabase';

// Sub-components
import EditActivityModal from './data-hub/EditActivityModal';
import BulkEditActivitiesModal from './data-hub/BulkEditActivitiesModal';
import ActivityLogView from './data-hub/ActivityLogView';
import ActivityLogBulkBar from './data-hub/ActivityLogBulkBar';
import ActivityLogFilterBar from './data-hub/ActivityLogFilterBar';
import ImportModal from './data-hub/ImportModal';
import DuplicateResolver from './data-hub/DuplicateResolver';
import QuickNav from './data-hub/QuickNav';
import ImportSection from './data-hub/ImportSection';
import ActivityDetailModal from './DataHub/ActivityDetailModal';
import StravaEnrichTab from './DataHub/StravaEnrichTab';
import StravaProfileTab from './DataHub/StravaProfileTab';
import NlDateInput from './NlDateInput';
import NoPowerModal from './data-hub/NoPowerModal';
import MergePairModal from './data-hub/MergePairModal';
import ActivityLogSyncBanners from './data-hub/ActivityLogSyncBanners';
import FetchIntervalsPanel from './data-hub/FetchIntervalsPanel';

// Hooks
import useActivityFilter from '../hooks/useActivityFilter';
import useActivityColumnVisibility from '../hooks/useActivityColumnVisibility';
import { useDataHubBulkActions } from '../hooks/useDataHubBulkActions';
import { useDataHubIntervalsSync } from '../hooks/useDataHubIntervalsSync';
import { useActivityCardLayout } from '../hooks/useMediaQuery';
import { useActivities } from '../hooks/useActivities';
import { useActivityLogNavigation } from '../context/ActivityLogNavigationContext';
import { useProfilerClimbMatches } from '../hooks/useProfilerClimbMatches';

const DataHub = ({
    intervalsConfig,
    stravaGetToken,
    startDate,
    endDate,
    stravaEnrichResults,
    onStravaEnrichResults,
    stravaAthleteId,
    stravaProfileData,
    onStravaProfileData,
    onOpenProfilerFromActivity,
    climbDatabaseForMatch = getCoreClimbDatabase(),
    initialInternalTab = 'log',
    /** Profile FTP (Settings) — used for intensity factor NP÷FTP in activity detail modal */
    profileFtp,
}) => {
    const {
        activities,
        importActivities: onImport,
        deleteActivity: onDelete,
        clearActivities: onClear,
        refreshFromServer: onRefresh,
    } = useActivities();

    const {
        activityFocusId: focusActivityId,
        logIsolateActivityId: isolateActivityId,
        logDateRangeFilter,
        activityLogRangesExpanded,
        setActivityLogRangesExpanded: onActivityLogRangesExpandedChange,
        clearActivityLogFilters,
        onFocusActivityCleared,
    } = useActivityLogNavigation();
    // UI State
    const [internalTab, setInternalTab] = useState(() => (
        ['log', 'strava-profile', 'import'].includes(initialInternalTab) ? initialInternalTab : 'log'
    ));
    const [detailActivity, setDetailActivity] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [duplicates, setDuplicates] = useState([]);
    const [editingActivity, setEditingActivity] = useState(null);
    const [showNoPowerModal, setShowNoPowerModal] = useState(false);
    const [noPowerSelected, setNoPowerSelected] = useState([]);
    const [showUtilMenu, setShowUtilMenu] = useState(false);
    const utilMenuRef = useRef(null);
    const utilMenuButtonRef = useRef(null);
    const [showStravaEnrichPanel, setShowStravaEnrichPanel] = useState(false);
    const [stravaListProgress, setStravaListProgress] = useState(null);

    const {
        visibleColumns,
        visibleKeys,
        activePreset,
        applyPreset,
        toggleColumn,
        isColumnVisible,
    } = useActivityColumnVisibility();

    const useCardLayout = useActivityCardLayout();
    const [logMobileFiltersOpen, setLogMobileFiltersOpen] = useState(false);

    // State for single-day Strava search (per-activity Find on Strava panel)
    const [stravaDateOverride, setStravaDateOverride] = useState(null);
    const [enrichmentTarget, setEnrichmentTarget] = useState(null);

    const handleFindOnStrava = useCallback((activity) => {
        if (!activity || !activity.date) return;
        const activityDate = activity.date.split('T')[0];
        setEnrichmentTarget(activity);
        setStravaDateOverride(activityDate);
        setEditingActivity(null);
        setShowStravaEnrichPanel(true);
    }, []);

    useEffect(() => {
        if (!showStravaEnrichPanel) {
            setStravaDateOverride(null);
            setEnrichmentTarget(null);
        }
    }, [showStravaEnrichPanel]);

    // Determine which dates to use for Strava tab
    const stravaSearchDates = useMemo(() => ({
        startDate: stravaDateOverride || startDate,
        endDate: stravaDateOverride || endDate,
    }), [stravaDateOverride, startDate, endDate]);


    // Import/Sync State
    const [fetchedActivities, setFetchedActivities] = useState([]);
    const [selectedActivities, setSelectedActivities] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [rawData, setRawData] = useState(null);

    const [isManualRefreshing, setIsManualRefreshing] = useState(false);

    const {
        search, setSearch,
        indoorFilter, setIndoorFilter,
        sortConfig, requestSort,
        isYearExpanded, toggleYear,
        isMonthExpanded, toggleMonth,
        openGroupedPathForActivity,
        expandAllGrouped,
        collapseAllGrouped,
        processedActivities, groupedActivities, isGroupedView,
        thisWeekOnly, setThisWeekOnly,
        rollingDays, setRollingDays,
        stravaLinkedOnly, setStravaLinkedOnly,
        noPowerOnly, setNoPowerOnly,
        withPowerOnly, setWithPowerOnly,
        highLoadOnly, setHighLoadOnly,
        longRideOnly, setLongRideOnly,
        missingHrOnly, setMissingHrOnly,
        virtualRideChip, setVirtualRideChip,
        minTss, setMinTss,
        filterDistMin, setFilterDistMin,
        filterDistMax, setFilterDistMax,
        filterSpeedMin, setFilterSpeedMin,
        filterSpeedMax, setFilterSpeedMax,
        filterPowerMin, setFilterPowerMin,
        filterPowerMax, setFilterPowerMax,
        filterDurMinMin, setFilterDurMinMin,
        filterDurMaxMin, setFilterDurMaxMin,
        filterElevMin, setFilterElevMin,
        filterElevMax, setFilterElevMax,
        filterKjMin, setFilterKjMin,
        filterKjMax, setFilterKjMax,
        filterGearId, setFilterGearId,
        clearMetricFilters,
    } = useActivityFilter(activities, profileFtp);

    // Vanuit Dashboard: open juiste jaar/maand in gegroepeerde weergave, dan scroll + highlight
    useEffect(() => {
        if (!focusActivityId) return;
        const act = activities?.find((a) => String(a.id) === String(focusActivityId));
        if (act && isGroupedView) openGroupedPathForActivity(act);
        setInternalTab('log');
        const delayMs = act && isGroupedView ? 380 : 200;
        const t = setTimeout(() => {
            const el = document.getElementById(`activity-row-${focusActivityId}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('ring-2', 'ring-yellow-400', 'ring-inset', 'bg-cdborder/40');
                setTimeout(() => {
                    el.classList.remove('ring-2', 'ring-yellow-400', 'ring-inset', 'bg-cdborder/40');
                    onFocusActivityCleared?.();
                }, 4500);
            } else {
                onFocusActivityCleared?.();
            }
        }, delayMs);
        return () => clearTimeout(t);
    }, [focusActivityId, onFocusActivityCleared, activities, isGroupedView, openGroupedPathForActivity]);

    useEffect(() => {
        if (isolateActivityId || (logDateRangeFilter?.startYmd && logDateRangeFilter?.endYmd)) {
            setInternalTab('log');
        }
    }, [isolateActivityId, logDateRangeFilter?.startYmd, logDateRangeFilter?.endYmd]);

    const isolatedActivity = useMemo(() => {
        if (!isolateActivityId || !activities?.length) return null;
        return activities.find((a) => String(a.id) === String(isolateActivityId)) ?? null;
    }, [isolateActivityId, activities]);

    const rangeFilteredActivities = useMemo(() => {
        const s = logDateRangeFilter?.startYmd;
        const e = logDateRangeFilter?.endYmd;
        if (!s || !e || !activities?.length) return null;
        const list = activities.filter((a) => {
            const d = normalizeDate(a?.date);
            return d >= s && d <= e;
        });
        return [...list].sort((a, b) => normalizeDate(b.date).localeCompare(normalizeDate(a.date)));
    }, [activities, logDateRangeFilter]);

    const logTableActivities = isolateActivityId
        ? (isolatedActivity ? [isolatedActivity] : [])
        : rangeFilteredActivities != null
            ? rangeFilteredActivities
            : (isGroupedView ? groupedActivities : processedActivities);
    const logTableGrouped = isolateActivityId || rangeFilteredActivities != null ? false : isGroupedView;

    const gearFilterOptions = useMemo(() => {
        const map = new Map();
        for (const a of activities || []) {
            const gid = a?.gear_id != null ? String(a.gear_id).trim() : '';
            if (!gid) continue;
            if (!map.has(gid)) {
                const rawName = (a.gear_name != null && String(a.gear_name).trim()) ? String(a.gear_name).trim() : '';
                const { display } = resolveStravaGearDisplay(gid, rawName);
                map.set(gid, display !== '-' ? display : gid);
            }
        }
        return Array.from(map.entries())
            .map(([id, label]) => ({ id, label }))
            .sort((x, y) => x.label.localeCompare(y.label, undefined, { sensitivity: 'base' }));
    }, [activities]);

    const metricRangeActive =
        [filterDistMin, filterDistMax, filterSpeedMin, filterSpeedMax, filterPowerMin, filterPowerMax,
            filterDurMinMin, filterDurMaxMin, filterElevMin, filterElevMax, filterKjMin, filterKjMax]
            .some((v) => v !== '' && v != null);

    const applyMetricPreset = (apply) => {
        clearMetricFilters();
        apply();
    };

    const profilerClimbByActivityId = useProfilerClimbMatches(
        processedActivities,
        climbDatabaseForMatch || [],
    );

    const visibleActivityIdsFlat = useMemo(() => {
        if (!processedActivities?.length) return [];
        if (isGroupedView && groupedActivities) {
            const ids = [];
            const years = Object.keys(groupedActivities).sort((a, b) => sortConfig.direction === 'asc' ? a - b : b - a);
            for (const y of years) {
                const months = Object.keys(groupedActivities[y]).sort((a, b) => {
                    const diff = MONTH_ORDER.indexOf(b) - MONTH_ORDER.indexOf(a);
                    return sortConfig.direction === 'asc' ? -diff : diff;
                });
                for (const m of months) {
                    if (!isYearExpanded(y) || !isMonthExpanded(y, m)) continue;
                    for (const act of groupedActivities[y][m] || []) {
                        if (act?.id != null) ids.push(String(act.id));
                    }
                }
            }
            return ids;
        }
        // ⚡ Bolt Optimization: Use single-pass reduce instead of chained map/filter/map
        return processedActivities.reduce((acc, a) => {
            if (a.id != null) acc.push(String(a.id));
            return acc;
        }, []);
    }, [processedActivities, groupedActivities, isGroupedView, sortConfig.direction, isYearExpanded, isMonthExpanded]);

    const bulk = useDataHubBulkActions({
        activities,
        onDelete,
        onImport,
        stravaGetToken,
        visibleActivityIdsFlat,
        setIsDeleting,
    });

    const intervalsSync = useDataHubIntervalsSync({
        intervalsConfig,
        activities,
        onImport,
        stravaGetToken,
        bulkSelectedIds: bulk.bulkSelectedIds,
        selectedActivitiesForBulk: bulk.selectedActivitiesForBulk,
    });

    const performSilentStravaEnrichment = async (actsToEnrich, customStart, customEnd) => {
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
                concurrency: 3,
                onProgress: (m) => {
                    if (String(m).includes('page')) {
                        setStravaListProgress((prev) => ({ page: prev?.page || 1, bikeCount: prev?.bikeCount || 0 }));
                    }
                },
            });
            setStravaListProgress(null);

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
            if (err?.message && /rate limit|429/i.test(err.message)) throw err;
        }
        return 0;
    };


    // --- AUTO-ENRICHMENT: draait eenmalig op de achtergrond bij laden ---
    const autoEnrichRanRef = useRef(false);

    useEffect(() => {
        if (autoEnrichRanRef.current) return;
        if (!stravaGetToken || !activities || activities.length === 0) return;

        // Zoek activiteiten van de laatste 30 dagen die data missen
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoff = thirtyDaysAgo.toISOString().split('T')[0];

        const needsEnrichment = activities.filter(act => {
            const actDate = act.date?.split('T')[0];
            if (!actDate || actDate < cutoff) return false;
            const missingHr = !act.avg_hr || act.avg_hr === 0;
            const missingRpe = !act.rpe || act.rpe === 0;
            const missingStravaId = !act.strava_id;
            return missingHr || missingRpe || missingStravaId;
        });

        if (needsEnrichment.length === 0) return;

        autoEnrichRanRef.current = true;

        const autoStart = cutoff;
        const autoEnd = new Date().toISOString().split('T')[0];

        devLog(`[Auto-Enrichment] ${needsEnrichment.length} activities missing data, starting background enrichment...`);
        performSilentStravaEnrichment(activities.filter(a => {
            const d = a.date?.split('T')[0];
            return d && d >= autoStart && d <= autoEnd;
        }), autoStart, autoEnd).then(count => {
            if (count > 0) {
                devLog(`[Auto-Enrichment] Enriched ${count} activities with Strava data.`);
            }
        }).catch(err => {
            console.warn("[Auto-Enrichment] Achtergrond verrijking mislukt:", err.message);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stravaGetToken, activities]);


    // --- OVERIGE BESTAANDE ACTIONS (Ongewijzigd) ---
    const handleImportFromStrava = async (newActs) => {
        if (!newActs || newActs.length === 0) return;
        onImport(newActs);
        if (db) {
            try {
                // ⚡ Bolt Optimization: Use Map for O(1) lookups instead of O(N) array.find inside loops
                const activitiesMap = new Map((activities || []).map((a) => [String(a.id), a]));

                await Promise.all(newActs.map(act => {
                    const existing = activitiesMap.get(String(act.id));
                    const payload = protectEnrichedFieldsOnMerge(act, existing);
                    return setDoc(doc(db, 'activities', String(act.id)), payload, { merge: true });
                }));
            } catch (e) {
                console.error('Strava import Firestore error:', e);
            }
        }
    };

    const handleSaveEdit = async (updatedActivity) => {
        try {
            const prev = (activities || []).find((a) => String(a.id) === String(updatedActivity.id)) || {};
            let toSave = stripUndefinedFields({ ...prev, ...updatedActivity });
            if (stravaGetToken && toSave.strava_id) {
                try {
                    const token = await stravaGetToken();
                    if (token) {
                        toSave = await enrichActivityGearFromStrava(toSave, null, token);
                    }
                } catch (gearErr) {
                    console.warn('[Edit save] Strava enrich failed:', gearErr);
                }
            }
            if (db) {
                await setDoc(doc(db, 'activities', String(toSave.id)), toSave, { merge: true });
            }
            onImport([toSave]);
            setEditingActivity(null);
        } catch (e) {
            alert("Could not save changes: " + e.message);
        }
    };

    const handleDeleteSingle = React.useCallback(async (id) => {
        if (db) {
            try {
                await deleteDoc(doc(db, "activities", String(id)));
            } catch {
                alert("Could not remove activity from the database.");
            }
        }
    }, []);

    const handleClearDatabase = async () => {
        if (!confirm("Are you sure?\n\nThis removes ALL activities from the database.")) return;
        if (!confirm("Really sure? This cannot be undone.")) return;
        setIsDeleting(true);
        try {
            if (db && activities.length > 0) {
                const promises = activities.map(act => deleteDoc(doc(db, "activities", String(act.id))));
                await Promise.all(promises);
            }
            if (onClear) onClear();
            alert("Database cleared. Ready for a fresh start.");
        } catch (e) {
            alert("Could not clear database: " + e.message);
        } finally {
            setIsDeleting(false);
        }
    };

    const findDuplicates = () => {
        if (!activities || activities.length === 0) return;
        const foundDups = findDuplicatesInList(activities);
        if (foundDups.length > 0) {
            setDuplicates(foundDups);
            setShowDuplicateModal(true);
        } else {
            alert("No duplicates found. Your activity list is clean.");
        }
    };

    const openNoPowerFilter = () => {
        const noPower = (activities || []).filter(a => !(Number(a.avg_power) > 0));
        if (noPower.length === 0) {
            alert("All activities have power data. Nothing to filter.");
            return;
        }
        setNoPowerSelected(noPower.map(a => a.id));
        setShowNoPowerModal(true);
        setShowUtilMenu(false);
    };

    const deleteNoPowerSelected = async () => {
        if (noPowerSelected.length === 0) return;
        setIsDeleting(true);
        try {
            for (const id of noPowerSelected) {
                if (db) await deleteDoc(doc(db, "activities", String(id)));
            }
            setShowNoPowerModal(false);
            setNoPowerSelected([]);
        } catch (e) {
            alert("Could not delete: " + e.message);
        } finally {
            setIsDeleting(false);
        }
    };

    useEffect(() => {
        if (!showUtilMenu) return undefined;
        const handler = (e) => {
            const target = e.target;
            if (utilMenuRef.current?.contains(target)) return;
            if (target.closest?.('[data-anchored-dropdown]')) return;
            setShowUtilMenu(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showUtilMenu]);

    const resolveDuplicate = async (action, dup) => {
        const { a, b } = dup;
        let idsToDelete = [];
        if (action === 'keepA') idsToDelete.push(b.id);
        if (action === 'keepB') idsToDelete.push(a.id);
        if (action === 'deleteBoth') idsToDelete.push(a.id, b.id);

        if (idsToDelete.length > 0) {
            idsToDelete.forEach(id => onDelete(id));
            if (db) {
                try {
                    await Promise.all(idsToDelete.map(id => deleteDoc(doc(db, "activities", String(id)))));
                } catch (e) {
                    console.error("Failed to delete resolved duplicates:", e);
                }
            }
        }
        setDuplicates(prev => prev.filter(d => d !== dup));
        if (duplicates.length <= 1) setShowDuplicateModal(false);
    };

    const handleDataDetected = (parsedData) => {
        if (!parsedData || parsedData.length === 0) return;
        setFetchedActivities(parsedData);
        setSelectedActivities(parsedData.map(r => r.id));
        setRawData(parsedData[0]);
        setShowModal(true);
    };

    const handleManualFetchedActivity = (act) => {
        if (!act || act.id == null) return;
        handleDataDetected([act]);
    };

    const toggleActivityTypeInPreview = (id) => {
        setFetchedActivities(prev => prev.map(act => act.id === id ? { ...act, type: act.type === 'VirtualRide' ? 'Ride' : 'VirtualRide' } : act));
    };

    const confirmImport = async () => {
        const toImport = fetchedActivities.filter(a => selectedActivities.includes(a.id));
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
                    writeActivity: (id, payload) => setDoc(doc(db, "activities", String(id)), payload, { merge: true }),
                    deleteActivity: (id) => deleteDoc(doc(db, "activities", String(id))),
                    mergePayload: protectEnrichedFieldsOnMerge,
                });
                savedCount = importPayloads.length;
                cloudPersisted = true;
            } catch (e) {
                alert("Note: Data imported locally, but cloud backup failed: " + e.message);
            }
        }

        onImport(importPayloads);
        if (cloudPersisted && replacementPlan.idsToDelete.length > 0) {
            replacementPlan.idsToDelete.forEach(id => onDelete(id));
        }

        setShowModal(false);
        setFetchedActivities([]);
        setInternalTab('log');
        alert(`Import Successful!\n\nImported: ${savedCount}\nReplaced Duplicates: ${cloudPersisted ? replacementPlan.replacedCount : 0}`);
    };

    const [previewSortConfig, setPreviewSortConfig] = useState({ key: 'date', direction: 'desc' });
    const requestPreviewSort = (key) => setPreviewSortConfig({ key, direction: previewSortConfig.key === key && previewSortConfig.direction === 'desc' ? 'asc' : 'desc' });
    const sortedFetchedActivities = React.useMemo(() => {
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
                if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal ? bVal.toLowerCase() : ''; }
                else { aVal = Number(aVal) || 0; bVal = Number(bVal) || 0; }
                if (aVal < bVal) return previewSortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return previewSortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return list;
    }, [fetchedActivities, previewSortConfig, profileFtp]);


    return (
        <div className="bg-cdsurface rounded-xl border border-cdborder shadow-xl overflow-hidden min-h-[500px] flex flex-col relative animate-in fade-in">
            {/* MODALS */}
            {detailActivity && (
                <ActivityDetailModal
                    activity={detailActivity}
                    onClose={() => setDetailActivity(null)}
                    getStravaToken={stravaGetToken}
                    profileFtp={profileFtp}
                />
            )}
            {editingActivity && (
                <EditActivityModal
                    activity={editingActivity}
                    allActivities={activities}
                    onClose={() => setEditingActivity(null)}
                    onSave={handleSaveEdit}
                    onFindOnStrava={handleFindOnStrava}
                />
            )}
            {bulk.showBulkEditModal && (
                <BulkEditActivitiesModal
                    count={bulk.bulkSelectedIds.size}
                    allActivities={activities}
                    onClose={() => bulk.setShowBulkEditModal(false)}
                    onApply={bulk.handleBulkApplyPatch}
                />
            )}
            <ImportModal
                showModal={showModal}
                onClose={() => setShowModal(false)}
                fetchedActivities={fetchedActivities}
                selectedActivities={selectedActivities}
                setSelectedActivities={setSelectedActivities}
                toggleActivityTypeInPreview={toggleActivityTypeInPreview}
                previewSortConfig={previewSortConfig}
                requestPreviewSort={requestPreviewSort}
                confirmImport={confirmImport}
                rawData={rawData}
                sortedFetchedActivities={sortedFetchedActivities}
                profileFtp={profileFtp}
            />
            {showDuplicateModal && (
                <DuplicateResolver
                    duplicates={duplicates}
                    onResolve={resolveDuplicate}
                    onClose={() => setShowDuplicateModal(false)}
                />
            )}

            <NoPowerModal
                open={showNoPowerModal}
                activities={activities}
                selectedIds={noPowerSelected}
                onToggleAll={() => {
                    const noPowerList = (activities || []).filter((a) => !(Number(a.avg_power) > 0));
                    const allSelected = noPowerList.every((a) => noPowerSelected.includes(a.id));
                    setNoPowerSelected(allSelected ? [] : noPowerList.map((a) => a.id));
                }}
                onToggleOne={(id) => setNoPowerSelected((prev) =>
                    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                )}
                onClose={() => setShowNoPowerModal(false)}
                onDeleteSelected={deleteNoPowerSelected}
                isDeleting={isDeleting}
            />

            <MergePairModal
                open={bulk.showMergeModal}
                mergePairPreview={bulk.mergePairPreview}
                mergeError={bulk.mergeError}
                isMerging={bulk.isMerging}
                hasDb={!!db}
                onClose={bulk.closeMergeModal}
                onConfirm={bulk.confirmMergePair}
            />

            {/* TABS */}
            <div className="flex border-b border-cdborder" role="tablist" aria-label="Data Hub Tabs">
                <button type="button" id="tab-log" role="tab" aria-selected={internalTab === 'log'} aria-controls="tabpanel-log" onClick={() => setInternalTab('log')} className={`flex-1 py-3 text-sm font-bold ${internalTab === 'log' ? 'bg-cdborder text-yellow-400' : 'text-cdmuted hover:bg-cdborder/50'}`}>Activity Log</button>
                {stravaGetToken && (
                    <button type="button" id="tab-strava-profile" role="tab" aria-selected={internalTab === 'strava-profile'} aria-controls="tabpanel-strava-profile" onClick={() => setInternalTab('strava-profile')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-1.5 ${internalTab === 'strava-profile' ? 'bg-cdborder text-orange-400' : 'text-cdmuted hover:bg-cdborder/50'}`}>
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" /></svg>
                        Strava Profile
                    </button>
                )}
                <button type="button" id="tab-import" role="tab" aria-selected={internalTab === 'import'} aria-controls="tabpanel-import" onClick={() => setInternalTab('import')} className={`flex-1 py-3 text-sm font-bold ${internalTab === 'import' ? 'bg-cdborder text-yellow-400' : 'text-cdmuted hover:bg-cdborder/50'}`}>Import Data</button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
                {internalTab === 'log' && (
                    <div role="tabpanel" id="tabpanel-log" aria-labelledby="tab-log" className="p-4 flex-1 min-h-0 overflow-hidden flex flex-col">
                        <ActivityLogSyncBanners
                            syncStatus={intervalsSync.syncStatus}
                            syncErrorDetail={intervalsSync.syncErrorDetail}
                            isSyncing={intervalsSync.isSyncing}
                            syncProgress={intervalsSync.syncProgress}
                            stravaListProgress={stravaListProgress}
                            isStravaEnriching={bulk.isStravaEnriching}
                            stravaEnrichMsg={bulk.stravaEnrichMsg}
                            onDismissStravaEnrichMsg={() => bulk.setStravaEnrichMsg(null)}
                        />

                        <FetchIntervalsPanel
                            fetchIntervalsDates={intervalsSync.fetchIntervalsDates}
                            onFetchIntervalsDatesChange={intervalsSync.setFetchIntervalsDates}
                            onFetch={intervalsSync.handleFetchNewFromIntervals}
                            isFetching={intervalsSync.isFetchingNewIntervals}
                            isSyncing={intervalsSync.isSyncing}
                            stravaConnected={!!stravaGetToken}
                            onOpenImportTab={() => setInternalTab('import')}
                        />

                        <ActivityLogFilterBar
                            search={search}
                            onSearchChange={setSearch}
                            indoorFilter={indoorFilter}
                            onIndoorFilterChange={setIndoorFilter}
                            virtualRideChip={virtualRideChip}
                            onVirtualRideChipChange={setVirtualRideChip}
                            useCardLayout={useCardLayout}
                            logMobileFiltersOpen={logMobileFiltersOpen}
                            onLogMobileFiltersOpenChange={setLogMobileFiltersOpen}
                            showUtilMenu={showUtilMenu}
                            onShowUtilMenuChange={setShowUtilMenu}
                            utilMenuRef={utilMenuRef}
                            utilMenuButtonRef={utilMenuButtonRef}
                            visibleKeys={visibleKeys}
                            activePreset={activePreset}
                            applyPreset={applyPreset}
                            toggleColumn={toggleColumn}
                            isColumnVisible={isColumnVisible}
                            onRefresh={onRefresh}
                            isManualRefreshing={isManualRefreshing}
                            onManualRefresh={async () => {
                                setIsManualRefreshing(true);
                                try { await onRefresh(); } catch (e) { console.error(e); }
                                finally { setIsManualRefreshing(false); }
                            }}
                            onSync={() => {
                                setShowUtilMenu(false);
                                intervalsSync.handleSync();
                            }}
                            isSyncing={intervalsSync.isSyncing}
                            bulkSelectedCount={bulk.bulkSelectedIds.size}
                            onFindDuplicates={() => { findDuplicates(); setShowUtilMenu(false); }}
                            onOpenNoPower={openNoPowerFilter}
                            onClearDatabase={() => { handleClearDatabase(); setShowUtilMenu(false); }}
                            activitiesCount={activities?.length ?? 0}
                            isDeleting={isDeleting}
                            thisWeekOnly={thisWeekOnly}
                            onThisWeekOnlyChange={setThisWeekOnly}
                            rollingDays={rollingDays}
                            onRollingDaysChange={setRollingDays}
                            stravaGetToken={stravaGetToken}
                            stravaLinkedOnly={stravaLinkedOnly}
                            onStravaLinkedOnlyChange={setStravaLinkedOnly}
                            noPowerOnly={noPowerOnly}
                            onNoPowerOnlyChange={setNoPowerOnly}
                            withPowerOnly={withPowerOnly}
                            onWithPowerOnlyChange={setWithPowerOnly}
                            highLoadOnly={highLoadOnly}
                            onHighLoadOnlyChange={setHighLoadOnly}
                            longRideOnly={longRideOnly}
                            onLongRideOnlyChange={setLongRideOnly}
                            missingHrOnly={missingHrOnly}
                            onMissingHrOnlyChange={setMissingHrOnly}
                            minTss={minTss}
                            onMinTssChange={setMinTss}
                            gearFilterOptions={gearFilterOptions}
                            filterGearId={filterGearId}
                            onFilterGearIdChange={setFilterGearId}
                            activityLogRangesExpanded={activityLogRangesExpanded}
                            onActivityLogRangesExpandedChange={onActivityLogRangesExpandedChange}
                            metricRangeActive={metricRangeActive}
                            clearMetricFilters={clearMetricFilters}
                            applyMetricPreset={applyMetricPreset}
                            filterDistMin={filterDistMin}
                            onFilterDistMinChange={setFilterDistMin}
                            filterDistMax={filterDistMax}
                            onFilterDistMaxChange={setFilterDistMax}
                            filterSpeedMin={filterSpeedMin}
                            onFilterSpeedMinChange={setFilterSpeedMin}
                            filterSpeedMax={filterSpeedMax}
                            onFilterSpeedMaxChange={setFilterSpeedMax}
                            filterPowerMin={filterPowerMin}
                            onFilterPowerMinChange={setFilterPowerMin}
                            filterPowerMax={filterPowerMax}
                            onFilterPowerMaxChange={setFilterPowerMax}
                            filterDurMinMin={filterDurMinMin}
                            onFilterDurMinMinChange={setFilterDurMinMin}
                            filterDurMaxMin={filterDurMaxMin}
                            onFilterDurMaxMinChange={setFilterDurMaxMin}
                            filterElevMin={filterElevMin}
                            onFilterElevMinChange={setFilterElevMin}
                            filterElevMax={filterElevMax}
                            onFilterElevMaxChange={setFilterElevMax}
                            filterKjMin={filterKjMin}
                            onFilterKjMinChange={setFilterKjMin}
                            filterKjMax={filterKjMax}
                            onFilterKjMaxChange={setFilterKjMax}
                            onBulkEdit={() => {
                                setEditingActivity(null);
                                bulk.setShowBulkEditModal(true);
                            }}
                            onExportCsv={bulk.exportBulkCsv}
                            onMarkRecovery={bulk.markBulkRecovery}
                            onStravaEnrich={() => bulk.runStravaEnrichSelected(bulk.selectedActivitiesForBulk)}
                            onMergePair={bulk.openMergeModal}
                            onDeleteSelected={bulk.confirmBulkDeleteSelected}
                            onClearSelection={() => bulk.setBulkSelectedIds(new Set())}
                            isBulkSaving={bulk.isBulkSaving}
                            isStravaEnriching={bulk.isStravaEnriching}
                        />

                        {isGroupedView && !isolateActivityId && !(logDateRangeFilter?.startYmd && logDateRangeFilter?.endYmd) && (
                            <div className="flex flex-col gap-2 shrink-0 mb-2 lg:mb-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={expandAllGrouped}
                                        className="text-[10px] font-bold px-2 py-1 rounded border border-cdborder text-cdmuted hover:text-cdaccent hover:border-cdaccent/50 focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none"
                                    >
                                        Expand all
                                    </button>
                                    <button
                                        type="button"
                                        onClick={collapseAllGrouped}
                                        className="text-[10px] font-bold px-2 py-1 rounded border border-cdborder text-cdmuted hover:text-cdtext focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none"
                                    >
                                        Collapse all
                                    </button>
                                    <span className="text-[9px] text-cdmuted hidden sm:inline">
                                        Bulk select only includes visible rows — expand groups or use Expand all first.
                                    </span>
                                </div>
                                <div className="hidden lg:block">
                                <QuickNav groupedActivities={groupedActivities} isYearExpanded={isYearExpanded} onToggleYear={toggleYear} />
                                </div>
                            </div>
                        )}

                        <div className="flex-1 min-h-0 flex flex-col gap-2">
                        {isolateActivityId && (
                            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-cdaccent/40 bg-cdaccent/10 px-3 py-2 text-sm text-cdtext">
                                <span>
                                    Showing <strong className="text-cdtext">one activity</strong> linked from the Dashboard (Peak eFTP source).
                                </span>
                                {typeof clearActivityLogFilters === 'function' && (
                                    <button
                                        type="button"
                                        onClick={() => clearActivityLogFilters()}
                                        className="shrink-0 px-3 py-1.5 rounded-md border border-cdborder bg-cdsurface text-xs font-bold text-cdaccent hover:bg-cdborder/40"
                                    >
                                        Show full log
                                    </button>
                                )}
                            </div>
                        )}

                        {logDateRangeFilter?.startYmd && logDateRangeFilter?.endYmd && (
                            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-500/35 bg-blue-500/[0.08] px-3 py-2 text-sm text-cdtext">
                                <span>
                                    Showing activities from{' '}
                                    <strong className="text-cdtext">
                                        {formatDateDDMMYYYY(`${logDateRangeFilter.startYmd}T12:00:00`)} –{' '}
                                        {formatDateDDMMYYYY(`${logDateRangeFilter.endYmd}T12:00:00`)}
                                    </strong>{' '}
                                    (from Dashboard Volume).
                                </span>
                                {typeof clearActivityLogFilters === 'function' && (
                                    <button
                                        type="button"
                                        onClick={() => clearActivityLogFilters()}
                                        className="shrink-0 px-3 py-1.5 rounded-md border border-cdborder bg-cdsurface text-xs font-bold text-cdaccent hover:bg-cdborder/40"
                                    >
                                        Show full log
                                    </button>
                                )}
                            </div>
                        )}

                        {!activities ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-cdmuted gap-4"><Loader2 className="animate-spin text-yellow-400" size={32} /><p>Loading Activities...</p></div>
                        ) : isolateActivityId && !isolatedActivity ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-cdmuted gap-3 border border-dashed border-cdborder rounded-lg p-6">
                                <AlertTriangle size={32} className="text-amber-500/90" />
                                <p className="text-sm text-cdtext text-center">That activity is not in your log (it may have been removed).</p>
                                {typeof clearActivityLogFilters === 'function' && (
                                    <button
                                        type="button"
                                        onClick={() => clearActivityLogFilters()}
                                        className="px-4 py-2 rounded-lg border border-cdborder bg-cdsurface text-sm font-bold text-cdaccent hover:bg-cdborder/30"
                                    >
                                        Show full log
                                    </button>
                                )}
                            </div>
                        ) : logDateRangeFilter?.startYmd && logDateRangeFilter?.endYmd && rangeFilteredActivities?.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-cdmuted gap-3 border border-dashed border-cdborder rounded-lg p-6">
                                <AlertTriangle size={32} className="text-amber-500/90" />
                                <p className="text-sm text-cdtext text-center">No activities in this date range in your log.</p>
                                {typeof clearActivityLogFilters === 'function' && (
                                    <button
                                        type="button"
                                        onClick={() => clearActivityLogFilters()}
                                        className="px-4 py-2 rounded-lg border border-cdborder bg-cdsurface text-sm font-bold text-cdaccent hover:bg-cdborder/30"
                                    >
                                        Show full log
                                    </button>
                                )}
                            </div>
                        ) : !isolateActivityId && !(logDateRangeFilter?.startYmd && logDateRangeFilter?.endYmd) && processedActivities.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-cdmuted gap-2 border border-dashed border-cdborder rounded-lg"><AlertTriangle size={32} className="text-slate-600" /><p>No activities found. Start with an Import!</p></div>
                        ) : (
                            <div className="flex-1 min-h-0 flex flex-col">
                            <ActivityLogView
                                activities={logTableActivities}
                                sortConfig={sortConfig}
                                onSort={requestSort}
                                onDelete={handleDeleteSingle}
                                onEdit={setEditingActivity}
                                onViewDetail={setDetailActivity}
                                isGroupedView={logTableGrouped}
                                isYearExpanded={isYearExpanded}
                                onToggleYear={toggleYear}
                                isMonthExpanded={isMonthExpanded}
                                onToggleMonth={toggleMonth}
                                showBulkSelect
                                selectedActivityIds={bulk.bulkSelectedIds}
                                onToggleSelectRow={bulk.toggleBulkSelectOne}
                                allVisibleSelected={bulk.allVisibleSelected}
                                onToggleSelectAllVisible={bulk.toggleSelectAllVisible}
                                onOpenProfiler={onOpenProfilerFromActivity}
                                profilerClimbByActivityId={profilerClimbByActivityId}
                                profileFtp={profileFtp}
                                visibleColumns={visibleColumns}
                            />
                            </div>
                        )}
                        </div>
                    </div>
                )}

                {internalTab === 'import' && (
                    <div role="tabpanel" id="tabpanel-import" aria-labelledby="tab-import" className="flex-1 overflow-hidden flex flex-col p-4">
                        <ImportSection
                            intervalsConfig={intervalsConfig}
                            stravaGetToken={stravaGetToken}
                            onDataDetected={handleDataDetected}
                            onFetchedActivityFromUrl={handleManualFetchedActivity}
                        />
                    </div>
                )}

                {internalTab === 'strava-profile' && (
                    <div role="tabpanel" id="tabpanel-strava-profile" aria-labelledby="tab-strava-profile" className="flex-1 overflow-hidden flex flex-col p-4">
                        <StravaProfileTab
                            getStravaToken={stravaGetToken}
                            athleteId={stravaAthleteId}
                            persistedData={stravaProfileData}
                            onDataChange={onStravaProfileData}
                            activities={activities}
                        />
                    </div>
                )}
            </div>

            {showStravaEnrichPanel && stravaGetToken && (
                <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-cdbg/80 backdrop-blur-sm">
                    <button
                        type="button"
                        aria-label="Close Strava enrichment"
                        className="absolute inset-0 cursor-default"
                        onClick={() => setShowStravaEnrichPanel(false)}
                    />
                    <div className="relative w-full sm:max-w-3xl max-h-[min(92vh,900px)] sm:rounded-xl border border-cdborder bg-cdsurface shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
                        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-cdborder bg-cdbg/80 shrink-0">
                            <div className="flex items-center gap-2 min-w-0">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="text-orange-400 shrink-0"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" /></svg>
                                <div className="min-w-0">
                                    <h2 className="text-sm font-bold text-cdtext truncate">Link to Strava</h2>
                                    <p className="text-[10px] text-cdmuted truncate">Manual link for one activity · bulk auto-link: select rows → Strava enrich</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowStravaEnrichPanel(false)}
                                className="shrink-0 px-3 py-1.5 text-xs font-bold rounded border border-cdborder text-cdmuted hover:text-cdtext hover:border-yellow-400/50 transition-colors focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none"
                            >
                                Close
                            </button>
                        </div>
                        <div className="p-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                            <StravaEnrichTab
                                activities={activities}
                                getStravaToken={stravaGetToken}
                                onImportNew={handleImportFromStrava}
                                onAfterStravaLink={onImport}
                                startDate={stravaSearchDates.startDate}
                                endDate={stravaSearchDates.endDate}
                                persistedResults={stravaEnrichResults}
                                onResultsChange={onStravaEnrichResults}
                                enrichmentTarget={enrichmentTarget}
                                dateRangeHint="Set the date range in the header (dashboard period)."
                            />
                        </div>
                    </div>
                </div>
            )}

            {internalTab === 'log' && (
                <ActivityLogBulkBar
                    count={bulk.bulkSelectedIds.size}
                    onBulkEdit={() => {
                        setEditingActivity(null);
                        bulk.setShowBulkEditModal(true);
                    }}
                    onExport={bulk.exportBulkCsv}
                    onClearSelection={() => bulk.setBulkSelectedIds(new Set())}
                    onDelete={bulk.confirmBulkDeleteSelected}
                    isDeleting={isDeleting}
                    isBulkSaving={bulk.isBulkSaving}
                    stravaGetToken={stravaGetToken}
                    onStravaEnrich={() => bulk.runStravaEnrichSelected(bulk.selectedActivitiesForBulk)}
                    isStravaEnriching={bulk.isStravaEnriching}
                />
            )}
        </div>
    );
};

export default DataHub;
