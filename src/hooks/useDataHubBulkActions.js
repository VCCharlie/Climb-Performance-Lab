import { useState, useMemo, useCallback } from 'react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { runInBatches } from '../utils';
import { protectEnrichedFieldsOnMerge } from '../utils/firestoreActivityMerge';
import { downloadActivitiesCsv, downloadActivitiesXlsx } from '../utils/activityCsvExport';
import {
    mergeActivitiesIntervalsPrimary,
    isStravaOnlyActivityId,
    isLikelyIntervalsActivityId,
    stripUndefinedFields,
} from '../utils/mergeActivities';
import { enrichActivityGearFromStrava } from '../utils/stravaGearEnrich';
import { enrichSelectedActivitiesFromStrava } from '../utils/stravaSelectedEnrich';
import { buildStravaDescriptionBackfillUpdates } from '../utils/stravaDescriptionBackfill';
import { buildDecouplingBackfillUpdates, buildDecouplingBackfillStats, formatDecouplingBackfillIntro } from '../utils/decouplingStreamBackfill';
import { formatNlNumber } from '../utils/formatters';
import { buildMarkRecoveryConfirmMessage, resolveRecoveryTss } from '../utils/recoveryTss';
import { resolveDeviceProfileTitlesFromSettings } from '../utils/bikeComputerProfileTitles';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';

/**
 * Bulk selection and batch operations for the Activity Log (edit, export, delete, merge, Strava enrich).
 */
