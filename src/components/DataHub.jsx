import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Loader2, AlertTriangle, Trash, Split, RefreshCw, ExternalLink, GitBranch, Zap, ChevronDown, Link2 } from 'lucide-react';
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from '../firebase';
import { findDuplicatesInList, runInBatches } from '../utils';
import { matchStravaToSite, STRAVA_BIKE_TYPES } from '../utils/stravaMatch';
import { protectEnrichedFieldsOnMerge } from '../utils/firestoreActivityMerge';

import { SPORT_TYPES } from '../config';

// Sub-components
import EditActivityModal from './data-hub/EditActivityModal';
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
    showImport = false,
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
}) => {
    // UI State
    const [internalTab, setInternalTab] = useState('log');
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

    const deferredActivities = React.useDeferredValue(activities);

    const {
        search, setSearch,
        indoorFilter, setIndoorFilter,
        sortConfig, requestSort,
        isYearExpanded, toggleYear,
        isMonthExpanded, toggleMonth,
        processedActivities, groupedActivities, isGroupedView
    } = useActivityFilter(deferredActivities);

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
            while (true) {
                const resp = await fetch(
                    `https://www.strava.com/api/v3/athlete/activities?after=${afterTs}&before=${beforeTs}&per_page=200&page=${page}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (!resp.ok) break;
                const data = await resp.json();
                if (!Array.isArray(data) || data.length === 0) break;
                allActivities = allActivities.concat(data);
                if (data.length < 200) break;
                page++;
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

            // 3. De ECHT NIEUWE ritten opslaan in de database
            if (db && newActivities.length > 0) {
                await Promise.all(newActivities.map(act => {
                    const existing = (activities || []).find(a => String(a.id) === String(act.id));
                    const payload = protectEnrichedFieldsOnMerge(act, existing);
                    return setDoc(doc(db, 'activities', String(act.id)), payload, { merge: true });
                }));
            }

            // Update local state met de (nu verrijkte!) ritten. 
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
            if (db) {
                await setDoc(doc(db, "activities", String(updatedActivity.id)), updatedActivity, { merge: true });
            }
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
                                <button onClick={() => setShowNoPowerModal(false)} className="text-cdmuted hover:text-cdtext text-lg font-bold px-2">✕</button>
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

            {/* TABS */}
            <div className="flex border-b border-cdborder">
                <button onClick={() => setInternalTab('log')} className={`flex-1 py-3 text-sm font-bold ${internalTab === 'log' ? 'bg-cdborder text-yellow-400' : 'text-cdmuted hover:bg-cdborder/50'}`}>Activity Log</button>
                {stravaGetToken && (
                    <button onClick={() => setInternalTab('strava-profile')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-1.5 ${internalTab === 'strava-profile' ? 'bg-cdborder text-orange-400' : 'text-cdmuted hover:bg-cdborder/50'}`}>
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" /></svg>
                        Strava Profile
                    </button>
                )}
                {showImport && (
                    <button onClick={() => setInternalTab('import')} className={`flex-1 py-3 text-sm font-bold ${internalTab === 'import' ? 'bg-cdborder text-yellow-400' : 'text-cdmuted hover:bg-cdborder/50'}`}>Import Data</button>
                )}
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
                            </div>
                        )}

                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                            <div className="flex gap-2 w-full md:w-auto flex-1">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-cdmuted" />
                                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search (name or 4-2-2024)..." className="w-full bg-cdbg border border-cdborder rounded pl-10 pr-4 py-2 text-sm text-cdtext outline-none focus:border-yellow-400" />
                                </div>
                                <div className="flex bg-cdbg rounded border border-cdborder p-1">
                                    <button onClick={() => setIndoorFilter('all')} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${indoorFilter === 'all' ? 'bg-cdborder text-cdtext shadow' : 'text-cdmuted hover:text-cdtext'}`}>All</button>
                                    <button onClick={() => setIndoorFilter('outdoor')} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${indoorFilter === 'outdoor' ? 'bg-green-600 text-cdtext shadow' : 'text-cdmuted hover:text-cdtext'}`}>Out</button>
                                    <button onClick={() => setIndoorFilter('indoor')} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${indoorFilter === 'indoor' ? 'bg-orange-600 text-cdtext shadow' : 'text-cdmuted hover:text-cdtext'}`}>In</button>
                                </div>
                            </div>
                            <div className="flex gap-2">
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

                                <div className="relative" ref={utilMenuRef}>
                                    <button
                                        onClick={() => setShowUtilMenu(v => !v)}
                                        className="flex items-center gap-1.5 px-3 h-9 rounded text-sm font-bold border bg-cdsurface border-cdborder text-cdtext hover:border-yellow-400 transition-all"
                                    >
                                        Tools <ChevronDown size={14} className={showUtilMenu ? 'rotate-180 transition-transform' : 'transition-transform'} />
                                    </button>
                                    {showUtilMenu && (
                                        <div className="absolute right-0 top-full mt-1 w-48 bg-cdsurface border border-cdborder rounded-lg shadow-xl z-50 overflow-hidden">
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

                        {isGroupedView && (
                            <QuickNav groupedActivities={groupedActivities} isYearExpanded={isYearExpanded} onToggleYear={toggleYear} />
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
                            />
                        )}
                    </>
                )}

                {internalTab === 'import' && (
                    <ImportSection
                        onDataDetected={handleDataDetected}
                    />
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
