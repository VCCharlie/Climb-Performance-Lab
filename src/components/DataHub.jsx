import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Search, Loader2, AlertTriangle, Trash, Split, RefreshCw, ExternalLink, GitBranch, Zap, ChevronDown, ChevronRight, Link2, Download, GitMerge, Wrench, Edit2 } from 'lucide-react';
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from '../firebase';
import { findDuplicatesInList, runInBatches } from '../utils';
import { matchStravaToSite, STRAVA_BIKE_TYPES } from '../utils/stravaMatch';
import { protectEnrichedFieldsOnMerge } from '../utils/firestoreActivityMerge';
import { stravaHttpErrorMessage } from '../utils/stravaHttp';
import { activitiesToCsv } from '../utils/activityCsvExport';
import {
    mergeActivitiesIntervalsPrimary,
    isStravaOnlyActivityId,
    isLikelyIntervalsActivityId,
    stripUndefinedFields,
} from '../utils/mergeActivities';
import { enrichActivityGearFromStrava, buildStravaDetailEnrichmentUpdates } from '../utils/stravaGearEnrich';
import { resolveStravaGearDisplay } from '../utils/stravaBikesLocalMap';
import { buildClimbMatchIndex, findBestClimbUsingIndex } from '../utils/activityClimbMatch';
import { formatNlNumber } from '../utils/formatters';

import { SPORT_TYPES, MONTH_ORDER } from '../config';
import { CLIMB_DATABASE } from '../climbs';

// Sub-components
import EditActivityModal from './data-hub/EditActivityModal';
import BulkEditActivitiesModal from './data-hub/BulkEditActivitiesModal';
import ActivityTable from './data-hub/ActivityTable';
import ImportModal from './data-hub/ImportModal';
import DuplicateResolver from './data-hub/DuplicateResolver';
import QuickNav from './data-hub/QuickNav';
import ImportSection from './data-hub/ImportSection';
import ActivityDetailModal from './DataHub/ActivityDetailModal';
import StravaEnrichTab from './DataHub/StravaEnrichTab';
import StravaProfileTab from './DataHub/StravaProfileTab';

// Hooks
import useActivityFilter from '../hooks/useActivityFilter';
import useIntervalsSync from '../hooks/useIntervalsSync';