export function useDataHubBulkActions({
    activities,
    onDelete,
    onImport,
    stravaGetToken,
    intervalsConfig,
    visibleActivityIdsFlat,
    setIsDeleting,
    recoveryTss,
    userSettings,
}) {
    const { confirm } = useConfirm();
    const { showToast } = useToast();
    const deviceProfileTitles = resolveDeviceProfileTitlesFromSettings(userSettings);
    const [bulkSelectedIds, setBulkSelectedIds] = useState(() => new Set());
    const [showMergeModal, setShowMergeModal] = useState(false);
    const [mergeError, setMergeError] = useState(null);
    const [isMerging, setIsMerging] = useState(false);
    const [showBulkEditModal, setShowBulkEditModal] = useState(false);
    const [isBulkSaving, setIsBulkSaving] = useState(false);
    const [isStravaEnriching, setIsStravaEnriching] = useState(false);
    const [stravaEnrichMsg, setStravaEnrichMsg] = useState(null);
    const [isStravaDescBackfilling, setIsStravaDescBackfilling] = useState(false);
    const [stravaDescBackfillMsg, setStravaDescBackfillMsg] = useState(null);
    const [isDecouplingBackfilling, setIsDecouplingBackfilling] = useState(false);
    const [decouplingBackfillMsg, setDecouplingBackfillMsg] = useState(null);
    const [isExportingXlsx, setIsExportingXlsx] = useState(false);

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
        downloadActivitiesCsv(selectedActivitiesForBulk);
    }, [selectedActivitiesForBulk]);

    const exportBulkXlsx = useCallback(async () => {
        if (selectedActivitiesForBulk.length === 0) return;
        setIsExportingXlsx(true);
        try {
            await downloadActivitiesXlsx(selectedActivitiesForBulk);
        } catch (e) {
            console.error('[Activity export]', e);
            showToast(`Could not export Excel file: ${e.message || e}`, { variant: 'error' });
        } finally {
            setIsExportingXlsx(false);
        }
    }, [selectedActivitiesForBulk, showToast]);

    const confirmBulkDeleteSelected = useCallback(async () => {
        const ids = [...bulkSelectedIds];
        if (ids.length === 0) return;
        const n = ids.length;
        const confirmed = await confirm({
            title: 'Delete activities',
            message: `Delete ${n} activit${n === 1 ? 'y' : 'ies'}? This cannot be undone.`,
            confirmLabel: 'Delete',
            variant: 'danger',
        });
        if (!confirmed) return;
        setIsDeleting?.(true);
        try {
            ids.forEach((id) => onDelete(id));
            if (db) {
                await Promise.all(ids.map((id) => deleteDoc(doc(db, 'activities', String(id)))));
            }
            setBulkSelectedIds(new Set());
        } catch (e) {
            showToast(`Could not delete: ${e.message || e}`, { variant: 'error' });
        } finally {
            setIsDeleting?.(false);
        }
    }, [bulkSelectedIds, onDelete, setIsDeleting, confirm, showToast]);

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
                rateLimitHits,
            } = await enrichSelectedActivitiesFromStrava(list, token, {
                concurrency: 3,
                forceStravaDetail: true,
                deviceProfileTitles,
                onProgress: (m) => setStravaEnrichMsg(m),
            });
            const rateLimitNote = rateLimitHits > 0
                ? ' Strava rate limit hit — some details may be incomplete; try again in ~15 minutes.'
                : '';
            if (updates.length === 0) {
                if (failed > 0 || rateLimitHits > 0) {
                    setStravaEnrichMsg(
                        `No fields updated (${formatNlNumber(failed)} Strava request(s) failed — check connection or rate limits). ${formatNlNumber(unchanged)} ride(s) already matched Strava.${rateLimitNote}`,
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
                + ' — gear, route, HR, RPE, and segment badges when Strava returns them.'
                + rateLimitNote,
            );
        } catch (e) {
            console.error('[Strava enrich]', e);
            setStravaEnrichMsg(`Error: ${e.message || e}`);
        } finally {
            setIsStravaEnriching(false);
        }
    }, [stravaGetToken, persistStravaEnrichUpdates, deviceProfileTitles]);

    const runStravaDescriptionBackfill = useCallback(async (subset) => {
        if (!stravaGetToken) {
            setStravaDescBackfillMsg('Connect Strava in Settings first.');
            return;
        }

        const selected = subset && subset.length > 0 ? subset : null;
        const pool = selected
            ? selected
            : (activities || []).filter((a) => a?.strava_id);

        if (!pool.length) {
            setStravaDescBackfillMsg('No Strava-linked activities to check.');
            return;
        }

        setIsStravaDescBackfilling(true);
        setStravaDescBackfillMsg('Starting Strava description backfill…');

        try {
            const token = await stravaGetToken();
            if (!token) {
                setStravaDescBackfillMsg('Could not get Strava token.');
                return;
            }

            const onlyIds = selected ? selected.map((a) => a.id) : null;
            const result = await buildStravaDescriptionBackfillUpdates(activities, token, {
                onlyIds,
                onProgress: (m) => setStravaDescBackfillMsg(m),
            });

            if (result.candidates === 0) {
                setStravaDescBackfillMsg('All Strava-linked activities already have a description stored.');
                return;
            }

            if (result.updates.length === 0) {
                const rateNote = result.rateLimitHits > 0
                    ? ' Strava rate limit — try again in ~15 minutes.'
                    : '';
                setStravaDescBackfillMsg(
                    `Checked ${formatNlNumber(result.processed)} ride(s): no new descriptions`
                    + (result.emptyOnStrava > 0 ? ` (${formatNlNumber(result.emptyOnStrava)} empty on Strava)` : '')
                    + rateNote
                    + (result.remaining > 0 ? ` · ${formatNlNumber(result.remaining)} still waiting — run again.` : ''),
                );
                return;
            }

            setStravaDescBackfillMsg(`Saving ${result.updates.length} descriptions…`);
            await persistStravaEnrichUpdates(result.updates, pool);

            const remainNote = result.remaining > 0
                ? ` ${formatNlNumber(result.remaining)} more ride(s) still need a fetch — click again to continue.`
                : '';
            const rateNote = result.rateLimitHits > 0 ? ' Some requests hit Strava rate limits.' : '';

            setStravaDescBackfillMsg(
                `Done: stored ${formatNlNumber(result.filled)} Strava description(s) (description field only — low API load).${remainNote}${rateNote} Next run automatically continues with rides not yet checked.`,
            );
        } catch (e) {
            console.error('[Strava description backfill]', e);
            setStravaDescBackfillMsg(`Error: ${e.message || e}`);
        } finally {
            setIsStravaDescBackfilling(false);
        }
    }, [stravaGetToken, activities, persistStravaEnrichUpdates]);

    const runDecouplingBackfill = useCallback(async (subset) => {
        const profileFtp = Number(userSettings?.ftp) || 0;
        if (profileFtp <= 0) {
            setDecouplingBackfillMsg('Set your FTP in Settings first — decoupling analysis needs intensity factor (IF).');
            return;
        }

        const hasIntervalsKey = Boolean(intervalsConfig?.apiKey);
        let stravaToken = null;
        if (stravaGetToken) {
            try {
                stravaToken = await stravaGetToken();
            } catch {
                stravaToken = null;
            }
        }

        if (!hasIntervalsKey && !stravaToken) {
            setDecouplingBackfillMsg('Add your Intervals.icu API key in Settings or connect Strava to fetch power/HR streams.');
            return;
        }

        const selected = subset && subset.length > 0 ? subset : null;
        const pool = selected
            ? selected
            : (activities || []);

        if (!pool.length) {
            setDecouplingBackfillMsg('No activities in the log to analyze.');
            return;
        }

        setIsDecouplingBackfilling(true);

        const creds = { intervalsConfig, hasStravaToken: Boolean(stravaToken) };
        const stats = buildDecouplingBackfillStats(activities, profileFtp, creds);
        setDecouplingBackfillMsg(formatDecouplingBackfillIntro(stats));

        try {
            const onlyIds = selected ? selected.map((a) => a.id) : null;
            const result = await buildDecouplingBackfillUpdates(activities, {
                profileFtp,
                intervalsConfig,
                stravaToken,
                onlyIds,
                onProgress: (m) => setDecouplingBackfillMsg(m),
            });

            if (result.blockedReason === 'missing_ftp') {
                setDecouplingBackfillMsg('Set your FTP in Settings first — decoupling analysis needs intensity factor (IF).');
                return;
            }
            if (result.blockedReason === 'missing_credentials') {
                setDecouplingBackfillMsg('Add your Intervals.icu API key in Settings or connect Strava to fetch power/HR streams.');
                return;
            }

            if (result.candidates === 0) {
                const statsNote = formatDecouplingBackfillIntro(stats);
                setDecouplingBackfillMsg(
                    selected
                        ? `No selected steady rides still need stream decoupling (≥60 min, IF ~0.55–0.85, HR present). ${statsNote}`
                        : `No steady rides left to analyze. ${statsNote}`,
                );
                return;
            }

            if (result.updates.length === 0) {
                setDecouplingBackfillMsg(
                    `Checked ${formatNlNumber(result.processed)} ride(s): streams returned no decoupling data`
                    + (result.remaining > 0 ? ` · ${formatNlNumber(result.remaining)} more waiting — run again.` : ''),
                );
                return;
            }

            setDecouplingBackfillMsg(`Saving decoupling metrics for ${formatNlNumber(result.updates.length)} ride(s)…`);
            await persistStravaEnrichUpdates(result.updates, pool);

            const remainNote = result.remaining > 0
                ? ` ${formatNlNumber(result.remaining)} more ride(s) waiting — click again to continue.`
                : '';

            setDecouplingBackfillMsg(
                `Done: added stream decoupling to ${formatNlNumber(result.enriched)} steady ride(s) this run`
                + ` (${formatNlNumber(stats.alreadyAnalyzed + result.enriched)} of ${formatNlNumber(stats.steadyEligible)} steady rides analyzed).${remainNote}`,
            );
        } catch (e) {
            console.error('[Decoupling backfill]', e);
            setDecouplingBackfillMsg(`Error: ${e.message || e}`);
        } finally {
            setIsDecouplingBackfilling(false);
        }
    }, [
        userSettings?.ftp,
        intervalsConfig,
        stravaGetToken,
        activities,
        persistStravaEnrichUpdates,
    ]);

    const markBulkRecovery = useCallback(async () => {
        if (selectedActivitiesForBulk.length === 0) return;
        const tss = resolveRecoveryTss({ recoveryTss });
        const n = selectedActivitiesForBulk.length;
        const confirmed = await confirm({
            title: 'Mark recovery',
            message: buildMarkRecoveryConfirmMessage(n, tss),
            confirmLabel: 'Mark recovery',
        });
        if (!confirmed) return;
        try {
            if (db) {
                await Promise.all(
                    selectedActivitiesForBulk.map((act) =>
                        setDoc(doc(db, 'activities', String(act.id)), { load: tss }, { merge: true })
                    )
                );
            }
            onImport(
                selectedActivitiesForBulk.map((a) => ({
                    ...a,
                    load: tss,
                }))
            );
            setBulkSelectedIds(new Set());
        } catch (e) {
            showToast(`Could not update activities: ${e.message}`, { variant: 'error' });
        }
    }, [selectedActivitiesForBulk, onImport, recoveryTss, confirm, showToast]);

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
            showToast(`Could not apply bulk edit: ${e.message || e}`, { variant: 'error' });
        } finally {
            setIsBulkSaving(false);
        }
    }, [selectedActivitiesForBulk, activities, onImport, stravaGetToken, showToast]);

    const applyBulkActivityType = useCallback(async (typeValue) => {
        const list = selectedActivitiesForBulk;
        if (!list.length || !typeValue) return;
        const confirmed = await confirm({
            title: 'Set activity type',
            message: `Set activity type to "${typeValue}" for ${list.length} selected ${list.length === 1 ? 'activity' : 'activities'}?`,
            confirmLabel: 'Apply',
        });
        if (!confirmed) return;
        await handleBulkApplyPatch({ type: typeValue });
    }, [selectedActivitiesForBulk, handleBulkApplyPatch, confirm]);

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
        exportBulkXlsx,
        isExportingXlsx,
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
        applyBulkActivityType,
        showBulkEditModal,
        setShowBulkEditModal,
        isBulkSaving,
        runStravaEnrichSelected,
        isStravaEnriching,
        stravaEnrichMsg,
        setStravaEnrichMsg,
        runStravaDescriptionBackfill,
        isStravaDescBackfilling,
        stravaDescBackfillMsg,
        setStravaDescBackfillMsg,
        runDecouplingBackfill,
        isDecouplingBackfilling,
        decouplingBackfillMsg,
        setDecouplingBackfillMsg,
    };
}
