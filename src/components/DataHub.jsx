import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { stripUndefinedFields } from '../utils/mergeActivities';
import { enrichActivityGearFromStrava } from '../utils/stravaGearEnrich';
import { resolveStravaGearDisplay } from '../utils/stravaBikesLocalMap';
import { normalizeDate } from '../utils/formatters';

import { MONTH_ORDER } from '../config';
import { getCoreClimbDatabase } from '../services/climbDatabase';

import EditActivityModal from './data-hub/EditActivityModal';
import BulkEditActivitiesModal from './data-hub/BulkEditActivitiesModal';
import ActivityLogBulkBar from './data-hub/ActivityLogBulkBar';
import ActivityLogTabPanel from './data-hub/ActivityLogTabPanel';
import ImportModal from './data-hub/ImportModal';
import DuplicateResolver from './data-hub/DuplicateResolver';
import ImportSection from './data-hub/ImportSection';
import ActivityDetailModal from './DataHub/ActivityDetailModal';
import StravaEnrichTab from './DataHub/StravaEnrichTab';
import StravaProfileTab from './DataHub/StravaProfileTab';
import NoPowerModal from './data-hub/NoPowerModal';
import MergePairModal from './data-hub/MergePairModal';

import useActivityFilter from '../hooks/useActivityFilter';
import useActivityColumnVisibility from '../hooks/useActivityColumnVisibility';
import { useDataHubBulkActions } from '../hooks/useDataHubBulkActions';
import { useDataHubIntervalsSync } from '../hooks/useDataHubIntervalsSync';
import { useDataHubStravaEnrich } from '../hooks/useDataHubStravaEnrich';
import { useDataHubImport } from '../hooks/useDataHubImport';
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

    const [internalTab, setInternalTab] = useState(() => (
        ['log', 'strava-profile', 'import'].includes(initialInternalTab) ? initialInternalTab : 'log'
    ));
    const [detailActivity, setDetailActivity] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [editingActivity, setEditingActivity] = useState(null);
    const [showNoPowerModal, setShowNoPowerModal] = useState(false);
    const [noPowerSelected, setNoPowerSelected] = useState([]);
    const [showUtilMenu, setShowUtilMenu] = useState(false);
    const utilMenuRef = useRef(null);
    const utilMenuButtonRef = useRef(null);
    const [isManualRefreshing, setIsManualRefreshing] = useState(false);

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

    const stravaEnrich = useDataHubStravaEnrich({
        stravaGetToken,
        activities,
        startDate,
        endDate,
        onImport,
        onBeforeOpenPanel: () => setEditingActivity(null),
    });

    const dataImport = useDataHubImport({
        activities,
        onImport,
        onDelete,
        onImportComplete: () => setInternalTab('log'),
        profileFtp,
    });

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
            alert(`Could not save changes: ${e.message}`);
        }
    };

    const handleDeleteSingle = useCallback(async (id) => {
        if (db) {
            try {
                await deleteDoc(doc(db, 'activities', String(id)));
            } catch {
                alert('Could not remove activity from the database.');
            }
        }
    }, []);

    const handleClearDatabase = async () => {
        if (!confirm('Are you sure?\n\nThis removes ALL activities from the database.')) return;
        if (!confirm('Really sure? This cannot be undone.')) return;
        setIsDeleting(true);
        try {
            if (db && activities.length > 0) {
                const promises = activities.map((act) => deleteDoc(doc(db, 'activities', String(act.id))));
                await Promise.all(promises);
            }
            if (onClear) onClear();
            alert('Database cleared. Ready for a fresh start.');
        } catch (e) {
            alert(`Could not clear database: ${e.message}`);
        } finally {
            setIsDeleting(false);
        }
    };

    const openNoPowerFilter = () => {
        const noPower = (activities || []).filter((a) => !(Number(a.avg_power) > 0));
        if (noPower.length === 0) {
            alert('All activities have power data. Nothing to filter.');
            return;
        }
        setNoPowerSelected(noPower.map((a) => a.id));
        setShowNoPowerModal(true);
        setShowUtilMenu(false);
    };

    const deleteNoPowerSelected = async () => {
        if (noPowerSelected.length === 0) return;
        setIsDeleting(true);
        try {
            for (const id of noPowerSelected) {
                if (db) await deleteDoc(doc(db, 'activities', String(id)));
            }
            setShowNoPowerModal(false);
            setNoPowerSelected([]);
        } catch (e) {
            alert(`Could not delete: ${e.message}`);
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

    const filterBarProps = {
        search,
        onSearchChange: setSearch,
        indoorFilter,
        onIndoorFilterChange: setIndoorFilter,
        virtualRideChip,
        onVirtualRideChipChange: setVirtualRideChip,
        useCardLayout,
        logMobileFiltersOpen,
        onLogMobileFiltersOpenChange: setLogMobileFiltersOpen,
        showUtilMenu,
        onShowUtilMenuChange: setShowUtilMenu,
        utilMenuRef,
        utilMenuButtonRef,
        visibleKeys,
        activePreset,
        applyPreset,
        toggleColumn,
        isColumnVisible,
        onRefresh,
        isManualRefreshing,
        onManualRefresh: async () => {
            setIsManualRefreshing(true);
            try { await onRefresh(); } catch (e) { console.error(e); }
            finally { setIsManualRefreshing(false); }
        },
        onSync: () => {
            setShowUtilMenu(false);
            intervalsSync.handleSync();
        },
        isSyncing: intervalsSync.isSyncing,
        bulkSelectedCount: bulk.bulkSelectedIds.size,
        onFindDuplicates: () => { dataImport.findDuplicates(); setShowUtilMenu(false); },
        onOpenNoPower: openNoPowerFilter,
        onClearDatabase: () => { handleClearDatabase(); setShowUtilMenu(false); },
        activitiesCount: activities?.length ?? 0,
        isDeleting,
        thisWeekOnly,
        onThisWeekOnlyChange: setThisWeekOnly,
        rollingDays,
        onRollingDaysChange: setRollingDays,
        stravaGetToken,
        stravaLinkedOnly,
        onStravaLinkedOnlyChange: setStravaLinkedOnly,
        noPowerOnly,
        onNoPowerOnlyChange: setNoPowerOnly,
        withPowerOnly,
        onWithPowerOnlyChange: setWithPowerOnly,
        highLoadOnly,
        onHighLoadOnlyChange: setHighLoadOnly,
        longRideOnly,
        onLongRideOnlyChange: setLongRideOnly,
        missingHrOnly,
        onMissingHrOnlyChange: setMissingHrOnly,
        minTss,
        onMinTssChange: setMinTss,
        gearFilterOptions,
        filterGearId,
        onFilterGearIdChange: setFilterGearId,
        activityLogRangesExpanded,
        onActivityLogRangesExpandedChange,
        metricRangeActive,
        clearMetricFilters,
        applyMetricPreset,
        filterDistMin,
        onFilterDistMinChange: setFilterDistMin,
        filterDistMax,
        onFilterDistMaxChange: setFilterDistMax,
        filterSpeedMin,
        onFilterSpeedMinChange: setFilterSpeedMin,
        filterSpeedMax,
        onFilterSpeedMaxChange: setFilterSpeedMax,
        filterPowerMin,
        onFilterPowerMinChange: setFilterPowerMin,
        filterPowerMax,
        onFilterPowerMaxChange: setFilterPowerMax,
        filterDurMinMin,
        onFilterDurMinMinChange: setFilterDurMinMin,
        filterDurMaxMin,
        onFilterDurMaxMinChange: setFilterDurMaxMin,
        filterElevMin,
        onFilterElevMinChange: setFilterElevMin,
        filterElevMax,
        onFilterElevMaxChange: setFilterElevMax,
        filterKjMin,
        onFilterKjMinChange: setFilterKjMin,
        filterKjMax,
        onFilterKjMaxChange: setFilterKjMax,
        onBulkEdit: () => {
            setEditingActivity(null);
            bulk.setShowBulkEditModal(true);
        },
        onExportCsv: bulk.exportBulkCsv,
        onMarkRecovery: bulk.markBulkRecovery,
        onStravaEnrich: () => bulk.runStravaEnrichSelected(bulk.selectedActivitiesForBulk),
        onMergePair: bulk.openMergeModal,
        onDeleteSelected: bulk.confirmBulkDeleteSelected,
        onClearSelection: () => bulk.setBulkSelectedIds(new Set()),
        isBulkSaving: bulk.isBulkSaving,
        isStravaEnriching: bulk.isStravaEnriching,
    };

    return (
        <div className="bg-cdsurface rounded-xl border border-cdborder shadow-xl overflow-hidden min-h-[500px] flex flex-col relative animate-in fade-in">
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
                    onFindOnStrava={stravaEnrich.handleFindOnStrava}
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
                showModal={dataImport.showModal}
                onClose={() => dataImport.setShowModal(false)}
                fetchedActivities={dataImport.fetchedActivities}
                selectedActivities={dataImport.selectedActivities}
                setSelectedActivities={dataImport.setSelectedActivities}
                toggleActivityTypeInPreview={dataImport.toggleActivityTypeInPreview}
                previewSortConfig={dataImport.previewSortConfig}
                requestPreviewSort={dataImport.requestPreviewSort}
                confirmImport={dataImport.confirmImport}
                rawData={dataImport.rawData}
                sortedFetchedActivities={dataImport.sortedFetchedActivities}
                profileFtp={profileFtp}
            />
            {dataImport.showDuplicateModal && (
                <DuplicateResolver
                    duplicates={dataImport.duplicates}
                    onResolve={dataImport.resolveDuplicate}
                    onClose={() => dataImport.setShowDuplicateModal(false)}
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
                    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
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
                    <ActivityLogTabPanel
                        intervalsSync={intervalsSync}
                        stravaListProgress={stravaEnrich.stravaListProgress}
                        bulk={bulk}
                        onOpenImportTab={() => setInternalTab('import')}
                        filterBarProps={filterBarProps}
                        isGroupedView={isGroupedView}
                        isolateActivityId={isolateActivityId}
                        logDateRangeFilter={logDateRangeFilter}
                        expandAllGrouped={expandAllGrouped}
                        collapseAllGrouped={collapseAllGrouped}
                        groupedActivities={groupedActivities}
                        isYearExpanded={isYearExpanded}
                        toggleYear={toggleYear}
                        clearActivityLogFilters={clearActivityLogFilters}
                        isolatedActivity={isolatedActivity}
                        rangeFilteredActivities={rangeFilteredActivities}
                        activities={activities}
                        processedActivities={processedActivities}
                        logTableActivities={logTableActivities}
                        logTableGrouped={logTableGrouped}
                        sortConfig={sortConfig}
                        requestSort={requestSort}
                        handleDeleteSingle={handleDeleteSingle}
                        setEditingActivity={setEditingActivity}
                        setDetailActivity={setDetailActivity}
                        isMonthExpanded={isMonthExpanded}
                        toggleMonth={toggleMonth}
                        onOpenProfilerFromActivity={onOpenProfilerFromActivity}
                        profilerClimbByActivityId={profilerClimbByActivityId}
                        profileFtp={profileFtp}
                        visibleColumns={visibleColumns}
                    />
                )}

                {internalTab === 'import' && (
                    <div role="tabpanel" id="tabpanel-import" aria-labelledby="tab-import" className="flex-1 overflow-hidden flex flex-col p-4">
                        <ImportSection
                            intervalsConfig={intervalsConfig}
                            stravaGetToken={stravaGetToken}
                            onDataDetected={dataImport.handleDataDetected}
                            onFetchedActivityFromUrl={dataImport.handleManualFetchedActivity}
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

            {stravaEnrich.showStravaEnrichPanel && stravaGetToken && (
                <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-cdbg/80 backdrop-blur-sm">
                    <button
                        type="button"
                        aria-label="Close Strava enrichment"
                        className="absolute inset-0 cursor-default"
                        onClick={() => stravaEnrich.closeStravaEnrichPanel()}
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
                                onClick={() => stravaEnrich.closeStravaEnrichPanel()}
                                className="shrink-0 px-3 py-1.5 text-xs font-bold rounded border border-cdborder text-cdmuted hover:text-cdtext hover:border-yellow-400/50 transition-colors focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none"
                            >
                                Close
                            </button>
                        </div>
                        <div className="p-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                            <StravaEnrichTab
                                activities={activities}
                                getStravaToken={stravaGetToken}
                                onImportNew={stravaEnrich.handleImportFromStrava}
                                onAfterStravaLink={onImport}
                                startDate={stravaEnrich.stravaSearchDates.startDate}
                                endDate={stravaEnrich.stravaSearchDates.endDate}
                                persistedResults={stravaEnrichResults}
                                onResultsChange={onStravaEnrichResults}
                                enrichmentTarget={stravaEnrich.enrichmentTarget}
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
