import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Download, Loader2, MapPin, Upload } from 'lucide-react';
import { Button } from '../ui';
import {
    downloadMissingRouteActivitiesCsv,
    downloadMissingRouteActivitiesJson,
    formatRouteMapCoverageSummary,
    summarizeActivityRouteMapCoverage,
} from '../../utils/activityRouteMapCoverage.js';
import { validateBackupPayload, BACKUP_MAX_BYTES } from '../../utils/backupSchema.js';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useActivities } from '../../hooks/useActivities';
import { buildMergeProtectOpts } from '../../utils/mergeProtectOptions.js';
import { applyIntervalsMapBackfill } from '../../utils/intervalsMapBackfillApply.js';
import { applyStravaMapBackfill } from '../../utils/stravaMapBackfillApply.js';
import { planIntervalsMapBackfillFromActivities } from '../../utils/intervalsMapBackfillOutcomes.js';
import RouteMapBackfillResults from './RouteMapBackfillResults.jsx';

const BACKFILL_CONFIRM_THRESHOLD = 25;

/**
 * Backup tab helper: route polyline coverage (strava_map or intervals_map).
 */
export default function RouteMapCoverageSettings({
    activities,
    intervalsConfig,
    userSettings,
    stravaGetToken = null,
}) {
    const { showToast } = useToast();
    const { confirm } = useConfirm();
    const { importActivities, getActivitiesSnapshot } = useActivities();
    const fileInputRef = useRef(null);
    const [report, setReport] = useState(null);
    const [showMissing, setShowMissing] = useState(false);
    const [reportSource, setReportSource] = useState('loaded');
    const [backfillProgress, setBackfillProgress] = useState(null);
    const [isBackfilling, setIsBackfilling] = useState(false);
    const [backfillOutcomes, setBackfillOutcomes] = useState(null);
    const [isStravaBackfilling, setIsStravaBackfilling] = useState(false);
    const [stravaRowBusyId, setStravaRowBusyId] = useState(null);
    const [stravaSelectedIds, setStravaSelectedIds] = useState(() => new Set());

    const mergeProtectOpts = useMemo(
        () => buildMergeProtectOpts(userSettings),
        [userSettings?.bikeComputerProfileTitles, userSettings?.syncDataSourcePrefs],
    );

    const runReport = useCallback((list, sourceLabel) => {
        const summary = summarizeActivityRouteMapCoverage(list);
        setReport(summary);
        setReportSource(sourceLabel);
        setShowMissing(false);
    }, []);

    const handleCheckLoaded = useCallback(() => {
        const list = activities || [];
        if (!list.length) {
            showToast('No activities loaded yet. Open Activities or sign in to sync first.', { variant: 'warning' });
            return;
        }
        runReport(list, 'loaded');
    }, [activities, runReport, showToast]);

    const handleBackupFile = useCallback((e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (file.size > BACKUP_MAX_BYTES) {
            showToast(`Backup file is too large (max ${Math.round(BACKUP_MAX_BYTES / (1024 * 1024))} MB).`, {
                variant: 'error',
            });
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(String(reader.result || ''));
                const validation = validateBackupPayload(data);
                if (!validation.ok) {
                    showToast(`Invalid backup file: ${validation.error}`, { variant: 'error' });
                    return;
                }
                const list = Array.isArray(data.activities) ? data.activities : [];
                if (!list.length) {
                    showToast('Backup has no activities array (or it is empty).', { variant: 'warning' });
                    return;
                }
                runReport(list, 'backup');
            } catch {
                showToast('Could not parse JSON backup file.', { variant: 'error' });
            }
        };
        reader.onerror = () => {
            showToast('Could not read backup file.', { variant: 'error' });
        };
        reader.readAsText(file);
    }, [runReport, showToast]);

    const summaryLines = useMemo(() => {
        if (!report) return null;
        return formatRouteMapCoverageSummary(report).split('\n');
    }, [report]);

    const missingRows = report?.missingActivities ?? [];

    const stravaEnrichEligibleIds = useMemo(
        () => missingRows
            .filter((row) => row.mapBackfillAction === 'strava_enrich')
            .map((row) => String(row.id)),
        [missingRows],
    );

    const stravaEnrichSelectedCount = useMemo(
        () => stravaEnrichEligibleIds.filter((id) => stravaSelectedIds.has(id)).length,
        [stravaEnrichEligibleIds, stravaSelectedIds],
    );

    const toggleStravaSelect = useCallback((id) => {
        const key = String(id);
        setStravaSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }, []);

    const selectAllStravaEnrich = useCallback(() => {
        setStravaSelectedIds(new Set(stravaEnrichEligibleIds));
    }, [stravaEnrichEligibleIds]);

    const backfillPlan = useMemo(() => {
        if (reportSource !== 'loaded') {
            return { toFetch: [], preSkipped: [] };
        }
        return planIntervalsMapBackfillFromActivities(activities);
    }, [activities, reportSource]);

    const backfillEligibleCount = backfillPlan.toFetch.length;
    const backfillPrecheckSkippedCount = backfillPlan.preSkipped.length;

    const mapBackfillHintById = useMemo(() => {
        const hints = new Map();
        for (const row of backfillPlan.preSkipped) {
            hints.set(String(row.id), row.message);
        }
        if (backfillOutcomes) {
            for (const row of backfillOutcomes) {
                if (row.status !== 'added') {
                    hints.set(String(row.id), row.message);
                }
            }
        }
        return hints;
    }, [backfillPlan.preSkipped, backfillOutcomes]);

    const pct = report && report.total > 0
        ? Math.round((report.withRouteMap / report.total) * 100)
        : 0;

    const canBackfillLoaded = reportSource === 'loaded'
        && backfillEligibleCount > 0
        && Boolean(intervalsConfig?.apiKey);

    const handleExportCsv = useCallback(() => {
        if (!report?.missingActivities?.length) {
            showToast('No missing rides to export.', { variant: 'warning' });
            return;
        }
        downloadMissingRouteActivitiesCsv(report);
        showToast('Downloaded CSV of rides without route map.', { variant: 'success' });
    }, [report, showToast]);

    const handleExportJson = useCallback(() => {
        if (!report?.missingActivities?.length) {
            showToast('No missing rides to export.', { variant: 'warning' });
            return;
        }
        downloadMissingRouteActivitiesJson(report);
        showToast('Downloaded JSON of rides without route map.', { variant: 'success' });
    }, [report, showToast]);

    const handleBackfillIntervalsMaps = useCallback(async () => {
        if (!intervalsConfig?.apiKey) {
            showToast('Add your Intervals.icu API key under Integrations first.', { variant: 'warning' });
            return;
        }
        if (reportSource !== 'loaded') {
            showToast('Run “Check loaded activities” first — backup files cannot be updated from here.', {
                variant: 'warning',
            });
            return;
        }
        const missing = backfillEligibleCount;
        if (missing <= 0) return;

        if (missing >= BACKFILL_CONFIRM_THRESHOLD) {
            const ok = await confirm({
                title: 'Fetch route maps from Intervals?',
                message: `This will call the Intervals API for up to ${missing} ride(s) missing a route polyline. Keep this browser tab open until it finishes. It may take several minutes. Continue?`,
                confirmLabel: 'Fetch maps',
                cancelLabel: 'Cancel',
            });
            if (!ok) return;
        }

        setIsBackfilling(true);
        setBackfillProgress('Starting…');
        setBackfillOutcomes(null);
        try {
            const snapshot = getActivitiesSnapshot();
            const result = await applyIntervalsMapBackfill(snapshot, intervalsConfig, mergeProtectOpts, {
                concurrency: 2,
                delayMs: 120,
                onProgress: (msg) => setBackfillProgress(msg),
            });
            importActivities(result.activities);
            const added = result.updates?.length ?? 0;
            setBackfillOutcomes(result.outcomes || []);
            runReport(result.activities, 'loaded');
            const skipped = (result.outcomes || []).filter((o) => o.status === 'skipped').length;
            const parts = [
                added > 0 ? `${added} route map(s) added` : 'No new polylines from Intervals',
                skipped > 0 ? `${skipped} skipped (see per-activity reasons below)` : null,
                result.failed > 0 ? `${result.failed} failed` : null,
            ].filter(Boolean);
            showToast(`Intervals route backfill done: ${parts.join(', ')}.`, {
                variant: result.failed > 0 ? 'warning' : 'success',
            });
        } catch (err) {
            console.error('[RouteMapCoverage] backfill failed:', err);
            showToast('Could not fetch route maps from Intervals. Check your API key and connection.', {
                variant: 'error',
            });
        } finally {
            setIsBackfilling(false);
            setBackfillProgress(null);
        }
    }, [
        confirm,
        getActivitiesSnapshot,
        importActivities,
        intervalsConfig,
        mergeProtectOpts,
        backfillEligibleCount,
        reportSource,
        runReport,
        showToast,
    ]);

    const runStravaMapBackfillForIds = useCallback(async (ids) => {
        if (!stravaGetToken) {
            showToast('Connect Strava under Settings → Integrations first.', { variant: 'warning' });
            return;
        }
        if (reportSource !== 'loaded') {
            showToast('Run “Check loaded activities” first.', { variant: 'warning' });
            return;
        }
        const uniqueIds = [...new Set((ids || []).map(String))].filter(Boolean);
        if (uniqueIds.length === 0) {
            showToast('Select one or more Strava-linked rides (checkboxes in the list).', { variant: 'warning' });
            return;
        }

        const singleRow = uniqueIds.length === 1 ? uniqueIds[0] : null;
        setIsStravaBackfilling(true);
        if (singleRow) setStravaRowBusyId(singleRow);
        setBackfillProgress('Starting Strava enrich…');
        setBackfillOutcomes(null);
        try {
            const snapshot = getActivitiesSnapshot();
            const idSet = new Set(uniqueIds);
            const subset = snapshot.filter((a) => idSet.has(String(a.id)));
            const result = await applyStravaMapBackfill(subset, stravaGetToken, mergeProtectOpts, {
                concurrency: singleRow ? 1 : 3,
                onProgress: (msg) => setBackfillProgress(msg),
            });
            importActivities(result.activities);
            setBackfillOutcomes(result.outcomes || []);
            const byId = new Map(result.activities.map((a) => [String(a.id), a]));
            const fullNext = snapshot.map((a) => byId.get(String(a.id)) || a);
            runReport(fullNext, 'loaded');
            if (singleRow) {
                setStravaSelectedIds((prev) => {
                    const next = new Set(prev);
                    next.delete(singleRow);
                    return next;
                });
            }
            const toastLabel = singleRow
                ? (result.mapsAdded > 0 ? 'Route map stored for this ride.' : 'No route map returned from Strava for this ride.')
                : `Strava map backfill done: ${result.mapsAdded} route map(s) stored.`;
            showToast(toastLabel, { variant: result.mapsAdded > 0 ? 'success' : 'warning' });
        } catch (err) {
            console.error('[RouteMapCoverage] Strava backfill failed:', err);
            showToast('Strava map backfill failed. Check Strava connection and try again.', { variant: 'error' });
        } finally {
            setIsStravaBackfilling(false);
            setStravaRowBusyId(null);
            setBackfillProgress(null);
        }
    }, [
        getActivitiesSnapshot,
        importActivities,
        mergeProtectOpts,
        reportSource,
        runReport,
        showToast,
        stravaGetToken,
    ]);

    const handleStravaMapBackfill = useCallback(() => {
        const ids = stravaEnrichEligibleIds.filter((id) => stravaSelectedIds.has(id));
        return runStravaMapBackfillForIds(ids);
    }, [runStravaMapBackfillForIds, stravaEnrichEligibleIds, stravaSelectedIds]);

    const handleStravaMapBackfillOne = useCallback((activityId) => {
        runStravaMapBackfillForIds([String(activityId)]);
    }, [runStravaMapBackfillForIds]);

    return (
        <div className="rounded-cdlg border border-cdborder bg-cdsurface p-6">
            <div className="flex items-center gap-2 pb-2 border-b border-cdborder/50 mb-4">
                <MapPin className="text-cdaccent shrink-0" size={18} aria-hidden />
                <h3 className="font-bold text-cdtext">Route map coverage</h3>
            </div>
            <p className="text-xs text-cdmuted mb-3 leading-relaxed">
                Counts activities with a stored route polyline from Strava (<code className="text-cdtext">strava_map</code>)
                or Intervals (<code className="text-cdtext">intervals_map</code>) saved on the activity. The map in an open activity
                detail can still come from live Strava API without being stored. Checks and bulk fetch run in this browser tab
                (calls Intervals.icu directly). Keep the tab open until the fetch finishes — closing it stops the job.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
                <Button type="button" variant="tonal" className="flex-1" onClick={handleCheckLoaded}>
                    Check loaded activities
                </Button>
                <Button
                    type="button"
                    variant="outlined"
                    className="flex-1"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Upload size={14} aria-hidden /> Check backup file
                </Button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    className="sr-only"
                    onChange={handleBackupFile}
                />
            </div>

            {report && summaryLines && (
                <div
                    className="mt-4 rounded-cdmd border border-cdborder bg-cdsurface/80 p-3 text-sm text-cdtext"
                    role="status"
                    aria-live="polite"
                >
                    <p className="font-semibold mb-1">
                        {reportSource === 'backup' ? 'Backup file' : 'Loaded activities'}:
                        {' '}
                        {report.withRouteMap}/{report.total} with route ({pct}%)
                    </p>
                    <ul className="text-xs text-cdmuted space-y-0.5 list-disc list-inside">
                        {summaryLines.map((line) => (
                            <li key={line}>{line}</li>
                        ))}
                    </ul>
                    {report.missingRouteMap > 0 && (
                        <div className="mt-3 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    type="button"
                                    variant="text"
                                    className="text-xs h-8 px-2"
                                    onClick={() => setShowMissing((v) => !v)}
                                >
                                    {showMissing ? 'Hide' : 'Show'} rides without route ({report.missingRouteMap})
                                </Button>
                                {showMissing && (
                                    <>
                                        <Button
                                            type="button"
                                            variant="outlined"
                                            className="text-xs h-8 px-2"
                                            onClick={handleExportCsv}
                                        >
                                            <Download size={12} aria-hidden /> Export CSV
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outlined"
                                            className="text-xs h-8 px-2"
                                            onClick={handleExportJson}
                                        >
                                            <Download size={12} aria-hidden /> Export JSON
                                        </Button>
                                    </>
                                )}
                            </div>
                            {showMissing && (
                                <ul
                                    className="mt-1 max-h-[min(60vh,28rem)] overflow-y-auto text-xs text-cdmuted space-y-1 border-t border-cdborder/50 pt-2 pr-1"
                                    aria-label="Activities without route polyline"
                                >
                                    {stravaEnrichEligibleIds.length > 0 && (
                                        <li className="list-none font-sans pb-1">
                                            <Button
                                                type="button"
                                                variant="text"
                                                className="text-xs h-7 px-1"
                                                onClick={selectAllStravaEnrich}
                                            >
                                                Select all Strava enrich ({stravaEnrichEligibleIds.length})
                                            </Button>
                                        </li>
                                    )}
                                    {missingRows.map((row) => {
                                        const date = row.date ? String(row.date).split('T')[0] : '?';
                                        const title = row.title || '(no title)';
                                        const type = row.type ? ` · ${row.type}` : '';
                                        const hint = row.mapBackfillHint
                                            || mapBackfillHintById.get(String(row.id));
                                        const isStravaRow = row.mapBackfillAction === 'strava_enrich';
                                        const rowId = String(row.id);
                                        const isRowStravaBusy = stravaRowBusyId === rowId;
                                        const actionBadge = row.mapBackfillAction === 'intervals_fetch'
                                            ? 'Intervals'
                                            : isStravaRow
                                                ? 'Strava enrich'
                                                : row.mapBackfillAction === 'unavailable'
                                                    ? 'No auto-fetch'
                                                    : null;
                                        return (
                                            <li key={`${row.id}-${date}`} className="font-mono break-all flex gap-2 items-start">
                                                {isStravaRow && reportSource === 'loaded' && (
                                                    <input
                                                        type="checkbox"
                                                        className="mt-0.5 shrink-0"
                                                        checked={stravaSelectedIds.has(String(row.id))}
                                                        onChange={() => toggleStravaSelect(row.id)}
                                                        aria-label={`Select ${title} for Strava map enrich`}
                                                    />
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    {actionBadge && (
                                                        <span className="font-sans text-[10px] uppercase font-bold text-cdaccent mr-1">
                                                            [{actionBadge}]
                                                        </span>
                                                    )}
                                                    {date} · {row.id} · {title}{type}
                                                    {hint && (
                                                        <div className="font-sans text-amber-500/90 mt-0.5">{hint}</div>
                                                    )}
                                                </div>
                                                {isStravaRow && reportSource === 'loaded' && (
                                                    <Button
                                                        type="button"
                                                        variant="outlined"
                                                        className="!text-[10px] !h-7 !px-2 shrink-0 font-sans"
                                                        disabled={
                                                            !stravaGetToken
                                                            || isStravaBackfilling
                                                            || isBackfilling
                                                        }
                                                        title={
                                                            stravaGetToken
                                                                ? 'Fetch and store strava_map for this ride'
                                                                : 'Connect Strava under Settings → Integrations'
                                                        }
                                                        onClick={() => handleStravaMapBackfillOne(row.id)}
                                                    >
                                                        {isRowStravaBusy ? (
                                                            <>
                                                                <Loader2 size={12} className="animate-spin" aria-hidden />
                                                                …
                                                            </>
                                                        ) : (
                                                            'Strava enrich'
                                                        )}
                                                    </Button>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                            {reportSource === 'loaded' && (
                                <div className="border-t border-cdborder/50 pt-3">
                                    <p className="text-xs text-cdmuted mb-2">
                                        Fetch encoded polylines from Intervals.icu for rides that have no Strava or Intervals map yet
                                        (includes indoor and virtual rides when Intervals has GPS). Manual or CSV-only entries are skipped
                                        with an explicit reason per activity. Keep this tab open until the job finishes.
                                    </p>
                                    {backfillPrecheckSkippedCount > 0 && (
                                        <p className="text-xs text-amber-500/90 mb-2">
                                            {backfillEligibleCount} Intervals ride(s) can be fetched; {backfillPrecheckSkippedCount} missing
                                            ride(s) are not Intervals activities and will not be called (reason shown in the list).
                                        </p>
                                    )}
                                    {!intervalsConfig?.apiKey && (
                                        <p className="text-xs text-amber-500/90 mb-2">
                                            Connect Intervals under Settings → Integrations to enable bulk fetch.
                                        </p>
                                    )}
                                    {stravaEnrichEligibleIds.length > 0 && (
                                        <Button
                                            type="button"
                                            variant="outlined"
                                            className="w-full sm:w-auto mb-2"
                                            disabled={
                                                !stravaGetToken
                                                || isStravaBackfilling
                                                || isBackfilling
                                                || stravaEnrichSelectedCount === 0
                                                || stravaRowBusyId != null
                                            }
                                            onClick={handleStravaMapBackfill}
                                        >
                                            {isStravaBackfilling ? (
                                                <>
                                                    <Loader2 size={14} className="animate-spin" aria-hidden />
                                                    Strava enrich…
                                                </>
                                            ) : (
                                                `Store Strava maps for selected (${stravaEnrichSelectedCount})`
                                            )}
                                        </Button>
                                    )}
                                    <Button
                                        type="button"
                                        variant="tonal"
                                        className="w-full sm:w-auto"
                                        disabled={!canBackfillLoaded || isBackfilling || isStravaBackfilling}
                                        onClick={handleBackfillIntervalsMaps}
                                    >
                                        {isBackfilling ? (
                                            <>
                                                <Loader2 size={14} className="animate-spin" aria-hidden />
                                                Fetching…
                                            </>
                                        ) : (
                                            `Fetch Intervals maps for missing rides (${backfillEligibleCount})`
                                        )}
                                    </Button>
                                    {backfillProgress && (
                                        <p className="text-xs text-cdmuted mt-2 font-mono">{backfillProgress}</p>
                                    )}
                                    <RouteMapBackfillResults
                                        outcomes={backfillOutcomes}
                                        onClose={() => setBackfillOutcomes(null)}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
