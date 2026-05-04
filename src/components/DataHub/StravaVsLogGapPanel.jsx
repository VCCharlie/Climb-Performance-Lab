/**
 * Strava vs local activity log: distance comparison and rides on Strava missing from the log.
 */
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Loader2, RefreshCw, ExternalLink, AlertCircle, GitCompareArrows } from 'lucide-react';
import {
    computeStravaVsLogGap,
    defaultGapRangeYtd,
    stravaLocalDateYmd,
} from '../../utils/stravaVsLogGap';
import { defaultStravaVsLogUi, mergeStravaVsLogUi } from '../../utils/stravaVsLogUi';
import { fetchAllBikeActivitiesForRecords, getStravaRawActivityListFetchCap } from '../../utils/stravaProfileRecords';
import { readStravaVsLogScanCache, writeStravaVsLogScanCache, clearStravaVsLogScanCache } from '../../utils/stravaVsLogScanCache';

const LOCALE = 'en-US';

const fmtKm = (km) =>
    `${Number(km).toLocaleString(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;

const fmtSignedKm = (km) => {
    const n = Number(km) || 0;
    const sign = n > 0 ? '+' : '';
    return `${sign}${fmtKm(n)}`;
};

const fmtInt = (n) => Math.round(Number(n) || 0).toLocaleString(LOCALE);

const movingTimeLabel = (sec) => {
    const s = Number(sec) || 0;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const th = 'text-left text-[10px] uppercase font-bold text-cdmuted py-2 px-2 border-b border-cdborder';
const td = 'py-2 px-2 text-xs text-cdtext border-b border-cdborder/40 align-top';

const StravaVsLogGapPanel = ({
    activities = [],
    scannedBikeActivities,
    historyComplete: scanHistoryComplete,
    getStravaToken,
    persistedUi,
    onPersistUi,
    stravaAthleteId,
}) => {
    const defaults = useMemo(() => defaultStravaVsLogUi(), []);
    const [startYmd, setStartYmd] = useState(defaults.startYmd);
    const [endYmd, setEndYmd] = useState(defaults.endYmd);
    const [includeEbikeRide, setIncludeEbikeRide] = useState(defaults.includeEbikeRide);
    const [useFuzzyMatch, setUseFuzzyMatch] = useState(defaults.useFuzzyMatch);
    const [fullScanActs, setFullScanActs] = useState(null);
    const [fullScanComplete, setFullScanComplete] = useState(true);
    const [scanBusy, setScanBusy] = useState(false);
    const [scanProgress, setScanProgress] = useState('');
    const [scanError, setScanError] = useState(null);
    const [cacheNotice, setCacheNotice] = useState(null);
    const [cachedScanMeta, setCachedScanMeta] = useState(null);
    /** 'disk' = restored from localStorage this session; 'live' = last full scan was from Strava API */
    const [fullScanSource, setFullScanSource] = useState(null);

    const persistTimerRef = useRef(null);
    const schedulePersistUi = useCallback(
        (patch) => {
            if (typeof onPersistUi !== 'function') return;
            if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
            persistTimerRef.current = setTimeout(() => {
                persistTimerRef.current = null;
                onPersistUi(patch);
            }, 750);
        },
        [onPersistUi]
    );

    useEffect(() => () => {
        if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    }, []);

    useEffect(() => {
        const m = mergeStravaVsLogUi(persistedUi);
        setStartYmd(m.startYmd);
        setEndYmd(m.endYmd);
        setIncludeEbikeRide(m.includeEbikeRide);
        setUseFuzzyMatch(m.useFuzzyMatch);
    }, [
        persistedUi?.startYmd,
        persistedUi?.endYmd,
        persistedUi?.includeEbikeRide,
        persistedUi?.useFuzzyMatch,
    ]);

    useEffect(() => {
        setCacheNotice(null);
        setFullScanActs(null);
        setFullScanComplete(true);
        setCachedScanMeta(null);
        setFullScanSource(null);
        if (stravaAthleteId == null || stravaAthleteId === '') return;
        const cached = readStravaVsLogScanCache(stravaAthleteId);
        if (cached?.activities?.length) {
            setFullScanActs(cached.activities);
            setFullScanComplete(!!cached.historyComplete);
            setCachedScanMeta({
                fetchedAt: cached.fetchedAt,
                count: cached.activities.length,
            });
            setFullScanSource('disk');
        }
    }, [stravaAthleteId]);

    /** null = use profile scan; array = result of explicit Refresh Strava ride list */
    const actsForGap = fullScanActs !== null ? fullScanActs : scannedBikeActivities;

    const gap = useMemo(() => {
        if (actsForGap === undefined || actsForGap === null) return null;
        if (!startYmd || !endYmd || startYmd > endYmd) return null;
        return computeStravaVsLogGap(actsForGap, activities, startYmd, endYmd, {
            includeEbikeRide,
            useFuzzyMatch,
        });
    }, [actsForGap, activities, startYmd, endYmd, includeEbikeRide, useFuzzyMatch]);

    const applyYtd = useCallback(() => {
        const d = defaultGapRangeYtd();
        setStartYmd(d.startYmd);
        setEndYmd(d.endYmd);
        schedulePersistUi({ startYmd: d.startYmd, endYmd: d.endYmd, includeEbikeRide, useFuzzyMatch });
    }, [includeEbikeRide, schedulePersistUi, useFuzzyMatch]);

    const applyLast365 = useCallback(() => {
        const end = new Date();
        const start = new Date(end);
        start.setDate(start.getDate() - 364);
        const ymd = (x) =>
            `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
        const sy = ymd(start);
        const ey = ymd(end);
        setStartYmd(sy);
        setEndYmd(ey);
        schedulePersistUi({ startYmd: sy, endYmd: ey, includeEbikeRide, useFuzzyMatch });
    }, [includeEbikeRide, schedulePersistUi, useFuzzyMatch]);

    const runFullStravaScan = useCallback(async () => {
        if (!getStravaToken) return;
        setScanError(null);
        setCacheNotice(null);
        setScanBusy(true);
        try {
            const token = await getStravaToken();
            const { activities: acts, historyComplete } = await fetchAllBikeActivitiesForRecords(
                token,
                (msg) => setScanProgress(msg),
                { includeEbikeRide: true }
            );
            setFullScanActs(acts);
            setFullScanComplete(historyComplete);
            if (stravaAthleteId != null && stravaAthleteId !== '') {
                const w = writeStravaVsLogScanCache(stravaAthleteId, acts, historyComplete);
                if (w.ok) {
                    setCachedScanMeta({
                        fetchedAt: w.fetchedAt || new Date().toISOString(),
                        count: acts.length,
                    });
                    setFullScanSource('live');
                    setCacheNotice(null);
                } else {
                    setCacheNotice(
                        w.reason === 'quota'
                            ? 'This browser could not store the full ride list (storage quota). Results stay until you close the tab — tap Refresh again after a reload.'
                            : 'Could not store the ride list in this browser cache.'
                    );
                }
            }
        } catch (e) {
            setScanError(e?.message || 'Strava scan failed');
        } finally {
            setScanBusy(false);
            setScanProgress('');
        }
    }, [getStravaToken, stravaAthleteId]);

    const missingRows = gap ? (useFuzzyMatch ? gap.fuzzyMissing : gap.strictMissing) : [];
    const missingSorted = useMemo(() => {
        const list = [...(missingRows || [])];
        list.sort((a, b) => stravaLocalDateYmd(b).localeCompare(stravaLocalDateYmd(a)));
        return list;
    }, [missingRows]);

    const effectiveHistoryComplete = fullScanActs !== null ? fullScanComplete : !!scanHistoryComplete;
    const fetchCap = getStravaRawActivityListFetchCap();

    const clearCachedRideList = useCallback(() => {
        if (stravaAthleteId != null && stravaAthleteId !== '') clearStravaVsLogScanCache(stravaAthleteId);
        setFullScanActs(null);
        setFullScanComplete(true);
        setCachedScanMeta(null);
        setFullScanSource(null);
        setCacheNotice(null);
    }, [stravaAthleteId]);

    const cachedFetchedLabel = useMemo(() => {
        if (!cachedScanMeta?.fetchedAt) return null;
        const t = Date.parse(cachedScanMeta.fetchedAt);
        if (Number.isNaN(t)) return null;
        return new Date(t).toLocaleString(LOCALE, { dateStyle: 'medium', timeStyle: 'short' });
    }, [cachedScanMeta?.fetchedAt]);

    return (
        <div className="space-y-4 animate-in fade-in duration-200">
            <section className="space-y-2">
                <h3 className="text-xs font-bold text-cdtext uppercase tracking-wide flex items-center gap-2">
                    <GitCompareArrows size={13} className="text-orange-400" /> Strava vs activity log
                </h3>
                <p className="text-[10px] text-cdmuted leading-relaxed">
                    Compare bike distance on Strava to rides stored in this app for the same calendar dates. Rides listed
                    below are on Strava but have no matching entry in your log (by Strava ID), or no fuzzy match when
                    that option is enabled. Import from Intervals.icu may omit commutes and short spins — those often
                    appear here.
                </p>
            </section>

            <div className="flex flex-wrap gap-2 items-end">
                <label className="flex flex-col gap-0.5 text-[10px] text-cdmuted font-bold uppercase">
                    From
                    <input
                        type="date"
                        value={startYmd}
                        onChange={(e) => {
                            const v = e.target.value;
                            setStartYmd(v);
                            schedulePersistUi({ startYmd: v, endYmd, includeEbikeRide, useFuzzyMatch });
                        }}
                        className="bg-cdbg border border-cdborder rounded px-2 py-1.5 text-xs text-cdtext font-mono"
                    />
                </label>
                <label className="flex flex-col gap-0.5 text-[10px] text-cdmuted font-bold uppercase">
                    To
                    <input
                        type="date"
                        value={endYmd}
                        onChange={(e) => {
                            const v = e.target.value;
                            setEndYmd(v);
                            schedulePersistUi({ startYmd, endYmd: v, includeEbikeRide, useFuzzyMatch });
                        }}
                        className="bg-cdbg border border-cdborder rounded px-2 py-1.5 text-xs text-cdtext font-mono"
                    />
                </label>
                <button
                    type="button"
                    onClick={applyYtd}
                    className="px-3 py-1.5 text-[10px] font-bold rounded border border-cdborder text-cdmuted hover:text-cdtext hover:border-orange-400/50 transition-colors"
                >
                    Year to date
                </button>
                <button
                    type="button"
                    onClick={applyLast365}
                    className="px-3 py-1.5 text-[10px] font-bold rounded border border-cdborder text-cdmuted hover:text-cdtext hover:border-orange-400/50 transition-colors"
                >
                    Last 365 days
                </button>
            </div>

            <div className="flex flex-wrap gap-4 items-center text-[11px]">
                <label className="flex items-center gap-2 cursor-pointer text-cdtext">
                    <input
                        type="checkbox"
                        checked={includeEbikeRide}
                        onChange={(e) => {
                            const v = e.target.checked;
                            setIncludeEbikeRide(v);
                            schedulePersistUi({ startYmd, endYmd, includeEbikeRide: v, useFuzzyMatch });
                        }}
                        className="rounded border-cdborder"
                    />
                    <span>Include e-bike rides</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-cdtext">
                    <input
                        type="checkbox"
                        checked={useFuzzyMatch}
                        onChange={(e) => {
                            const v = e.target.checked;
                            setUseFuzzyMatch(v);
                            schedulePersistUi({ startYmd, endYmd, includeEbikeRide, useFuzzyMatch: v });
                        }}
                        className="rounded border-cdborder"
                    />
                    <span title="Treat log rows without strava_id as possible matches (same day, similar distance)">
                        Subtract fuzzy matches (no Strava ID on log)
                    </span>
                </label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={runFullStravaScan}
                    disabled={scanBusy || !getStravaToken}
                    className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border border-orange-500/50 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 disabled:opacity-50"
                >
                    {scanBusy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    {scanBusy ? scanProgress || 'Scanning Strava…' : 'Refresh Strava ride list'}
                </button>
                {!effectiveHistoryComplete && (
                    <span className="text-[10px] text-yellow-500/90">
                        Strava list capped at ~{fmtInt(fetchCap)} activities — older rides may be missing.
                    </span>
                )}
                {fullScanActs !== null && stravaAthleteId != null && stravaAthleteId !== '' && (
                    <button
                        type="button"
                        onClick={clearCachedRideList}
                        disabled={scanBusy}
                        className="text-[10px] font-bold text-cdmuted hover:text-cdtext underline disabled:opacity-50"
                    >
                        Clear cached ride list
                    </button>
                )}
            </div>

            {cachedFetchedLabel && fullScanSource === 'disk' && fullScanActs !== null && (
                <p className="text-[10px] text-cdmuted">
                    Using <strong className="text-cdtext">browser-cached</strong> full Strava ride list from{' '}
                    <span className="text-cdtext font-mono">{cachedFetchedLabel}</span> ({fmtInt(cachedScanMeta?.count || 0)} rides).
                    Tap <strong className="text-cdtext">Refresh Strava ride list</strong> to update from Strava.
                </p>
            )}

            {cacheNotice && (
                <div className="text-[10px] text-yellow-500/90 bg-yellow-500/10 border border-yellow-500/25 rounded p-2">
                    {cacheNotice}
                </div>
            )}
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2 flex gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" /> {scanError}
                </div>
            )}

            {actsForGap === undefined && !scanBusy && (
                <p className="text-xs text-cdmuted border border-dashed border-cdborder rounded-lg p-3">
                    No Strava ride list loaded yet. Tap <strong className="text-cdtext">Refresh Strava ride list</strong>{' '}
                    above, or open <strong className="text-cdtext">Overview</strong> and use{' '}
                    <strong className="text-cdtext">Load from Strava</strong> once.
                </p>
            )}

            {gap && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                        <div className="bg-cdbg/60 border border-cdborder rounded-lg p-3">
                            <p className="text-[10px] text-cdmuted uppercase font-bold">Strava (range)</p>
                            <p className="text-lg font-bold text-cdtext">{fmtKm(gap.stravaTotalKm)}</p>
                            <p className="text-[10px] text-cdmuted">{fmtInt(gap.stravaRideCount)} rides</p>
                        </div>
                        <div className="bg-cdbg/60 border border-cdborder rounded-lg p-3">
                            <p className="text-[10px] text-cdmuted uppercase font-bold">This app (range)</p>
                            <p className="text-lg font-bold text-cdtext">{fmtKm(gap.logTotalKm)}</p>
                            <p className="text-[10px] text-cdmuted">{fmtInt(gap.logRideCount)} rides</p>
                        </div>
                        <div className="bg-cdbg/60 border border-cdborder rounded-lg p-3">
                            <p className="text-[10px] text-cdmuted uppercase font-bold">Difference</p>
                            <p
                                className={`text-lg font-bold ${gap.deltaKm > 0 ? 'text-orange-400' : gap.deltaKm < 0 ? 'text-cdaccent' : 'text-cdtext'}`}
                            >
                                {fmtSignedKm(gap.deltaKm)}
                            </p>
                            <p className="text-[10px] text-cdmuted">Strava − log</p>
                        </div>
                        <div className="bg-cdbg/60 border border-cdborder rounded-lg p-3">
                            <p className="text-[10px] text-cdmuted uppercase font-bold">
                                Missing on log ({useFuzzyMatch ? 'after fuzzy' : 'strict'})
                            </p>
                            <p className="text-lg font-bold text-orange-400">
                                {fmtKm(useFuzzyMatch ? gap.fuzzyMissingKm : gap.strictMissingKm)}
                            </p>
                            <p className="text-[10px] text-cdmuted">
                                {fmtInt(useFuzzyMatch ? gap.fuzzyMissingCount : gap.strictMissingCount)} rides
                            </p>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-cdborder">
                        <table className="w-full min-w-[640px] border-collapse">
                            <thead>
                                <tr className="bg-cdbg/80">
                                    <th className={th}>Date</th>
                                    <th className={th}>Name</th>
                                    <th className={th}>Type</th>
                                    <th className={`${th} text-right`}>Distance</th>
                                    <th className={`${th} text-right`}>Moving</th>
                                    <th className={th} />
                                </tr>
                            </thead>
                            <tbody>
                                {missingSorted.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className={`${td} text-cdmuted text-center py-6`}>
                                            No Strava-only rides in this range — totals should align (if the scan reached
                                            your full history).
                                        </td>
                                    </tr>
                                ) : (
                                    missingSorted.map((a) => {
                                        const km = (Number(a.distance) || 0) / 1000;
                                        const d = stravaLocalDateYmd(a);
                                        const st = a.sport_type || a.type || '';
                                        return (
                                            <tr key={a.id} className="hover:bg-cdborder/10">
                                                <td className={`${td} font-mono whitespace-nowrap`}>{d}</td>
                                                <td className={td}>
                                                    <span className="line-clamp-2">{a.name || '—'}</span>
                                                </td>
                                                <td className={`${td} text-cdmuted`}>{st}</td>
                                                <td className={`${td} text-right font-mono`}>{fmtKm(km)}</td>
                                                <td className={`${td} text-right text-cdmuted`}>
                                                    {movingTimeLabel(a.moving_time)}
                                                </td>
                                                <td className={td}>
                                                    <a
                                                        href={`https://www.strava.com/activities/${a.id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-orange-400 hover:text-orange-300 font-bold"
                                                    >
                                                        Strava
                                                        <ExternalLink size={11} />
                                                    </a>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};

export default StravaVsLogGapPanel;
