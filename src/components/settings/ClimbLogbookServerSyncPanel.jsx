import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, MapPinned } from 'lucide-react';
import NlDateInput from '../NlDateInput';
import { Button } from '../ui';
import { db } from '../../firebase';
import { useToast } from '../../context/ToastContext';
import { useActivitiesList } from '../../hooks/useActivities';
import {
    CLIMB_LOGBOOK_ROUTE_SOURCES,
    describeClimbLogbookRouteSource,
    labelClimbLogbookRouteSource,
} from '../../utils/climbLogbookRouteSource.js';
import {
    formatClimbLogbookSyncStatusLines,
    summarizeClimbLogbookPreview,
    validateClimbLogbookDateRange,
} from '../../utils/climbLogbookServerSync.js';
import {
    queueClimbLogbookServerSync,
    subscribeClimbLogbookServerSyncStatus,
} from '../../utils/climbLogbookServerSyncFirestore.js';
import { siteDateToYmd } from '../../utils/stravaVsLogGap.js';

function defaultEndYmd() {
    return new Date().toISOString().slice(0, 10);
}

function defaultStartYmd() {
    const d = new Date();
    d.setDate(d.getDate() - 13);
    return d.toISOString().slice(0, 10);
}

/**
 * Queue server climb logbook polyline matching for a date range and route source.
 */