const DataHub = ({
    activities,
    onImport,
    onDelete,
    onClear,
    onRefresh,
    // githubPat,
    intervalsConfig, // New Prop
    stravaGetToken,
    startDate,
    endDate,
    stravaEnrichResults,
    onStravaEnrichResults,
    stravaAthleteId,
    stravaProfileData,
    onStravaProfileData,
    focusActivityId = null,
    onFocusActivityCleared,
    onOpenProfilerFromActivity,
    climbDatabaseForMatch = CLIMB_DATABASE,
    activityLogRangesExpanded = false,
    onActivityLogRangesExpandedChange,
    initialInternalTab = 'log',
}) => {
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
    const [showStravaEnrichPanel, setShowStravaEnrichPanel] = useState(false);
    const [bulkSelectedIds, setBulkSelectedIds] = useState(() => new Set());
    const [stravaListProgress, setStravaListProgress] = useState(null);
    const [showMergeModal, setShowMergeModal] = useState(false);
    const [mergeError, setMergeError] = useState(null);
    const [isMerging, setIsMerging] = useState(false);
    const [isGearBackfilling, setIsGearBackfilling] = useState(false);
    const [gearBackfillMsg, setGearBackfillMsg] = useState(null);
    const [showBulkEditModal, setShowBulkEditModal] = useState(false);
    const [isBulkSaving, setIsBulkSaving] = useState(false);

    // State for single-day Strava search (Tools → Strava enrichment panel)
    const [stravaDateOverride, setStravaDateOverride] = useState(null);
    const [enrichmentTarget, setEnrichmentTarget] = useState(null);

    const handleFindOnStrava = (activity) => {
        if (!activity || !activity.date) return;
        const activityDate = activity.date.split('T')[0];
        setEnrichmentTarget(activity);
        setStravaDateOverride(activityDate);
        setEditingActivity(null);
        setShowStravaEnrichPanel(true);
    };

    useEffect(() => {
        if (!showStravaEnrichPanel) {
            setStravaDateOverride(null);
            setEnrichmentTarget(null);
        }
    }, [showStravaEnrichPanel]);

    // Vanuit Dashboard: spring naar rit in het log en highlight kort
    useEffect(() => {
        if (!focusActivityId) return;
        setInternalTab('log');
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
        }, 200);
        return () => clearTimeout(t);
    }, [focusActivityId, onFocusActivityCleared]);

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

    // NEW DIRECT SYNC STATE
    const { syncIntervals, isSyncing, syncProgress } = useIntervalsSync(intervalsConfig);
    const [syncStatus, setSyncStatus] = useState(null);
    const [syncErrorDetail, setSyncErrorDetail] = useState(null);
    const [isManualRefreshing, setIsManualRefreshing] = useState(false);

    const {
        search, setSearch,
        indoorFilter, setIndoorFilter,
        sortConfig, requestSort,
        isYearExpanded, toggleYear,
        isMonthExpanded, toggleMonth,
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
    } = useActivityFilter(activities);

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

    const climbMatchIndex = useMemo(
        () => buildClimbMatchIndex(climbDatabaseForMatch || []),
        [climbDatabaseForMatch]
    );

    const profilerClimbByActivityId = useMemo(() => {
        const map = new Map();
        for (const a of activities || []) {
            if (!a?.id || !a.title) continue;
            const c = findBestClimbUsingIndex(a.title, climbMatchIndex);
            if (c) map.set(String(a.id), c);
        }
        return map;
    }, [activities, climbMatchIndex]);

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
        return processedActivities.map((a) => a.id).filter((id) => id != null).map((id) => String(id));
    }, [processedActivities, groupedActivities, isGroupedView, sortConfig.direction, isYearExpanded, isMonthExpanded]);

    const allVisibleSelected = visibleActivityIdsFlat.length > 0
        && visibleActivityIdsFlat.every((id) => bulkSelectedIds.has(id));

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
        [activities, bulkSelectedIds]
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
        setIsDeleting(true);
        try {
            ids.forEach((id) => onDelete(id));
            if (db) {
                await Promise.all(ids.map((id) => deleteDoc(doc(db, 'activities', String(id)))));
            }
            setBulkSelectedIds(new Set());
        } catch (e) {
            alert(`Could not delete: ${e.message || e}`);
        } finally {
            setIsDeleting(false);
        }
    }, [bulkSelectedIds, onDelete]);

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

    const confirmMergePair = async () => {
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
    };

    const runGearBackfillFromStrava = async (subset) => {
        const list = subset && subset.length > 0 ? subset : [];
        if (!stravaGetToken) return;
        if (list.length === 0) {
            setGearBackfillMsg('Select one or more activities that have a Strava link.');
            return;
        }
        const withStrava = list.filter((a) => a?.strava_id);
        if (withStrava.length === 0) {
            setGearBackfillMsg('Selected rows need a Strava activity id (link the ride first).');
            return;
        }
        setShowUtilMenu(false);
        setIsGearBackfilling(true);
        setGearBackfillMsg('Starting…');
        try {
            const token = await stravaGetToken();
            if (!token) {
                setGearBackfillMsg('Could not get Strava token.');
                return;
            }
            const {
                updates,
                ridesProcessed,
                unchanged,
                failed,
            } = await buildStravaDetailEnrichmentUpdates(withStrava, token, {
                concurrency: 3,
                onProgress: (m) => setGearBackfillMsg(m),
            });
            if (updates.length === 0) {
                if (failed > 0) {
                    setGearBackfillMsg(
                        `No fields updated (${formatNlNumber(failed)} detail request(s) failed — check connection or Strava rate limits). ${formatNlNumber(unchanged)} already matched Strava.`
                    );
                } else {
                    setGearBackfillMsg(
                        `Nothing new from Strava for ${formatNlNumber(unchanged)} selected ride(s) — gear, route, and id already match the API (or Strava returned no bike / map).`
                    );
                }
                return;
            }
            setGearBackfillMsg(`Writing ${updates.length} activities…`);
            const CHUNK = 25;
            for (let i = 0; i < updates.length; i += CHUNK) {
                const slice = updates.slice(i, i + CHUNK);
                if (db) {
                    await Promise.all(
                        slice.map(({ id, data }) =>
                            setDoc(doc(db, 'activities', String(id)), data, { merge: true })
                        )
                    );
                }
                const mergedObjs = slice.map(({ id, data }) => {
                    const prev = withStrava.find((a) => String(a.id) === String(id))
                        || activities.find((a) => String(a.id) === String(id));
                    return { ...(prev || {}), ...data };
                });
                onImport(mergedObjs);
            }
            setGearBackfillMsg(
                `Done: updated ${formatNlNumber(updates.length)} of ${formatNlNumber(ridesProcessed)} selected ride(s) from Strava (gear, bike name, route for Climb Profiler when the API returns them).`
            );
        } catch (e) {
            console.error('[Gear backfill]', e);
            setGearBackfillMsg(`Error: ${e.message || e}`);
        } finally {
            setIsGearBackfilling(false);
        }
    };

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

            const results = await runInBatches(list, 15, async (act) => {
                const prev = (activities || []).find((a) => String(a.id) === String(act.id)) || act;
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

    // --- 1. STANDALONE STRAVA ENRICHMENT FUNCTIE ---
    const performSilentStravaEnrichment = async (actsToEnrich, customStart, customEnd) => {
        if (!stravaGetToken) return 0;
        try {
            const token = await stravaGetToken();
            if (!token) return 0;

            const start = customStart || startDate;
            const end = customEnd || endDate;

            const afterTs = Math.floor(new Date(start).getTime() / 1000);
            const beforeTs = Math.floor(new Date(end).getTime() / 1000) + 86400;

            // 1. Haal Strava activiteiten op (List view)
            let page = 1;
            let allActivities = [];
            try {
                setStravaListProgress({ page: 1, bikeCount: 0 });
                while (true) {
                    const resp = await fetch(
                        `https://www.strava.com/api/v3/athlete/activities?after=${afterTs}&before=${beforeTs}&per_page=200&page=${page}`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    if (!resp.ok) {
                        if (resp.status === 429) {
                            throw new Error(stravaHttpErrorMessage(resp, 'Strava'));
                        }
                        break;
                    }
                    const data = await resp.json();
                    if (!Array.isArray(data) || data.length === 0) break;
                    allActivities = allActivities.concat(data);
                    const bikeSoFar = allActivities.filter((a) => STRAVA_BIKE_TYPES.has(a.sport_type || a.type)).length;
                    setStravaListProgress({ page, bikeCount: bikeSoFar });
                    if (data.length < 200) break;
                    page++;
                }
            } finally {
                setStravaListProgress(null);
            }

            const bikeActivities = allActivities.filter(a => {
                if (!STRAVA_BIKE_TYPES.has(a.sport_type || a.type)) return false;
                const noPower = !a.average_watts || a.average_watts === 0;
                const isShort = !a.distance || (a.distance / 1000) < 5;
                if (noPower && isShort) return false;
                return true;
            });

            if (bikeActivities.length === 0) return 0;

            // 2. Haal Fietsnamen (Gear) op
            const bikesMap = {};
            try {
                const athleteResp = await fetch('https://www.strava.com/api/v3/athlete', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (athleteResp.ok) {
                    const athleteData = await athleteResp.json();
                    (athleteData.bikes || []).forEach(b => {
                        bikesMap[b.id] = b.name || 'Bike';
                    });
                }

                const uniqueGearIds = [...new Set(bikeActivities.map(a => a.gear_id).filter(id => id && !bikesMap[id]))];
                if (uniqueGearIds.length > 0) {
                    await Promise.all(uniqueGearIds.map(async gid => {
                        try {
                            const r = await fetch(`https://www.strava.com/api/v3/gear/${gid}`, {
                                headers: { Authorization: `Bearer ${token}` }
                            });
                            if (r.ok) {
                                const g = await r.json();
                                bikesMap[gid] = g.name || [g.brand_name, g.model_name].filter(Boolean).join(' ') || 'Bike';
                            }
                        } catch { /* ignore */ }
                    }));
                }
                if (Object.keys(bikesMap).length > 0) {
                    localStorage.setItem('stravaBikesMap', JSON.stringify(bikesMap));
                }
            } catch (err) { console.warn("[Silent Enrichment] Gear fetch failed", err); }

            // 3. Match
            const result = matchStravaToSite(bikeActivities, actsToEnrich);
            const candidates = [];

            // Case A: Nieuw gematched (fuzzy)
            if (result?.matched?.length > 0) {
                candidates.push(...result.matched.filter(m => m.confidence !== 'low'));
            }
            // Case B: Al gekoppeld maar misschien data-update nodig
            if (result?.alreadyLinked?.length > 0) {
                candidates.push(...result.alreadyLinked);
            }

            if (candidates.length === 0) return 0;

            // 4. CRITIEK: RPE + HR zitten niet in de lijst-API.
            // We halen voor alle kandidaten de DETAILS op als er data ontbreekt.
            const toEnrichFinal = [];

            await runInBatches(candidates, 5, async (m) => {
                const siteNeedsRpe = !m.site.rpe || m.site.rpe === 0;
                const siteNeedsHr = !m.site.avg_hr || m.site.avg_hr === 0;
                const siteNeedsGear = !m.site.gear_id && !!m.strava.gear_id;
                const stravaListTitle = (m.strava.name || '').trim();
                const titleDiffersFromStrava =
                    !!stravaListTitle && m.site.title !== stravaListTitle;

                // Overslaan alleen als data compleet is én titel al gelijk is aan Strava (Strava-titel is leidend)
                if (m.site.strava_id && !siteNeedsRpe && !siteNeedsGear && !siteNeedsHr && !titleDiffersFromStrava) return;

                // Haal details op van Strava (voor RPE + volledige HR)
                let stravaDetailed = m.strava;
                try {
                    const detResp = await fetch(`https://www.strava.com/api/v3/activities/${m.strava.id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (detResp.ok) {
                        stravaDetailed = await detResp.json();
                    }
                } catch { console.warn("Detail fetch failed for Strava", m.strava.id); }

                const gearId = stravaDetailed.gear_id || null;
                const gearName = gearId ? (bikesMap[gearId] || 'Strava bike') : null;

                const stravaTitle = (stravaDetailed.name || '').trim();
                const updateData = {
                    strava_id: String(stravaDetailed.id),
                    strava_map: stravaDetailed.map?.summary_polyline || m.site.strava_map || null,
                    type: stravaDetailed.sport_type || stravaDetailed.type || m.site.type,
                    ...(gearId && { gear_id: gearId, gear_name: gearName }),
                    ...(stravaTitle && { title: stravaTitle }),
                    // RPE alleen invullen als site deze nog niet heeft én Strava heeft 'm wél
                    ...(siteNeedsRpe && stravaDetailed.perceived_exertion && { rpe: stravaDetailed.perceived_exertion }),
                    // HR alleen invullen als site deze nog niet heeft én Strava heeft 'm wél
                    ...(siteNeedsHr && stravaDetailed.average_heartrate && { avg_hr: Math.round(stravaDetailed.average_heartrate) }),
                    ...((!m.site.max_hr || m.site.max_hr === 0) && stravaDetailed.max_heartrate && { max_hr: Math.round(stravaDetailed.max_heartrate) })
                };

                // Filter out if no actual changes
                const hasChanges = Object.keys(updateData).some(k => updateData[k] !== m.site[k]);
                if (hasChanges) {
                    Object.assign(m.site, updateData);
                    toEnrichFinal.push({ id: m.site.id, data: updateData });
                }
            });

            if (toEnrichFinal.length > 0 && db) {
                await Promise.all(toEnrichFinal.map(({ id, data }) =>
                    setDoc(doc(db, 'activities', String(id)), data, { merge: true })
                ));
                return toEnrichFinal.length;
            }
        } catch (err) {
            console.error("[Silent Enrichment] Failed:", err);
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

        console.log(`[Auto-Enrichment] ${needsEnrichment.length} activiteiten missen data, background verrijking starten...`);
        performSilentStravaEnrichment(activities.filter(a => {
            const d = a.date?.split('T')[0];
            return d && d >= autoStart && d <= autoEnd;
        }), autoStart, autoEnd).then(count => {
            if (count > 0) {
                console.log(`[Auto-Enrichment] ✅ ${count} activiteiten automatisch verrijkt met Strava data.`);
            }
        }).catch(err => {
            console.warn("[Auto-Enrichment] Achtergrond verrijking mislukt:", err.message);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stravaGetToken, activities]);

    // --- 2. REFACTORED DIRECT SYNC TRIGGER ---
    const handleSync = async () => {
        setShowUtilMenu(false);
        setSyncStatus('started');
        setSyncErrorDetail('Step 1/2: Fetching new rides (last 14 days)...');

        try {
            const sportFilters = SPORT_TYPES.reduce((acc, type) => ({ ...acc, [type]: true }), {});
            const selectedTypes = Object.keys(sportFilters).filter(k => sportFilters[k]);

            // NIEUW: Altijd de laatste 14 dagen voor Sync Now (ongeacht dashboard periode)
            const today = new Date();
            const syncEnd = today.toISOString().split('T')[0];
            const fourteenDaysAgo = new Date();
            fourteenDaysAgo.setDate(today.getDate() - 14);
            const syncStart = fourteenDaysAgo.toISOString().split('T')[0];

            // 1. Haal nieuwe ritten op van Intervals
            const newActivities = await syncIntervals(syncStart, syncEnd, selectedTypes);

            // 2. Bepaal welke bestaande ritten (in dashboard) we mee willen sturen naar Strava check
            // We sturen ALLE ritten in het venster mee, de verrijking filtert zelf of er wat moet gebeuren.
            const existingInWindow = (activities || []).filter(act => {
                const actDate = act.date?.split('T')[0];
                return actDate >= syncStart && actDate <= syncEnd;
            });

            const totalCheckList = [...newActivities, ...existingInWindow];

            if (totalCheckList.length === 0) {
                setSyncStatus('done');
                setSyncErrorDetail('✅ You are up to date. No activities in the last 14 days.');
                setTimeout(() => setSyncStatus(null), 5000);
                return;
            }

            setSyncErrorDetail(`Step 2/2: ${newActivities.length} new ride(s) found. Enriching with Strava...`);
            setSyncStatus('enriching');

            // De performSilentStravaEnrichment functie doet de matching, detail fetches en Firestore writes.
            // Het update ook de objecten in de array IN-PLACE.
            const enrichedCount = await performSilentStravaEnrichment(totalCheckList, syncStart, syncEnd);

            // 3. Save new rides: same object references as enrichment mutated (Strava fields), then protect vs any prior row
            if (db && newActivities.length > 0) {
                await Promise.all(newActivities.map((act) => {
                    const existing = (activities || []).find((a) => String(a.id) === String(act.id));
                    const payload = protectEnrichedFieldsOnMerge(act, existing);
                    return setDoc(doc(db, 'activities', String(act.id)), payload, { merge: true });
                }));
            }

            // Update local state with enriched objects (not a fresh copy from the API)
            const allUpdated = [...newActivities];
            // Voeg bestaande ritten toe die tijdens de silent enrichment zijn aangepast (strava_id nu aanwezig of rpe gewijzigd)
            existingInWindow.forEach(act => {
                // We kunnen checken of act gemuteerd is. Een simpele manier is kijken of er iets is toegevoegd.
                // In performSilentStravaEnrichment doen we Object.assign(m.site, updateData).
                allUpdated.push(act);
            });

            if (allUpdated.length > 0) {
                onImport(allUpdated);
            }

            setSyncStatus('done');
            setSyncErrorDetail(`✅ Sync complete. ${newActivities.length} new, ${enrichedCount} ride(s) updated with Strava data.`);
            setTimeout(() => setSyncStatus(null), 8000);

        } catch (e) {
            console.error('Sync failed:', e);
            setSyncStatus('error');
            setSyncErrorDetail(`❌ Error: ${e.message}`);
        }
    };


    // --- OVERIGE BESTAANDE ACTIONS (Ongewijzigd) ---
    const handleImportFromStrava = async (newActs) => {
        if (!newActs || newActs.length === 0) return;
        onImport(newActs);
        if (db) {
            try {
                await Promise.all(newActs.map(act => {
                    const existing = (activities || []).find(a => String(a.id) === String(act.id));
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
        const handler = (e) => {
            if (utilMenuRef.current && !utilMenuRef.current.contains(e.target)) {
                setShowUtilMenu(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

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
        let replacedCount = 0;
        const idsToDelete = [];

        if (activities && activities.length > 0) {
            toImport.forEach(newAct => {
                const newDate = newAct.date.split('T')[0];
                const duplicate = activities.find(existing => {
                    if (existing.id === newAct.id) return false;
                    const exDate = existing.date.split('T')[0];
                    if (exDate !== newDate) return false;
                    if (existing.type !== newAct.type && existing.type !== 'Ride' && newAct.type !== 'Ride') return false;
                    const timeDiff = Math.abs((existing.moving_time || 0) - (newAct.moving_time || 0));
                    const distDiff = Math.abs((existing.distance || 0) - (newAct.distance || 0));
                    return timeDiff < 300 && distDiff < 0.5;
                });

                if (duplicate) {
                    idsToDelete.push(duplicate.id);
                    replacedCount++;
                }
            });
        }

        if (idsToDelete.length > 0) {
            idsToDelete.forEach(id => onDelete(id));
            if (db) {
                try {
                    await Promise.all(idsToDelete.map(id => deleteDoc(doc(db, "activities", String(id)))));
                } catch (e) { console.error("Failed to delete duplicates from FB:", e); }
            }
        }

        onImport(toImport);

        if (db) {
            try {
                const writePromises = toImport.map(act => {
                    if (!act.id) return Promise.resolve();
                    const existing = (activities || []).find(a => String(a.id) === String(act.id));
                    const payload = protectEnrichedFieldsOnMerge(act, existing);
                    return setDoc(doc(db, "activities", String(act.id)), payload, { merge: true });
                });
                await Promise.all(writePromises);
                savedCount = toImport.length;
            } catch (e) {
                alert("Note: Data imported locally, but cloud backup failed: " + e.message);
            }
        }

        setShowModal(false);
        setFetchedActivities([]);
        setInternalTab('log');
        alert(`Import Successful!\n\nImported: ${savedCount}\nReplaced Duplicates: ${replacedCount}`);
    };

    const [previewSortConfig, setPreviewSortConfig] = useState({ key: 'date', direction: 'desc' });
    const requestPreviewSort = (key) => setPreviewSortConfig({ key, direction: previewSortConfig.key === key && previewSortConfig.direction === 'desc' ? 'asc' : 'desc' });
    const sortedFetchedActivities = React.useMemo(() => {
        if (!fetchedActivities) return [];
        const list = [...fetchedActivities];
        if (previewSortConfig.key) {
            list.sort((a, b) => {
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
    }, [fetchedActivities, previewSortConfig]);


    return (
        <div className="bg-cdsurface rounded-xl border border-cdborder shadow-xl overflow-hidden min-h-[500px] flex flex-col relative animate-in fade-in">
            {/* MODALS */}
            {detailActivity && (
                <ActivityDetailModal
                    activity={detailActivity}
                    onClose={() => setDetailActivity(null)}
                    getStravaToken={stravaGetToken}
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
            {showBulkEditModal && (
                <BulkEditActivitiesModal
                    count={bulkSelectedIds.size}
                    allActivities={activities}
                    onClose={() => setShowBulkEditModal(false)}
                    onApply={handleBulkApplyPatch}
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
            />
            {showDuplicateModal && (
                <DuplicateResolver
                    duplicates={duplicates}
                    onResolve={resolveDuplicate}
                    onClose={() => setShowDuplicateModal(false)}
                />
            )}

            {/* No Power Modal */}
            {showNoPowerModal && (() => {
                const noPowerList = (activities || []).filter(a => !(Number(a.avg_power) > 0));
                const allSelected = noPowerList.every(a => noPowerSelected.includes(a.id));
                const toggleAll = () => setNoPowerSelected(allSelected ? [] : noPowerList.map(a => a.id));
                const toggleOne = (id) => setNoPowerSelected(prev =>
                    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                );
                return (
                    <div className="fixed inset-0 bg-cdbg/95 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-cdsurface border border-cdborder rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]">
                            <div className="flex justify-between items-center p-4 border-b border-cdborder">
                                <div>
                                    <h3 className="text-cdtext font-bold flex items-center gap-2">
                                        <Zap size={16} className="text-yellow-400" />
                                        Activities without power ({noPowerList.length})
                                    </h3>
                                    <p className="text-xs text-cdmuted mt-0.5">Select which ones to remove.</p>
                                </div>
                                <button aria-label="Close modal" onClick={() => setShowNoPowerModal(false)} className="text-cdmuted hover:text-cdtext text-lg font-bold px-2 focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none rounded">✕</button>
                            </div>
                            <div className="flex items-center gap-3 px-4 py-2 border-b border-cdborder bg-cdbg/40">
                                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-yellow-400 w-4 h-4" />
                                <span className="text-xs text-cdmuted font-bold uppercase">Select all</span>
                                <span className="ml-auto text-xs text-cdmuted">{noPowerSelected.length} selected</span>
                            </div>
                            <div className="overflow-y-auto flex-1 custom-scrollbar">
                                {noPowerList.map(a => (
                                    <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-cdborder/40 hover:bg-cdborder/20">
                                        <input
                                            type="checkbox"
                                            checked={noPowerSelected.includes(a.id)}
                                            onChange={() => toggleOne(a.id)}
                                            className="accent-yellow-400 w-4 h-4 shrink-0"
                                        />
                                        <span className="text-xs text-cdmuted w-24 shrink-0">{a.date}</span>
                                        <span className="text-sm text-cdtext flex-1 truncate">{a.title || 'Untitled'}</span>
                                        <span className="text-xs text-cdmuted w-16 text-right shrink-0">{a.distance ? `${a.distance} km` : '-'}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end gap-3 p-4 border-t border-cdborder">
                                <button onClick={() => setShowNoPowerModal(false)} className="px-4 py-2 text-cdmuted hover:text-cdtext font-bold text-sm">Close</button>
                                <button
                                    onClick={deleteNoPowerSelected}
                                    disabled={isDeleting || noPowerSelected.length === 0}
                                    className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded text-sm flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isDeleting ? <Loader2 className="animate-spin" size={14} /> : <Trash size={14} />}
                                    Delete {noPowerSelected.length} activities
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {showMergeModal && (
                <div className="fixed inset-0 bg-cdbg/95 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-cdsurface border border-cdborder rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-4 border-b border-cdborder">
                            <h3 className="text-cdtext font-bold flex items-center gap-2 text-sm">
                                <GitMerge size={18} className="text-orange-400 shrink-0" />
                                Merge two activities
                            </h3>
                            <button
                                type="button"
                                aria-label="Close modal"
                                onClick={() => { setShowMergeModal(false); setMergeError(null); }}
                                className="text-cdmuted hover:text-cdtext text-lg font-bold px-2 focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none rounded"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-4 space-y-3 text-xs text-cdmuted overflow-y-auto custom-scrollbar">
                            <p>
                                Keeps the <strong className="text-cdtext">Intervals.icu</strong> activity id and power/load metrics.
                                Pulls in <strong className="text-cdtext">Strava</strong> link, map polyline, gear, and a better title when the Intervals title is generic.
                                After merge, if you are signed in to Strava, we fetch activity details to fill <strong className="text-cdtext">gear</strong> and route polyline when missing.
                                The duplicate Strava-only row is <strong className="text-red-400">deleted</strong> from the database.
                            </p>
                            {mergePairPreview?.error && (
                                <div className="rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 px-3 py-2">{mergePairPreview.error}</div>
                            )}
                            {mergePairPreview && !mergePairPreview.error && (
                                <>
                                    <div className="rounded-lg border border-cdborder bg-cdbg/40 p-2 space-y-1">
                                        <div className="text-[10px] font-bold text-cdaccent uppercase">Keep (Intervals)</div>
                                        <div className="text-cdtext font-mono text-[11px]">id {mergePairPreview.intervals.id}</div>
                                        <div className="text-cdtext truncate">{mergePairPreview.intervals.title || '—'}</div>
                                    </div>
                                    <div className="rounded-lg border border-cdborder bg-cdbg/40 p-2 space-y-1">
                                        <div className="text-[10px] font-bold text-orange-400 uppercase">Remove after merge (Strava import)</div>
                                        <div className="text-cdtext font-mono text-[11px]">id {mergePairPreview.stravaSide.id}</div>
                                        <div className="text-cdtext truncate">{mergePairPreview.stravaSide.title || '—'}</div>
                                        {mergePairPreview.stravaSide.strava_id && (
                                            <div className="text-[10px]">strava_id {mergePairPreview.stravaSide.strava_id}</div>
                                        )}
                                    </div>
                                </>
                            )}
                            {mergeError && (
                                <div className="rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 px-3 py-2">{mergeError}</div>
                            )}
                        </div>
                        <div className="flex justify-end gap-2 p-4 border-t border-cdborder">
                            <button
                                type="button"
                                onClick={() => { setShowMergeModal(false); setMergeError(null); }}
                                className="px-4 py-2 text-cdmuted hover:text-cdtext font-bold text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={!mergePairPreview || !!mergePairPreview.error || isMerging || !db}
                                onClick={confirmMergePair}
                                className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm disabled:opacity-40 flex items-center gap-2"
                            >
                                {isMerging ? <Loader2 size={14} className="animate-spin" /> : <GitMerge size={14} />}
                                Merge &amp; delete duplicate
                            </button>
                        </div>
                        {!db && (
                            <p className="px-4 pb-3 text-[10px] text-yellow-500">Sign in and sync is required to write merges to the database.</p>
                        )}
                    </div>
                </div>
            )}

            {/* TABS */}
            <div className="flex border-b border-cdborder">
                <button onClick={() => setInternalTab('log')} className={`flex-1 py-3 text-sm font-bold ${internalTab === 'log' ? 'bg-cdborder text-yellow-400' : 'text-cdmuted hover:bg-cdborder/50'}`}>Activity Log</button>
                {stravaGetToken && (
                    <button onClick={() => setInternalTab('strava-profile')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-1.5 ${internalTab === 'strava-profile' ? 'bg-cdborder text-orange-400' : 'text-cdmuted hover:bg-cdborder/50'}`}>
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" /></svg>
                        Strava Profile
                    </button>
                )}
                <button onClick={() => setInternalTab('import')} className={`flex-1 py-3 text-sm font-bold ${internalTab === 'import' ? 'bg-cdborder text-yellow-400' : 'text-cdmuted hover:bg-cdborder/50'}`}>Import Data</button>
            </div>

            <div className="p-4 flex-1 overflow-hidden flex flex-col">
                {internalTab === 'log' && (
                    <>
                        {/* DYNAMISCHE SYNC STATUS BANNER */}
                        {syncStatus && (
                            <div className={`flex flex-col gap-1 text-xs font-bold px-3 py-2 rounded-lg mb-3 ${syncStatus === 'success' || syncStatus === 'done' || syncStatus === 'enriching' || syncStatus === 'started'
                                ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
                                : 'bg-red-500/10 border border-red-500/30 text-red-400'
                                }`}
                            >
                                <span className="flex items-center gap-2">
                                    {(syncStatus === 'started' || syncStatus === 'enriching' || isSyncing) && <Loader2 size={14} className="animate-spin" />}
                                    {syncStatus === 'done' && '✅ '}
                                    {syncStatus === 'error' && '❌ '}
                                    {isSyncing ? (syncProgress || 'Syncing...') : syncErrorDetail}
                                </span>
                                {stravaListProgress && (
                                    <span className="text-[10px] font-normal text-cdmuted">
                                        Strava list: page {stravaListProgress.page} · ~{formatNlNumber(stravaListProgress.bikeCount)} bike activities loaded so far…
                                    </span>
                                )}
                            </div>
                        )}
                        {(isGearBackfilling || gearBackfillMsg) && (
                            <div className={`flex flex-col gap-1 text-xs px-3 py-2 rounded-lg mb-3 border ${isGearBackfilling ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' : 'bg-cdbg/80 border-cdborder text-cdmuted'}`}>
                                <span className="flex items-center gap-2 font-bold text-cdtext">
                                    {isGearBackfilling && <Loader2 size={14} className="animate-spin text-amber-400" />}
                                    Strava gear backfill
                                </span>
                                <span className="text-[11px] leading-snug">{gearBackfillMsg}</span>
                                {!isGearBackfilling && gearBackfillMsg && (
                                    <button
                                        type="button"
                                        onClick={() => setGearBackfillMsg(null)}
                                        className="self-end text-[10px] text-cdmuted hover:text-cdtext underline"
                                    >
                                        Dismiss
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="space-y-3 mb-4">
                            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
                                <div className="flex gap-2 w-full md:w-auto flex-1 min-w-0">
                                    <div className="relative flex-1 min-w-0">
                                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-cdmuted" />
                                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search (name or 4-2-2024)..." className="w-full bg-cdbg border border-cdborder rounded pl-10 pr-4 py-2 text-sm text-cdtext outline-none focus:border-yellow-400" />
                                    </div>
                                    <div className="flex bg-cdbg rounded border border-cdborder p-1 shrink-0">
                                        <button onClick={() => { setIndoorFilter('all'); setVirtualRideChip(false); }} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${indoorFilter === 'all' ? 'bg-cdborder text-cdtext shadow' : 'text-cdmuted hover:text-cdtext'}`}>All</button>
                                        <button onClick={() => { setIndoorFilter('outdoor'); setVirtualRideChip(false); }} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${indoorFilter === 'outdoor' ? 'bg-green-600 text-cdtext shadow' : 'text-cdmuted hover:text-cdtext'}`}>Out</button>
                                        <button onClick={() => { setIndoorFilter('indoor'); setVirtualRideChip(false); }} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${indoorFilter === 'indoor' ? 'bg-orange-600 text-cdtext shadow' : 'text-cdmuted hover:text-cdtext'}`}>In</button>
                                    </div>
                                </div>
                                <div className="flex gap-2 shrink-0 w-full md:w-auto justify-end">
                                    {onRefresh && (
                                        <button
                                            onClick={async () => {
                                                setIsManualRefreshing(true);
                                                try { await onRefresh(); } catch (e) { console.error(e); }
                                                finally { setIsManualRefreshing(false); }
                                            }}
                                            disabled={isManualRefreshing}
                                            className="flex items-center justify-center w-9 h-9 rounded border bg-cdsurface border-cdborder text-cdmuted hover:text-green-400 hover:border-green-500/50 transition-colors group disabled:opacity-50"
                                            title="Refresh data"
                                        >
                                            <RefreshCw size={14} className={isManualRefreshing ? 'animate-spin' : 'group-active:animate-spin'} />
                                        </button>
                                    )}
                                    <div className={`relative flex-1 min-w-0 md:flex-none md:w-auto max-w-full ${showUtilMenu ? 'z-[60]' : ''}`} ref={utilMenuRef}>
                                        <button
                                            type="button"
                                            onClick={() => setShowUtilMenu(v => !v)}
                                            className="flex items-center justify-center gap-1.5 px-3 h-9 w-full md:w-auto rounded text-sm font-bold border bg-cdsurface border-cdborder text-cdtext hover:border-yellow-400 transition-all"
                                        >
                                            Tools <ChevronDown size={14} className={showUtilMenu ? 'rotate-180 transition-transform' : 'transition-transform'} />
                                        </button>
                                        {showUtilMenu && (
                                            <div className="absolute left-0 right-0 md:left-auto md:right-0 top-full mt-1 w-full min-w-[min(100%,16rem)] md:w-56 max-w-[calc(100vw-2rem)] md:max-w-none bg-cdsurface border border-cdborder rounded-lg shadow-xl z-[70] overflow-hidden">
                                                <button
                                                    onClick={handleSync}
                                                    disabled={isSyncing}
                                                    title={'Sync activities from Intervals.icu'}
                                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-blue-400 hover:bg-cdborder disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                                                    {isSyncing ? 'Working...' : 'Sync Now'}
                                                </button>
                                            {stravaGetToken && (
                                                <button
                                                    type="button"
                                                    onClick={() => { setShowStravaEnrichPanel(true); setShowUtilMenu(false); }}
                                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-orange-400 hover:bg-cdborder"
                                                >
                                                    <Link2 size={14} /> Strava enrichment
                                                </button>
                                            )}
                                                <button
                                                    onClick={() => { findDuplicates(); setShowUtilMenu(false); }}
                                                    disabled={!activities || activities.length === 0}
                                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-orange-400 hover:bg-cdborder disabled:opacity-40"
                                                >
                                                    <Split size={14} /> Duplicates
                                                </button>
                                                <button
                                                    onClick={openNoPowerFilter}
                                                    disabled={!activities || activities.length === 0}
                                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-yellow-400 hover:bg-cdborder disabled:opacity-40"
                                                >
                                                    <Zap size={14} /> No Power
                                                </button>
                                                <div className="border-t border-cdborder" />
                                                <button
                                                    onClick={() => { handleClearDatabase(); setShowUtilMenu(false); }}
                                                    disabled={isDeleting || !activities || activities.length === 0}
                                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-cdborder disabled:opacity-40"
                                                >
                                                    {isDeleting ? <Loader2 className="animate-spin" size={14} /> : <Trash size={14} />}
                                                    Clear DB
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-bold text-cdmuted uppercase shrink-0">Quick</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setThisWeekOnly((v) => !v);
                                        setRollingDays(null);
                                    }}
                                    className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${thisWeekOnly ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400' : 'border-cdborder text-cdmuted hover:text-cdtext'}`}
                                >
                                    This week
                                </button>
                                {[7, 14, 30].map((d) => (
                                    <button
                                        key={d}
                                        type="button"
                                        onClick={() => {
                                            setRollingDays((cur) => (cur === d ? null : d));
                                            setThisWeekOnly(false);
                                        }}
                                        className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${rollingDays === d ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'border-cdborder text-cdmuted hover:text-cdtext'}`}
                                    >
                                        Last {d}d
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setStravaLinkedOnly((v) => !v)}
                                    disabled={!stravaGetToken}
                                    className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${stravaLinkedOnly ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' : 'border-cdborder text-cdmuted hover:text-cdtext'} disabled:opacity-40`}
                                >
                                    Strava link
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setNoPowerOnly((v) => {
                                            const next = !v;
                                            if (next) setWithPowerOnly(false);
                                            return next;
                                        });
                                    }}
                                    className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${noPowerOnly ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'border-cdborder text-cdmuted hover:text-cdtext'}`}
                                >
                                    No power
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setWithPowerOnly((v) => {
                                            const next = !v;
                                            if (next) setNoPowerOnly(false);
                                            return next;
                                        });
                                    }}
                                    className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${withPowerOnly ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'border-cdborder text-cdmuted hover:text-cdtext'}`}
                                >
                                    With power
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setHighLoadOnly((v) => !v)}
                                    title="Load (TSS) &gt; 120"
                                    className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${highLoadOnly ? 'bg-purple-500/20 border-purple-500/50 text-purple-400' : 'border-cdborder text-cdmuted hover:text-cdtext'}`}
                                >
                                    High load
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLongRideOnly((v) => !v)}
                                    title="Distance &gt; 100 km"
                                    className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${longRideOnly ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'border-cdborder text-cdmuted hover:text-cdtext'}`}
                                >
                                    Long ride
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMissingHrOnly((v) => !v)}
                                    title="Avg HR missing or zero"
                                    className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${missingHrOnly ? 'bg-rose-500/20 border-rose-500/50 text-rose-400' : 'border-cdborder text-cdmuted hover:text-cdtext'}`}
                                >
                                    No HR
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (virtualRideChip) {
                                            setVirtualRideChip(false);
                                            setIndoorFilter('all');
                                        } else {
                                            setVirtualRideChip(true);
                                            setIndoorFilter('indoor');
                                        }
                                    }}
                                    className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${virtualRideChip ? 'bg-orange-600/25 border-orange-500/50 text-orange-300' : 'border-cdborder text-cdmuted hover:text-cdtext'}`}
                                >
                                    Virtual only
                                </button>
                                <label className="flex items-center gap-1.5 text-[10px] text-cdmuted">
                                    <span className="font-bold uppercase shrink-0">TSS &gt;</span>
                                    <input
                                        type="number"
                                        min={0}
                                        step={1}
                                        placeholder="—"
                                        value={minTss}
                                        onChange={(e) => setMinTss(e.target.value)}
                                        className="w-14 bg-cdbg border border-cdborder rounded px-1.5 py-0.5 text-cdtext text-[10px]"
                                    />
                                </label>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[10px]">
                                <label className="flex items-center gap-2 text-cdmuted min-w-0 flex-1 sm:flex-none sm:max-w-md">
                                    <span className="font-bold uppercase text-[9px] shrink-0">Gear</span>
                                    <select
                                        value={filterGearId}
                                        onChange={(e) => setFilterGearId(e.target.value)}
                                        className="min-w-0 flex-1 bg-cdbg border border-cdborder rounded px-2 py-1 text-cdtext text-[10px]"
                                        title="Filter by Strava bike (gear_id)"
                                    >
                                        <option value="">All bikes</option>
                                        {gearFilterOptions.map(({ id, label }) => (
                                            <option key={id} value={id}>{label}</option>
                                        ))}
                                    </select>
                                </label>
                                {filterGearId && (
                                    <button
                                        type="button"
                                        onClick={() => setFilterGearId('')}
                                        className="text-[9px] text-orange-400 hover:text-orange-300 underline shrink-0"
                                    >
                                        Clear gear
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-col gap-2 border border-cdborder/60 rounded-lg p-2 bg-cdbg/20">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <button
                                        type="button"
                                        onClick={() => onActivityLogRangesExpandedChange?.(!activityLogRangesExpanded)}
                                        className="flex items-center gap-1.5 text-left shrink-0 text-[10px] font-bold text-cdtext uppercase hover:text-cdaccent"
                                        aria-expanded={activityLogRangesExpanded}
                                    >
                                        {activityLogRangesExpanded ? <ChevronDown size={14} className="text-cdmuted" /> : <ChevronRight size={14} className="text-cdmuted" />}
                                        Ranges
                                    </button>
                                    <span className="text-[9px] text-cdmuted hidden sm:inline">Dist · Spd · Pwr · Dur · Elev · kJ</span>
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 ml-auto">
                                        <button
                                            type="button"
                                            onClick={() => onActivityLogRangesExpandedChange?.(true)}
                                            className="text-[9px] font-bold text-cdmuted hover:text-cdtext underline"
                                        >
                                            Expand
                                        </button>
                                        <span className="text-cdborder">|</span>
                                        <button
                                            type="button"
                                            onClick={() => onActivityLogRangesExpandedChange?.(false)}
                                            className="text-[9px] font-bold text-cdmuted hover:text-cdtext underline"
                                        >
                                            Collapse
                                        </button>
                                        {metricRangeActive && (
                                            <button
                                                type="button"
                                                onClick={clearMetricFilters}
                                                className="text-[9px] text-orange-400 hover:text-orange-300 underline"
                                            >
                                                Clear ranges
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {activityLogRangesExpanded && (
                                <>
                                <div className="flex flex-wrap items-end gap-x-3 gap-y-2 text-[10px] text-cdmuted">
                                    <label className="flex flex-col gap-0.5">
                                        <span className="font-bold uppercase text-[9px]">Dist</span>
                                        <span className="flex items-center gap-1">
                                            <input type="number" min={0} step={0.1} placeholder="min" value={filterDistMin} onChange={(e) => setFilterDistMin(e.target.value)} className="w-12 bg-cdbg border border-cdborder rounded px-1 py-0.5 text-cdtext" />
                                            <span>–</span>
                                            <input type="number" min={0} step={0.1} placeholder="max" value={filterDistMax} onChange={(e) => setFilterDistMax(e.target.value)} className="w-12 bg-cdbg border border-cdborder rounded px-1 py-0.5 text-cdtext" />
                                        </span>
                                    </label>
                                    <label className="flex flex-col gap-0.5">
                                        <span className="font-bold uppercase text-[9px]">Speed</span>
                                        <span className="flex items-center gap-1">
                                            <input type="number" min={0} step={0.1} placeholder="min" value={filterSpeedMin} onChange={(e) => setFilterSpeedMin(e.target.value)} className="w-12 bg-cdbg border border-cdborder rounded px-1 py-0.5 text-cdtext" />
                                            <span>–</span>
                                            <input type="number" min={0} step={0.1} placeholder="max" value={filterSpeedMax} onChange={(e) => setFilterSpeedMax(e.target.value)} className="w-12 bg-cdbg border border-cdborder rounded px-1 py-0.5 text-cdtext" />
                                        </span>
                                    </label>
                                    <label className="flex flex-col gap-0.5">
                                        <span className="font-bold uppercase text-[9px]">Power</span>
                                        <span className="flex items-center gap-1">
                                            <input type="number" min={0} step={1} placeholder="min" value={filterPowerMin} onChange={(e) => setFilterPowerMin(e.target.value)} className="w-12 bg-cdbg border border-cdborder rounded px-1 py-0.5 text-cdtext" />
                                            <span>–</span>
                                            <input type="number" min={0} step={1} placeholder="max" value={filterPowerMax} onChange={(e) => setFilterPowerMax(e.target.value)} className="w-12 bg-cdbg border border-cdborder rounded px-1 py-0.5 text-cdtext" />
                                        </span>
                                    </label>
                                    <label className="flex flex-col gap-0.5">
                                        <span className="font-bold uppercase text-[9px]">Duration</span>
                                        <span className="flex items-center gap-1">
                                            <input type="number" min={0} step={1} placeholder="min" value={filterDurMinMin} onChange={(e) => setFilterDurMinMin(e.target.value)} className="w-12 bg-cdbg border border-cdborder rounded px-1 py-0.5 text-cdtext" />
                                            <span>–</span>
                                            <input type="number" min={0} step={1} placeholder="max" value={filterDurMaxMin} onChange={(e) => setFilterDurMaxMin(e.target.value)} className="w-12 bg-cdbg border border-cdborder rounded px-1 py-0.5 text-cdtext" />
                                        </span>
                                    </label>
                                    <label className="flex flex-col gap-0.5">
                                        <span className="font-bold uppercase text-[9px]">Elev</span>
                                        <span className="flex items-center gap-1">
                                            <input type="number" min={0} step={1} placeholder="min" value={filterElevMin} onChange={(e) => setFilterElevMin(e.target.value)} className="w-12 bg-cdbg border border-cdborder rounded px-1 py-0.5 text-cdtext" />
                                            <span>–</span>
                                            <input type="number" min={0} step={1} placeholder="max" value={filterElevMax} onChange={(e) => setFilterElevMax(e.target.value)} className="w-12 bg-cdbg border border-cdborder rounded px-1 py-0.5 text-cdtext" />
                                        </span>
                                    </label>
                                    <label className="flex flex-col gap-0.5">
                                        <span className="font-bold uppercase text-[9px]">kJ</span>
                                        <span className="flex items-center gap-1">
                                            <input type="number" min={0} step={1} placeholder="min" value={filterKjMin} onChange={(e) => setFilterKjMin(e.target.value)} className="w-12 bg-cdbg border border-cdborder rounded px-1 py-0.5 text-cdtext" />
                                            <span>–</span>
                                            <input type="number" min={0} step={1} placeholder="max" value={filterKjMax} onChange={(e) => setFilterKjMax(e.target.value)} className="w-12 bg-cdbg border border-cdborder rounded px-1 py-0.5 text-cdtext" />
                                        </span>
                                    </label>
                                </div>
                                <div className="flex flex-wrap gap-1.5 items-center">
                                    <span className="text-[9px] font-bold text-cdmuted uppercase shrink-0 mr-1">Presets</span>
                                    <button type="button" onClick={() => applyMetricPreset(() => { setFilterDurMaxMin('60'); })} className="px-2 py-0.5 rounded border border-cdborder text-[9px] text-cdmuted hover:text-cdtext">Short &lt;1h</button>
                                    <button type="button" onClick={() => applyMetricPreset(() => { setFilterDurMinMin('240'); })} className="px-2 py-0.5 rounded border border-cdborder text-[9px] text-cdmuted hover:text-cdtext">Long ≥4h</button>
                                    <button type="button" onClick={() => applyMetricPreset(() => { setFilterDistMin('50'); })} className="px-2 py-0.5 rounded border border-cdborder text-[9px] text-cdmuted hover:text-cdtext">≥50 km</button>
                                    <button type="button" onClick={() => applyMetricPreset(() => { setFilterDistMax('30'); })} className="px-2 py-0.5 rounded border border-cdborder text-[9px] text-cdmuted hover:text-cdtext">≤30 km</button>
                                    <button type="button" onClick={() => applyMetricPreset(() => { setFilterSpeedMin('32'); })} className="px-2 py-0.5 rounded border border-cdborder text-[9px] text-cdmuted hover:text-cdtext">Fast ≥32 km/h</button>
                                    <button type="button" onClick={() => applyMetricPreset(() => { setFilterSpeedMax('26'); })} className="px-2 py-0.5 rounded border border-cdborder text-[9px] text-cdmuted hover:text-cdtext">Easy ≤26 km/h</button>
                                    <button type="button" onClick={() => applyMetricPreset(() => { setFilterPowerMin('200'); })} className="px-2 py-0.5 rounded border border-cdborder text-[9px] text-cdmuted hover:text-cdtext">Pwr ≥200 W</button>
                                    <button type="button" onClick={() => applyMetricPreset(() => { setFilterElevMin('1000'); })} className="px-2 py-0.5 rounded border border-cdborder text-[9px] text-cdmuted hover:text-cdtext">Climb ≥1000 m</button>
                                    <button type="button" onClick={() => applyMetricPreset(() => { setFilterKjMin('1500'); })} className="px-2 py-0.5 rounded border border-cdborder text-[9px] text-cdmuted hover:text-cdtext">Work ≥1500 kJ</button>
                                </div>
                                </>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[10px]">
                                <span className="text-cdmuted font-bold uppercase shrink-0">Bulk</span>
                                <span className="text-cdmuted">{formatNlNumber(bulkSelectedIds.size)} selected</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingActivity(null);
                                        setShowBulkEditModal(true);
                                    }}
                                    disabled={bulkSelectedIds.size === 0 || isBulkSaving}
                                    title="Apply type, gear, load, RPE, or FTP to all selected rows"
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded border border-cdaccent/50 text-cdaccent hover:bg-cdaccent/10 disabled:opacity-40"
                                >
                                    {isBulkSaving ? <Loader2 size={12} className="animate-spin" /> : <Edit2 size={12} />}
                                    Bulk edit
                                </button>
                                <button
                                    type="button"
                                    onClick={exportBulkCsv}
                                    disabled={bulkSelectedIds.size === 0}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded border border-cdborder text-cdtext hover:border-green-500/50 disabled:opacity-40"
                                >
                                    <Download size={12} /> Export CSV
                                </button>
                                <button
                                    type="button"
                                    onClick={markBulkRecovery}
                                    disabled={bulkSelectedIds.size === 0}
                                    title="Sets load (TSS) to 35 for selected rows"
                                    className="px-2 py-1 rounded border border-cdborder text-cdmuted hover:text-cdaccent hover:border-cdaccent/40 disabled:opacity-40"
                                >
                                    Mark recovery (TSS 35)
                                </button>
                                {stravaGetToken && (
                                    <button
                                        type="button"
                                        onClick={() => runGearBackfillFromStrava(selectedActivitiesForBulk)}
                                        disabled={isGearBackfilling || bulkSelectedIds.size === 0}
                                        title="Same as merge / Find-link: Strava activity details → gear, bike name, route (Climb Profiler)"
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 disabled:opacity-40"
                                    >
                                        {isGearBackfilling ? <Loader2 size={12} className="animate-spin" /> : <Wrench size={12} />}
                                        Strava gear
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => { setMergeError(null); setShowMergeModal(true); }}
                                    disabled={bulkSelectedIds.size !== 2}
                                    title="Select exactly two rows: Intervals + Strava import (strava_… id)"
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded border border-orange-500/40 text-orange-400 hover:bg-orange-500/10 disabled:opacity-40"
                                >
                                    <GitMerge size={12} /> Merge pair
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmBulkDeleteSelected}
                                    disabled={bulkSelectedIds.size === 0 || isDeleting}
                                    title="Remove selected activities from the log and cloud"
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded border border-red-500/40 text-red-400 hover:bg-red-500/10 disabled:opacity-40"
                                >
                                    {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash size={12} />}
                                    Delete selected
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBulkSelectedIds(new Set())}
                                    disabled={bulkSelectedIds.size === 0}
                                    className="text-cdmuted hover:text-cdtext underline disabled:opacity-40"
                                >
                                    Clear selection
                                </button>
                                <span className="text-cdmuted hidden sm:inline">Row checkboxes · header selects visible</span>
                            </div>
                        </div>

                        {isGroupedView && (
                            <div className="flex flex-col gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={expandAllGrouped}
                                        className="text-[10px] font-bold px-2 py-1 rounded border border-cdborder text-cdmuted hover:text-cdaccent hover:border-cdaccent/50"
                                    >
                                        Alles uitklappen
                                    </button>
                                    <button
                                        type="button"
                                        onClick={collapseAllGrouped}
                                        className="text-[10px] font-bold px-2 py-1 rounded border border-cdborder text-cdmuted hover:text-cdtext"
                                    >
                                        Alles inklappen
                                    </button>
                                    <span className="text-[9px] text-cdmuted hidden sm:inline">
                                        Bulk-select gebruikt alleen zichtbare rijen — eerst uitklappen of “Alles uitklappen”.
                                    </span>
                                </div>
                                <QuickNav groupedActivities={groupedActivities} isYearExpanded={isYearExpanded} onToggleYear={toggleYear} />
                            </div>
                        )}

                        {!activities ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-cdmuted gap-4"><Loader2 className="animate-spin text-yellow-400" size={32} /><p>Loading Activities...</p></div>
                        ) : processedActivities.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-cdmuted gap-2 border border-dashed border-cdborder rounded-lg"><AlertTriangle size={32} className="text-slate-600" /><p>No activities found. Start with an Import!</p></div>
                        ) : (
                            <ActivityTable
                                activities={isGroupedView ? groupedActivities : processedActivities}
                                sortConfig={sortConfig}
                                onSort={requestSort}
                                onDelete={handleDeleteSingle}
                                onEdit={setEditingActivity}
                                onViewDetail={setDetailActivity}
                                isGroupedView={isGroupedView}
                                isYearExpanded={isYearExpanded}
                                onToggleYear={toggleYear}
                                isMonthExpanded={isMonthExpanded}
                                onToggleMonth={toggleMonth}
                                showBulkSelect
                                selectedActivityIds={bulkSelectedIds}
                                onToggleSelectRow={toggleBulkSelectOne}
                                allVisibleSelected={allVisibleSelected}
                                onToggleSelectAllVisible={toggleSelectAllVisible}
                                onOpenProfiler={onOpenProfilerFromActivity}
                                profilerClimbByActivityId={profilerClimbByActivityId}
                            />
                        )}
                    </>
                )}

                {internalTab === 'import' && (
                    <div className="p-4">
                        <ImportSection
                            intervalsConfig={intervalsConfig}
                            stravaGetToken={stravaGetToken}
                            onDataDetected={handleDataDetected}
                            onFetchedActivityFromUrl={handleManualFetchedActivity}
                        />
                    </div>
                )}

                {internalTab === 'strava-profile' && (
                    <StravaProfileTab
                        getStravaToken={stravaGetToken}
                        athleteId={stravaAthleteId}
                        persistedData={stravaProfileData}
                        onDataChange={onStravaProfileData}
                    />
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
                                    <h2 className="text-sm font-bold text-cdtext truncate">Strava enrichment</h2>
                                    <p className="text-[10px] text-cdmuted truncate">Match Strava rides, link IDs, import missing activities</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowStravaEnrichPanel(false)}
                                className="shrink-0 px-3 py-1.5 text-xs font-bold rounded border border-cdborder text-cdmuted hover:text-cdtext hover:border-yellow-400/50 transition-colors"
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
        </div>
    );
};

export default DataHub;