export default function ClimbLogbookServerSyncPanel({
    isSignedIn = false,
    userUid = null,
}) {
    const activities = useActivitiesList();
    const { showToast } = useToast();
    const [startYmd, setStartYmd] = useState(defaultStartYmd);
    const [endYmd, setEndYmd] = useState(defaultEndYmd);
    const [serverStatus, setServerStatus] = useState(null);
    const [busySource, setBusySource] = useState(null);

    useEffect(() => {
        if (!isSignedIn || !userUid) {
            setServerStatus(null);
            return undefined;
        }
        return subscribeClimbLogbookServerSyncStatus(db, userUid, setServerStatus);
    }, [isSignedIn, userUid]);

    const validation = useMemo(
        () => validateClimbLogbookDateRange(startYmd, endYmd),
        [startYmd, endYmd],
    );

    const previewBySource = useMemo(() => {
        if (!validation.ok) return null;
        const out = {};
        for (const source of CLIMB_LOGBOOK_ROUTE_SOURCES) {
            out[source] = summarizeClimbLogbookPreview(
                activities,
                validation.startDate,
                validation.endDate,
                source,
            );
        }
        return out;
    }, [activities, validation]);

    const statusLines = useMemo(
        () => formatClimbLogbookSyncStatusLines(serverStatus),
        [serverStatus],
    );

    const isServerRunning = serverStatus?.state === 'running' || serverStatus?.state === 'queued';

    const runForSource = useCallback(async (routeSource) => {
        if (!isSignedIn || !userUid) {
            showToast('Sign in with Google to run server climb logbook sync.', { variant: 'warning' });
            return;
        }
        if (!validation.ok) {
            showToast(validation.error, { variant: 'warning' });
            return;
        }
        if (isServerRunning) {
            showToast('A server run is already in progress. You can close this tab — status refreshes automatically.', {
                variant: 'info',
            });
            return;
        }

        setBusySource(routeSource);
        try {
            await queueClimbLogbookServerSync(db, userUid, {
                startDate: validation.startDate,
                endDate: validation.endDate,
                routeSource,
            });
            const preview = previewBySource?.[routeSource];
            const routeHint = preview
                ? `${preview.ridesWithRouteInBatch} ride(s) with a ${labelClimbLogbookRouteSource(routeSource).toLowerCase()} in range`
                : 'Server queued';
            showToast(`Climb logbook sync queued (${labelClimbLogbookRouteSource(routeSource)}). ${routeHint}.`, {
                variant: 'success',
            });
        } catch (err) {
            showToast(err?.message || 'Could not queue server climb logbook sync.', { variant: 'error' });
        } finally {
            setBusySource(null);
        }
    }, [
        isSignedIn,
        userUid,
        validation,
        isServerRunning,
        previewBySource,
        showToast,
    ]);

    const applySingleDay = useCallback(() => {
        const ymd = validation.ok ? validation.startDate : siteDateToYmd(activities?.[0]?.date) || defaultEndYmd();
        setStartYmd(ymd);
        setEndYmd(ymd);
    }, [validation, activities]);

    return (
        <div className="pt-2 border-t border-cdborder/30 mt-4">
            <div className="flex items-center gap-2 mb-2">
                <MapPinned size={16} className="text-cdaccent shrink-0" aria-hidden />
                <p className="text-xs font-semibold text-cdtext">Climb logbook (server sync)</p>
            </div>
            <p className="text-xs text-cdmuted mb-3 leading-relaxed">
                Pick a date range, then start a server run for the route source you want.
                Strict polyline matching only counts climbs when your GPS track lies on the climb (descents do not count).
            </p>

            <div className="flex flex-wrap gap-3 items-end mb-3">
                <label className="flex flex-col gap-0.5 text-[10px] text-cdmuted font-bold uppercase">
                    From
                    <NlDateInput
                        value={startYmd}
                        onChange={setStartYmd}
                        className="bg-cdborder/30 border border-cdborder rounded-lg px-3 py-2 text-sm text-cdtext tabular-nums min-w-[9rem]"
                        aria-label="Climb logbook from date"
                    />
                </label>
                <label className="flex flex-col gap-0.5 text-[10px] text-cdmuted font-bold uppercase">
                    To
                    <NlDateInput
                        value={endYmd}
                        onChange={setEndYmd}
                        className="bg-cdborder/30 border border-cdborder rounded-lg px-3 py-2 text-sm text-cdtext tabular-nums min-w-[9rem]"
                        aria-label="Climb logbook to date"
                    />
                </label>
                <button
                    type="button"
                    onClick={applySingleDay}
                    className="px-3 py-2 text-[10px] font-bold rounded-lg border border-cdborder text-cdmuted hover:text-cdtext cd-transition"
                >
                    Same day
                </button>
            </div>

            {!validation.ok && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mb-3" role="status">
                    {validation.error}
                </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                {CLIMB_LOGBOOK_ROUTE_SOURCES.map((source) => {
                    const preview = previewBySource?.[source];
                    const disabled = !validation.ok || !isSignedIn || isServerRunning || busySource != null;
                    const isBusy = busySource === source;
                    return (
                        <div
                            key={source}
                            className="rounded-cdmd border border-cdborder/60 bg-cdsurface/40 p-3 flex flex-col gap-2"
                        >
                            <p className="text-xs font-semibold text-cdtext">{labelClimbLogbookRouteSource(source)}</p>
                            <p className="text-[10px] text-cdmuted leading-snug flex-1">
                                {describeClimbLogbookRouteSource(source)}
                            </p>
                            {preview && validation.ok && (
                                <p className="text-[10px] text-cdmuted tabular-nums">
                                    In range: {preview.ridesInPeriod} ride(s) · {preview.ridesWithRouteInBatch} with route
                                </p>
                            )}
                            <Button
                                type="button"
                                variant="tonal"
                                size="sm"
                                className="w-full"
                                disabled={disabled}
                                onClick={() => runForSource(source)}
                            >
                                {isBusy ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" aria-hidden />
                                        Queuing…
                                    </>
                                ) : (
                                    `Run · ${source === 'cpl' ? 'CPL' : source === 'intervals' ? 'Intervals' : 'Strava'}`
                                )}
                            </Button>
                        </div>
                    );
                })}
            </div>

            {!isSignedIn && (
                <p className="text-xs text-cdmuted mb-2">Sign in to queue server runs.</p>
            )}

            {isServerRunning && (
                <p className="text-xs text-cdtext flex items-center gap-2 mb-2" role="status">
                    <Loader2 size={14} className="animate-spin text-cdaccent" aria-hidden />
                    Server run in progress — you can close this tab; status refreshes automatically.
                </p>
            )}

            {statusLines.length > 0 && (
                <div
                    className="rounded-cdmd border border-cdborder/50 bg-cdsurface/60 p-3 text-xs text-cdtext space-y-1"
                    role="status"
                    aria-live="polite"
                >
                    {statusLines.map((line, i) => (
                        <p key={`${i}-${line.slice(0, 24)}`} className="leading-snug">
                            {line}
                        </p>
                    ))}
                </div>
            )}
        </div>
    );
}
