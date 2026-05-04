/**
 * Strava athlete profile: summary, recent activity, bikes, KOMs/CRs, starred segments.
 * Data from Strava REST API; persisted via App.jsx.
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
    Loader2,
    RefreshCw,
    Trophy,
    Star,
    TrendingUp,
    Clock,
    Mountain,
    Bike,
    ExternalLink,
    AlertCircle,
    Crown,
    User,
    MapPin,
    Activity,
    Route,
} from 'lucide-react';
import {
    fetchAllBikeActivitiesForRecords,
    matchRecordActivities,
    aggregateBikeActivitiesByContext,
    getStravaRawActivityListFetchCap,
} from '../../utils/stravaProfileRecords';
import { computeRideMilestones } from '../../utils/stravaMilestones';
import { stravaHttpErrorMessage } from '../../utils/stravaHttp';
import { computeYtdYearOverYearFromActivities, percentChange } from '../../utils/stravaYtdCompare';
import { navigateToStravaSegment } from '../../utils/strava';
import { mergeStravaVsLogUi } from '../../utils/stravaVsLogUi';
import StravaVsLogGapPanel from './StravaVsLogGapPanel';

const STRAVA_BASE = 'https://www.strava.com/api/v3';
const LOCALE = 'nl-NL';

const fmt = {
    int: (n) => Math.round(Number(n) || 0).toLocaleString(LOCALE),
    num: (n, maxFrac = 1) => Number(n).toLocaleString(LOCALE, { minimumFractionDigits: 0, maximumFractionDigits: maxFrac }),
    dist: (m) => `${(Number(m) / 1000).toLocaleString(LOCALE, { minimumFractionDigits: 0, maximumFractionDigits: 1 })} km`,
    elev: (m) => `${Math.round(Number(m) || 0).toLocaleString(LOCALE)} m`,
    time: (s) => {
        const sec = Number(s) || 0;
        const h = Math.floor(sec / 3600);
        const mi = Math.floor((sec % 3600) / 60);
        return h > 0 ? `${h}u ${mi}m` : `${mi}m`;
    },
    segTime: (s) => {
        const sec = Number(s) || 0;
        const m = Math.floor(sec / 60);
        const se = sec % 60;
        return `${m}:${String(se).padStart(2, '0')}`;
    },
};

const StatCard = ({ icon, iconColor, label, value, sub }) => (
    <div className="bg-cdbg/60 border border-cdborder rounded-lg p-3 flex items-start gap-3">
        {React.createElement(icon, { size: 18, className: `${iconColor} shrink-0 mt-0.5` })}
        <div>
            <p className="text-[10px] text-cdmuted uppercase tracking-wide">{label}</p>
            <p className="text-lg font-bold text-cdtext leading-tight">{value}</p>
            {sub && <p className="text-[10px] text-cdmuted">{sub}</p>}
        </div>
    </div>
);

const fetchPaginated = async (url, token) => {
    let page = 1;
    let all = [];
    while (true) {
        const resp = await fetch(`${url}${url.includes('?') ? '&' : '?'}per_page=200&page=${page}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!resp.ok) throw new Error(stravaHttpErrorMessage(resp, 'Strava API error'));
        const json = await resp.json();
        if (!Array.isArray(json) || json.length === 0) break;
        all = all.concat(json);
        if (json.length < 200) break;
        page++;
    }
    return all;
};

const athleteDisplayName = (a) => {
    if (!a) return '';
    const first = (a.firstname || '').trim();
    const last = (a.lastname || '').trim();
    const full = `${first} ${last}`.trim();
    return full || a.username || `Athlete ${a.id || ''}`;
};

const athleteLocation = (a) => {
    if (!a) return '';
    const parts = [a.city, a.state, a.country].filter(Boolean);
    return parts.join(', ');
};

const th = 'text-left text-[10px] uppercase font-bold text-cdmuted py-2 px-2 border-b border-cdborder';
const td = 'py-2 px-2 text-xs text-cdtext border-b border-cdborder/40';

const StravaApiRideTable = ({ stats }) => {
    const rows = [
        { label: 'All-time', t: stats?.all_ride_totals },
        { label: 'Year to date', t: stats?.ytd_ride_totals },
        { label: 'Last 4 weeks', t: stats?.recent_ride_totals },
    ];
    return (
        <div className="overflow-x-auto rounded-lg border border-cdborder">
            <table className="w-full min-w-[640px] border-collapse">
                <thead>
                    <tr className="bg-cdbg/80">
                        <th className={th}>Period</th>
                        <th className={th}>Rides</th>
                        <th className={th}>Distance</th>
                        <th className={th}>Elevation</th>
                        <th className={th}>Moving time</th>
                        <th className={th}>Avg / ride (dist)</th>
                        <th className={th}>Avg / ride (elev)</th>
                        <th className={th}>Avg / ride (time)</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(({ label, t }) => {
                        const c = Number(t?.count) || 0;
                        const d = Number(t?.distance) || 0;
                        const e = Number(t?.elevation_gain) || 0;
                        const mv = Number(t?.moving_time) || 0;
                        const ad = c > 0 ? d / c : 0;
                        const ae = c > 0 ? e / c : 0;
                        const at = c > 0 ? mv / c : 0;
                        return (
                            <tr key={label} className="hover:bg-cdborder/10">
                                <td className={`${td} font-bold text-cdtext`}>{label}</td>
                                <td className={td}>{c > 0 ? fmt.int(c) : '–'}</td>
                                <td className={td}>{c > 0 ? fmt.dist(d) : '–'}</td>
                                <td className={td}>{c > 0 ? fmt.elev(e) : '–'}</td>
                                <td className={td}>{c > 0 ? fmt.time(mv) : '–'}</td>
                                <td className={td}>{c > 0 ? fmt.dist(ad) : '–'}</td>
                                <td className={td}>{c > 0 ? fmt.elev(ae) : '–'}</td>
                                <td className={td}>{c > 0 ? fmt.time(at) : '–'}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <p className="text-[9px] text-cdmuted px-2 py-1.5 bg-cdbg/40">From Strava athlete stats API (rides only; indoor + outdoor combined per Strava).</p>
        </div>
    );
};

const MilestoneBar = ({ title, currentLabel, targetLabel, remainingLabel, pct }) => (
    <div className="rounded-lg border border-cdborder/60 bg-cdbg/40 p-2.5">
        <div className="flex justify-between items-baseline gap-2 mb-1">
            <span className="text-[10px] font-bold text-cdmuted uppercase">{title}</span>
            <span className="text-[10px] text-cdmuted text-right">{remainingLabel}</span>
        </div>
        <div className="text-xs text-cdtext mb-1.5">
            <span className="font-mono font-bold">{currentLabel}</span>
            <span className="text-cdmuted"> → </span>
            <span className="font-mono font-bold text-orange-400">{targetLabel}</span>
        </div>
        <div className="h-2 rounded-full bg-cdsurface overflow-hidden border border-cdborder/50">
            <div
                className="h-full bg-gradient-to-r from-orange-500 to-yellow-400 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
            />
        </div>
    </div>
);

const MilestonesBlock = ({ totals, periodLabel }) => {
    if (!totals) return null;
    const c = Number(totals.count) || 0;
    const d = Number(totals.distance) || 0;
    const e = Number(totals.elevation_gain) || 0;
    const t = Number(totals.moving_time) || 0;
    if (c === 0 && d === 0 && e === 0 && t === 0) return null;
    const m = computeRideMilestones(c, d, e, t);
    return (
        <div className="rounded-xl border border-cdborder bg-cdbg/30 p-3 space-y-2">
            <h4 className="text-[10px] font-bold text-cdmuted uppercase tracking-wide">Toward next milestone — {periodLabel}</h4>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <MilestoneBar
                    title="Rides"
                    currentLabel={`${fmt.int(m.rides.current)} rides`}
                    targetLabel={`${fmt.int(m.rides.target)} rides`}
                    remainingLabel={`${fmt.int(m.rides.remaining)} to go`}
                    pct={m.rides.pct}
                />
                <MilestoneBar
                    title="Distance"
                    currentLabel={`${fmt.num(m.distanceKm.current, 1)} km`}
                    targetLabel={`${fmt.int(m.distanceKm.targetKm)} km`}
                    remainingLabel={`${fmt.num(m.distanceKm.remainingKm, 1)} km to go`}
                    pct={m.distanceKm.pct}
                />
                <MilestoneBar
                    title="Elevation"
                    currentLabel={fmt.elev(m.elevation.current)}
                    targetLabel={fmt.elev(m.elevation.target)}
                    remainingLabel={`${fmt.int(m.elevation.remaining)} m to go`}
                    pct={m.elevation.pct}
                />
                <MilestoneBar
                    title="Moving time (total)"
                    currentLabel={fmt.time(m.movingTime.currentSec)}
                    targetLabel={fmt.time(m.movingTime.targetSec)}
                    remainingLabel={`${fmt.time(m.movingTime.remainingSec)} to go`}
                    pct={m.movingTime.pct}
                />
            </div>
        </div>
    );
};

/** One line: when data was fetched + what the next Refresh will re-pull (scan cap context). */
const ProfileDataFreshnessLine = ({ fetchedAt, scanMeta }) => {
    if (!fetchedAt) return null;
    const when = new Date(fetchedAt);
    if (Number.isNaN(when.getTime())) return null;
    const dateStr = when.toLocaleString(LOCALE, { dateStyle: 'medium', timeStyle: 'short' });
    const listCap = getStravaRawActivityListFetchCap();
    let nextRefresh = '';
    if (scanMeta && scanMeta.historyComplete === false) {
        nextRefresh = `Volgende refresh haalt tot ${fmt.int(listCap)} activiteiten op bij Strava; recordlinks en scan-tabellen kunnen oudere ritten missen.`;
    } else if (scanMeta && scanMeta.historyComplete === true) {
        nextRefresh = 'Volgende refresh haalt opnieuw Strava-statistieken, KOMs, starred segments en je volledige gescande rithistorie op (binnen dezelfde API-limieten).';
    } else {
        nextRefresh = 'Volgende refresh werkt Strava-statistieken en lijsten bij; gebruik Refresh na koppelen om de activiteitenscan te laden (recordlinks / indoor-outdoor).';
    }
    return (
        <p className="text-[10px] text-cdmuted leading-relaxed">
            <span className="text-cdtext font-medium">Profieldata van {dateStr}</span>
            <span className="mx-1.5 text-cdborder">·</span>
            {nextRefresh}
        </p>
    );
};

const OUTDOOR_SPORT_TYPES = new Set(['Ride', 'GravelRide', 'MountainBikeRide', 'Cycling', 'EBikeRide']);

const komEffortIsOutdoor = (effort) => {
    const st = effort?.segment?.activity_type || effort?.segment?.sport_type || '';
    if (!st) return true;
    if (st === 'VirtualRide') return false;
    return OUTDOOR_SPORT_TYPES.has(st);
};

const starredSegmentIsOutdoor = (seg) => {
    const st = seg?.activity_type || seg?.sport_type || '';
    if (!st) return true;
    if (st === 'VirtualRide') return false;
    return OUTDOOR_SPORT_TYPES.has(st);
};

const YtdYearOverYearBlock = ({ ytdYoy }) => {
    if (!ytdYoy?.thisYtd || !ytdYoy?.prevYtd) return null;
    const { thisYtd, prevYtd } = ytdYoy;
    const dPct = percentChange(thisYtd.distance, prevYtd.distance);
    const ePct = percentChange(thisYtd.elevation_gain, prevYtd.elevation_gain);
    const tPct = percentChange(thisYtd.moving_time, prevYtd.moving_time);
    const cPct = percentChange(thisYtd.count, prevYtd.count);
    const line = (label, cur, prev, pct, fmtCur) => {
        if (prev === 0 && cur === 0) return null;
        const arrow = pct == null ? '—' : pct > 0 ? `+${fmt.num(Math.abs(pct), 0)}%` : `-${fmt.num(Math.abs(pct), 0)}%`;
        const cmp = pct == null ? 'geen vergelijking vorig jaar' : `${arrow} t.o.v. dezelfde periode vorig jaar`;
        return (
            <p className="text-[11px] text-cdtext">
                <span className="font-bold text-cdmuted">{label}:</span>{' '}
                {fmtCur(cur)} <span className="text-cdmuted">(vorig jaar {fmtCur(prev)})</span>
                <span className="text-orange-400 font-medium"> · {cmp}</span>
            </p>
        );
    };
    return (
        <div className="rounded-xl border border-cdborder/70 bg-cdbg/40 p-3 space-y-1">
            <h4 className="text-[10px] font-bold text-cdmuted uppercase tracking-wide">YTD t.o.v. vorig jaar (zelfde kalenderdatum)</h4>
            <p className="text-[9px] text-cdmuted mb-2">Berekend uit je gescande Strava-fietsritten bij deze refresh — alleen betrouwbaar als je volledige historie in de scan past.</p>
            {line('Afstand', thisYtd.distance, prevYtd.distance, dPct, (m) => fmt.dist(m))}
            {line('Hoogtemeters', thisYtd.elevation_gain, prevYtd.elevation_gain, ePct, (m) => fmt.elev(m))}
            {line('Bewegingstijd', thisYtd.moving_time, prevYtd.moving_time, tPct, (s) => fmt.time(s))}
            {line('Ritten', thisYtd.count, prevYtd.count, cPct, (n) => `${fmt.int(n)} ritten`)}
        </div>
    );
};

const ScanContextBlock = ({ title, agg, footnote }) => {
    if (!agg) return null;
    const ctxs = [
        { key: 'combined', label: 'Combined' },
        { key: 'outdoor', label: 'Outdoor' },
        { key: 'indoor', label: 'Indoor (virtual)' },
    ];
    return (
        <div className="rounded-lg border border-cdborder overflow-hidden">
            <div className="text-[10px] font-bold text-cdtext uppercase tracking-wide px-3 py-2 bg-cdbg/60 border-b border-cdborder">{title}</div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-xs">
                    <thead>
                        <tr className="bg-cdbg/50">
                            <th className={th} />
                            {ctxs.map(({ key, label }) => (
                                <th key={key} className={th} colSpan={2}>{label}</th>
                            ))}
                        </tr>
                        <tr className="bg-cdbg/30">
                            <th className={th} />
                            {ctxs.map(({ key }) => (
                                <React.Fragment key={key}>
                                    <th className={th}>Total</th>
                                    <th className={th}>Avg / ride</th>
                                </React.Fragment>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className={`${td} font-bold text-cdmuted`}>Rides</td>
                            {ctxs.map(({ key }) => {
                                const b = agg[key];
                                return (
                                    <React.Fragment key={key}>
                                        <td className={td}>{fmt.int(b.count)}</td>
                                        <td className={td}>—</td>
                                    </React.Fragment>
                                );
                            })}
                        </tr>
                        <tr>
                            <td className={`${td} font-bold text-cdmuted`}>Distance</td>
                            {ctxs.map(({ key }) => {
                                const b = agg[key];
                                return (
                                    <React.Fragment key={key}>
                                        <td className={td}>{fmt.dist(b.distance)}</td>
                                        <td className={td}>{b.count > 0 ? fmt.dist(b.avg_distance) : '–'}</td>
                                    </React.Fragment>
                                );
                            })}
                        </tr>
                        <tr>
                            <td className={`${td} font-bold text-cdmuted`}>Elevation</td>
                            {ctxs.map(({ key }) => {
                                const b = agg[key];
                                return (
                                    <React.Fragment key={key}>
                                        <td className={td}>{fmt.elev(b.elevation_gain)}</td>
                                        <td className={td}>{b.count > 0 ? fmt.elev(b.avg_elevation) : '–'}</td>
                                    </React.Fragment>
                                );
                            })}
                        </tr>
                        <tr>
                            <td className={`${td} font-bold text-cdmuted`}>Moving time</td>
                            {ctxs.map(({ key }) => {
                                const b = agg[key];
                                return (
                                    <React.Fragment key={key}>
                                        <td className={td}>{fmt.time(b.moving_time)}</td>
                                        <td className={td}>{b.count > 0 ? fmt.time(b.avg_moving_time) : '–'}</td>
                                    </React.Fragment>
                                );
                            })}
                        </tr>
                    </tbody>
                </table>
            </div>
            {footnote && <p className="text-[9px] text-cdmuted px-2 py-1.5 bg-cdbg/30">{footnote}</p>}
        </div>
    );
};

const StravaProfileTab = ({ getStravaToken, athleteId, persistedData, onDataChange, activities = [] }) => {
    const [subTab, setSubTab] = useState('overview');
    const [isFetching, setIsFetching] = useState(false);
    const [fetchProgress, setFetchProgress] = useState('');
    const [error, setError] = useState(null);
    const [data, setData] = useState(persistedData ?? null);
    const [komFilter, setKomFilter] = useState('all'); // 'all' | 'outdoor'
    const [komSort, setKomSort] = useState('default'); // 'default' | 'length_desc' | 'grade_desc'
    const [starredFilter, setStarredFilter] = useState('all');
    const [starredSort, setStarredSort] = useState('default');

    React.useEffect(() => {
        if (persistedData == null) return;
        setData((prev) => {
            if (!prev) return persistedData;
            if (prev.fetchedAt && persistedData.fetchedAt && prev.fetchedAt === persistedData.fetchedAt) return prev;
            const merged = { ...persistedData };
            if (prev.vsLogUi) merged.vsLogUi = mergeStravaVsLogUi(prev.vsLogUi);
            return merged;
        });
    }, [persistedData]);

    const dataRef = React.useRef(data);
    dataRef.current = data;

    const applyData = useCallback((incoming) => {
        const prev = dataRef.current;
        const merged = { ...incoming };
        if (prev?.vsLogUi) merged.vsLogUi = mergeStravaVsLogUi(prev.vsLogUi);
        dataRef.current = merged;
        setData(merged);
        onDataChange?.(merged);
    }, [onDataChange]);

    const persistVsLogUi = useCallback((nextUi) => {
        const mergedUi = mergeStravaVsLogUi(nextUi);
        const prev = dataRef.current;
        const next = prev ? { ...prev, vsLogUi: mergedUi } : { vsLogUi: mergedUi };
        dataRef.current = next;
        setData(next);
        onDataChange?.(next);
    }, [onDataChange]);

    const fetchAll = useCallback(async () => {
        if (!getStravaToken || !athleteId) return;
        setIsFetching(true);
        setError(null);

        try {
            const token = await getStravaToken();

            setFetchProgress('Loading profile…');
            const athleteResp = await fetch(`${STRAVA_BASE}/athlete`, { headers: { Authorization: `Bearer ${token}` } });
            const athlete = athleteResp.ok ? await athleteResp.json() : null;

            setFetchProgress('Loading ride statistics…');
            const statsResp = await fetch(`${STRAVA_BASE}/athletes/${athleteId}/stats`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!statsResp.ok) throw new Error(stravaHttpErrorMessage(statsResp, 'Stats error'));
            const stats = await statsResp.json();

            setFetchProgress('Loading KOMs / CRs…');
            const koms = await fetchPaginated(`${STRAVA_BASE}/athletes/${athleteId}/koms`, token);

            setFetchProgress('Loading starred segments…');
            const starred = await fetchPaginated(`${STRAVA_BASE}/segments/starred`, token);

            setFetchProgress('Loading bikes…');
            const bikes = (athlete?.bikes || []).sort((a, b) => (b.distance || 0) - (a.distance || 0));

            setFetchProgress('Linking record rides…');
            let recordRides = null;
            let activityScan = null;
            let scannedBikeActivities = null;
            try {
                const { activities: scanned, historyComplete } = await fetchAllBikeActivitiesForRecords(
                    token,
                    (msg) => setFetchProgress(msg)
                );
                scannedBikeActivities = scanned;
                recordRides = matchRecordActivities(scanned, stats, { historyComplete });
                const now = Date.now();
                const ms28d = 28 * 24 * 60 * 60 * 1000;
                const yStart = new Date(new Date().getFullYear(), 0, 1).getTime();
                const actTime = (a) => new Date(a.start_date_local || a.start_date).getTime();
                const recentActs = scanned.filter((a) => actTime(a) >= now - ms28d);
                const ytdActs = scanned.filter((a) => actTime(a) >= yStart);
                activityScan = {
                    periods: {
                        all: aggregateBikeActivitiesByContext(scanned),
                        ytd: aggregateBikeActivitiesByContext(ytdActs),
                        last4w: aggregateBikeActivitiesByContext(recentActs),
                    },
                    ridesScanned: scanned.length,
                    historyComplete,
                };
            } catch (recErr) {
                console.warn('[Strava profile] Record ride linking failed:', recErr);
                recordRides = null;
            }

            applyData({
                athlete,
                stats,
                koms,
                starred,
                bikes,
                recordRides,
                activityScan,
                scannedBikeActivities,
                fetchedAt: new Date().toISOString()
            });
        } catch (e) {
            setError(e.message);
        } finally {
            setIsFetching(false);
            setFetchProgress('');
        }
    }, [getStravaToken, athleteId, applyData]);

    const {
        athlete,
        stats,
        koms,
        starred,
        bikes,
        recordRides,
        activityScan: rawActivityScan,
        scannedBikeActivities,
    } = data || {};

    const ytdYoy = useMemo(() => {
        if (!scannedBikeActivities?.length || !data?.fetchedAt) return null;
        return computeYtdYearOverYearFromActivities(scannedBikeActivities, new Date(data.fetchedAt));
    }, [scannedBikeActivities, data?.fetchedAt]);

    const filteredSortedKoms = useMemo(() => {
        if (!koms?.length) return [];
        let list = [...koms];
        if (komFilter === 'outdoor') {
            list = list.filter(komEffortIsOutdoor);
        }
        if (komSort === 'length_desc') {
            list.sort((a, b) => (Number(b.segment?.distance) || 0) - (Number(a.segment?.distance) || 0));
        } else if (komSort === 'grade_desc') {
            list.sort((a, b) => (Number(b.segment?.average_grade) || 0) - (Number(a.segment?.average_grade) || 0));
        }
        return list;
    }, [koms, komFilter, komSort]);

    const filteredSortedStarred = useMemo(() => {
        if (!starred?.length) return [];
        let list = [...starred];
        if (starredFilter === 'outdoor') {
            list = list.filter(starredSegmentIsOutdoor);
        }
        if (starredSort === 'length_desc') {
            list.sort((a, b) => (Number(b.distance) || 0) - (Number(a.distance) || 0));
        } else if (starredSort === 'grade_desc') {
            list.sort((a, b) => (Number(b.average_grade) || 0) - (Number(a.average_grade) || 0));
        } else if (starredSort === 'elev_desc') {
            list.sort((a, b) => (Number(b.total_elevation_gain) || 0) - (Number(a.total_elevation_gain) || 0));
        }
        return list;
    }, [starred, starredFilter, starredSort]);

    if (!getStravaToken) {
        return (
            <div className="text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                Connect Strava first under <strong>Settings → Strava connection</strong>.
            </div>
        );
    }

    const activityScan = rawActivityScan?.periods
        ? rawActivityScan
        : rawActivityScan?.combined != null
            ? {
                ...rawActivityScan,
                periods: {
                    all: {
                        combined: rawActivityScan.combined,
                        outdoor: rawActivityScan.outdoor,
                        indoor: rawActivityScan.indoor,
                    },
                    ytd: null,
                    last4w: null,
                },
            }
            : rawActivityScan;
    const komCount = koms ? koms.filter(e => e.is_kom !== false).length : 0;
    const crCount = koms ? koms.filter(e => e.is_kom === false).length : 0;
    const recent = stats?.recent_ride_totals;
    const profileName = athleteDisplayName(athlete);
    const location = athleteLocation(athlete);
    const avatarUrl = athlete?.profile_medium || athlete?.profile;

    return (
        <div className="space-y-6">
            {athlete && (
                <div className="rounded-xl border border-cdborder bg-gradient-to-br from-cdbg/80 to-cdborder/20 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt=""
                                className="w-16 h-16 rounded-full border-2 border-orange-500/40 object-cover shrink-0"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-full border-2 border-cdborder bg-cdbg flex items-center justify-center shrink-0">
                                <User size={28} className="text-cdmuted" />
                            </div>
                        )}
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-lg font-bold text-cdtext truncate">{profileName}</h2>
                                <a
                                    href={`https://www.strava.com/athletes/${athleteId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-orange-400 hover:text-orange-300 shrink-0"
                                    title="Open on Strava"
                                >
                                    <ExternalLink size={16} />
                                </a>
                            </div>
                            {location && (
                                <p className="text-xs text-cdmuted flex items-center gap-1 mt-0.5">
                                    <MapPin size={12} className="shrink-0" /> {location}
                                </p>
                            )}
                            <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-cdmuted">
                                {athlete?.weight > 0 && (
                                    <span>Weight: <span className="text-cdtext font-medium">{athlete.weight} kg</span></span>
                                )}
                                {athlete?.ftp > 0 && (
                                    <span>FTP (Strava): <span className="text-cdtext font-medium">{athlete.ftp} W</span></span>
                                )}
                                {komCount + crCount > 0 && (
                                    <span className="flex items-center gap-1">
                                        <Trophy size={11} className="text-yellow-400" /> {komCount} KOM
                                        {crCount > 0 && <span className="text-purple-400">· {crCount} CR</span>}
                                    </span>
                                )}
                                {starred?.length > 0 && (
                                    <span className="flex items-center gap-1">
                                        <Star size={11} className="text-yellow-400 fill-yellow-400" /> {starred.length} starred
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={fetchAll}
                        disabled={isFetching || !athleteId}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg text-sm transition-colors shrink-0 w-full sm:w-auto"
                    >
                        {isFetching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        {isFetching ? fetchProgress || 'Loading…' : (data ? 'Refresh' : 'Load from Strava')}
                    </button>
                </div>
            )}

            {!athlete && (
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs text-cdmuted">
                            All-time ride stats, KOMs / CRs, and starred segments from your Strava account.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={fetchAll}
                        disabled={isFetching || !athleteId}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded text-sm transition-colors shrink-0"
                    >
                        {isFetching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        {isFetching ? fetchProgress || 'Loading…' : (data ? 'Refresh' : 'Load from Strava')}
                    </button>
                </div>
            )}

            {data?.fetchedAt && !isFetching && (
                <ProfileDataFreshnessLine
                    fetchedAt={data.fetchedAt}
                    scanMeta={
                        data.activityScan != null
                            ? { historyComplete: data.activityScan.historyComplete }
                            : data.recordRides != null
                                ? { historyComplete: data.recordRides.historyComplete }
                                : null
                    }
                />
            )}

            {!athleteId && (
                <div className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded p-3 flex gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    Reconnect Strava in Settings once so your athlete ID is saved.
                </div>
            )}

            {getStravaToken && athleteId && (
                <p className="text-[10px] text-cdmuted leading-relaxed border border-cdborder/50 rounded-lg px-3 py-2 bg-cdbg/30">
                    After <strong className="text-cdtext">Load / Refresh</strong>, this profile is saved to your account (Firestore) and this browser — other PCs see the last synced copy until you refresh there too. For live Strava data, tap Refresh while signed in with Strava.
                </p>
            )}

            {error && (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded p-3 flex gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" /> {error}
                </div>
            )}

            {getStravaToken && (
                <div className="flex border-b border-cdborder">
                    <button
                        type="button"
                        onClick={() => setSubTab('overview')}
                        className={`flex-1 py-2.5 text-xs font-bold ${subTab === 'overview' ? 'text-orange-400 border-b-2 border-orange-400 -mb-px' : 'text-cdmuted hover:text-cdtext'}`}
                    >
                        Overview
                    </button>
                    <button
                        type="button"
                        onClick={() => setSubTab('ridestats')}
                        className={`flex-1 py-2.5 text-xs font-bold ${subTab === 'ridestats' ? 'text-orange-400 border-b-2 border-orange-400 -mb-px' : 'text-cdmuted hover:text-cdtext'}`}
                    >
                        Ride stats
                    </button>
                    <button
                        type="button"
                        onClick={() => setSubTab('vslog')}
                        className={`flex-1 py-2.5 text-xs font-bold ${subTab === 'vslog' ? 'text-orange-400 border-b-2 border-orange-400 -mb-px' : 'text-cdmuted hover:text-cdtext'}`}
                    >
                        Vs log
                    </button>
                </div>
            )}

            {subTab === 'overview' && (
                <>
                    {recent && (recent.count > 0 || recent.distance > 0) && (
                        <section className="space-y-2">
                            <h3 className="text-xs font-bold text-cdtext uppercase tracking-wide flex items-center gap-2">
                                <Activity size={13} className="text-orange-400" /> Last 4 weeks (rides)
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <StatCard icon={Bike} iconColor="text-orange-400" label="Activities" value={recent.count != null ? fmt.int(recent.count) : '–'} />
                                <StatCard icon={TrendingUp} iconColor="text-blue-400" label="Distance" value={fmt.dist(recent.distance ?? 0)} />
                                <StatCard icon={Mountain} iconColor="text-green-400" label="Elevation" value={fmt.elev(recent.elevation_gain ?? 0)} />
                                <StatCard icon={Clock} iconColor="text-purple-400" label="Moving time" value={fmt.time(recent.moving_time ?? 0)} />
                            </div>
                        </section>
                    )}

                    {ytdYoy && activityScan?.historyComplete && (
                        <YtdYearOverYearBlock ytdYoy={ytdYoy} />
                    )}

                    {stats && (
                        <section className="space-y-2">
                            <h3 className="text-xs font-bold text-cdtext uppercase tracking-wide flex items-center gap-2">
                                <TrendingUp size={13} className="text-orange-400" /> All-time ride totals
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <StatCard icon={Bike} iconColor="text-orange-400" label="Rides" value={stats.all_ride_totals?.count != null ? fmt.int(stats.all_ride_totals.count) : '–'} sub={`YTD: ${stats.ytd_ride_totals?.count != null ? fmt.int(stats.ytd_ride_totals.count) : '–'}`} />
                                <StatCard icon={TrendingUp} iconColor="text-blue-400" label="Distance" value={fmt.dist(stats.all_ride_totals?.distance ?? 0)} sub={`YTD: ${fmt.dist(stats.ytd_ride_totals?.distance ?? 0)}`} />
                                <StatCard icon={Mountain} iconColor="text-green-400" label="Elevation" value={fmt.elev(stats.all_ride_totals?.elevation_gain ?? 0)} sub={`YTD: ${fmt.elev(stats.ytd_ride_totals?.elevation_gain ?? 0)}`} />
                                <StatCard icon={Clock} iconColor="text-purple-400" label="Moving time" value={fmt.time(stats.all_ride_totals?.moving_time ?? 0)} sub={`YTD: ${fmt.time(stats.ytd_ride_totals?.moving_time ?? 0)}`} />
                            </div>
                            <MilestonesBlock totals={stats.all_ride_totals} periodLabel="all-time (Strava)" />
                            <MilestonesBlock totals={stats.ytd_ride_totals} periodLabel="YTD (Strava)" />
                            {(stats.biggest_climb_elevation_gain > 0 || stats.biggest_ride_distance > 0 || recordRides?.maxTotalElevationRide) && (
                                <div className="bg-cdbg/40 border border-cdborder rounded-lg p-3 space-y-3">
                                    <h4 className="text-[10px] font-bold text-cdmuted uppercase tracking-wide flex items-center gap-2">
                                        <Route size={12} className="text-orange-400" /> Personal records (Strava)
                                    </h4>
                                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                        {stats.biggest_ride_distance > 0 && (
                                            <div className="text-xs text-cdmuted rounded border border-cdborder/60 bg-cdbg/50 p-2.5">
                                                <div className="text-[10px] uppercase font-bold text-cdmuted mb-1">Longest ride</div>
                                                <div className="text-cdtext font-bold">{fmt.dist(stats.biggest_ride_distance)}</div>
                                                {recordRides?.longestRide ? (
                                                    <a
                                                        href={`https://www.strava.com/activities/${recordRides.longestRide.id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="mt-2 inline-flex items-center gap-1 text-orange-400 hover:text-orange-300 font-bold"
                                                    >
                                                        {recordRides.longestRide.name || 'Open activity'}
                                                        <ExternalLink size={11} />
                                                    </a>
                                                ) : (
                                                    <p className="mt-2 text-[10px] text-cdmuted">
                                                        {recordRides == null
                                                            ? 'Could not load activity links (API error).'
                                                            : !recordRides.historyComplete
                                                                ? `Link unavailable: history scan capped at ${fmt.int(getStravaRawActivityListFetchCap())} activities.`
                                                                : 'No ride in scanned history matched Strava record numbers.'}
                                                    </p>
                                                )}
                                                {recordRides?.longestApprox && (
                                                    <p className="text-[10px] text-yellow-500/90 mt-1">Best match: max distance in scanned rides (± stats).</p>
                                                )}
                                            </div>
                                        )}
                                        {stats.biggest_climb_elevation_gain > 0 && (
                                            <div className="text-xs text-cdmuted rounded border border-cdborder/60 bg-cdbg/50 p-2.5">
                                                <div className="text-[10px] uppercase font-bold text-cdmuted mb-1">Biggest climb (Strava stat)</div>
                                                <div className="text-cdtext font-bold">{fmt.elev(stats.biggest_climb_elevation_gain)}</div>
                                                <p className="text-[9px] text-cdmuted mt-1 leading-snug">
                                                    Strava’s athlete stat for the <span className="text-cdtext">largest single detected climb</span> in one ride — not the same as that ride’s total elevation gain.
                                                </p>
                                                {recordRides?.mostElevation ? (
                                                    <a
                                                        href={`https://www.strava.com/activities/${recordRides.mostElevation.id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="mt-2 inline-flex items-center gap-1 text-orange-400 hover:text-orange-300 font-bold"
                                                    >
                                                        {recordRides.mostElevation.name || 'Open activity'}
                                                        <ExternalLink size={11} />
                                                    </a>
                                                ) : (
                                                    <p className="mt-2 text-[10px] text-cdmuted">
                                                        {recordRides == null
                                                            ? 'Could not load activity links (API error).'
                                                            : !recordRides.historyComplete
                                                                ? `Link unavailable: history scan capped at ${fmt.int(getStravaRawActivityListFetchCap())} activities.`
                                                                : 'No ride in scanned history matched Strava record numbers.'}
                                                    </p>
                                                )}
                                                {recordRides?.elevApprox && (
                                                    <p className="text-[10px] text-yellow-500/90 mt-1">Best match: max elevation in scanned rides (± stats).</p>
                                                )}
                                            </div>
                                        )}
                                        {recordRides?.maxTotalElevationRide && (
                                            <div className="text-xs text-cdmuted rounded border border-cdborder/60 bg-cdbg/50 p-2.5">
                                                <div className="text-[10px] uppercase font-bold text-cdmuted mb-1">Most total elevation in one ride</div>
                                                <div className="text-cdtext font-bold">{fmt.elev(recordRides.maxTotalElevationM)}</div>
                                                <p className="text-[9px] text-cdmuted mt-1 leading-snug">
                                                    Highest <span className="text-cdtext">activity total elevation gain</span> in a single ride from your scanned history (same number Strava shows on that activity).
                                                </p>
                                                <a
                                                    href={`https://www.strava.com/activities/${recordRides.maxTotalElevationRide.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="mt-2 inline-flex items-center gap-1 text-orange-400 hover:text-orange-300 font-bold"
                                                >
                                                    {recordRides.maxTotalElevationRide.name || 'Open activity'}
                                                    <ExternalLink size={11} />
                                                </a>
                                                {!recordRides.historyComplete && (
                                                    <p className="text-[10px] text-yellow-500/90 mt-1">Older rides beyond the scan cap may have higher totals.</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {recordRides?.ridesScanned > 0 && (
                                        <p className="text-[10px] text-cdmuted opacity-70">
                                            Scanned {fmt.int(recordRides.ridesScanned)} bike activities for links.
                                            {!recordRides.historyComplete && ' Older rides may not be included.'}
                                        </p>
                                    )}
                                </div>
                            )}
                        </section>
                    )}
                </>
            )}

            {subTab === 'ridestats' && stats && (
                <div className="space-y-6 animate-in fade-in duration-200">
                    <section className="space-y-2">
                        <h3 className="text-xs font-bold text-cdtext uppercase tracking-wide flex items-center gap-2">
                            <TrendingUp size={13} className="text-orange-400" /> Strava API — ride totals & averages
                        </h3>
                        <StravaApiRideTable stats={stats} />
                    </section>

                    {activityScan?.periods && (
                        <section className="space-y-3">
                            <h3 className="text-xs font-bold text-cdtext uppercase tracking-wide flex items-center gap-2">
                                <Bike size={13} className="text-orange-400" /> From activity scan — outdoor / indoor / combined
                            </h3>
                            <p className="text-[10px] text-cdmuted">
                                Totals below are summed from your bike activities during the profile refresh. Outdoor = Ride, Gravel, MTB, etc.; Indoor = VirtualRide. Last 4 weeks = rolling 28 days from activity dates.
                                {activityScan.ridesScanned > 0 && (
                                    <> Scanned {fmt.int(activityScan.ridesScanned)} rides.</>
                                )}
                                {!activityScan.historyComplete && ' History may be capped — see Overview for scan note.'}
                            </p>
                            <ScanContextBlock
                                title="All-time (scanned rides)"
                                agg={activityScan.periods.all}
                                footnote="Matches Strava all-time only if your full history fits in the scan (same cap as record links)."
                            />
                            {activityScan.periods.ytd && (
                                <ScanContextBlock
                                    title="Year to date (scanned rides, local calendar)"
                                    agg={activityScan.periods.ytd}
                                />
                            )}
                            {activityScan.periods.last4w && (
                                <ScanContextBlock
                                    title="Last 4 weeks (scanned rides, rolling 28 days)"
                                    agg={activityScan.periods.last4w}
                                />
                            )}
                            {(!activityScan.periods.ytd || !activityScan.periods.last4w) && (
                                <p className="text-[10px] text-cdmuted">
                                    {!activityScan.periods.ytd && !activityScan.periods.last4w
                                        ? 'Tap Refresh once to load YTD and last-4-weeks splits from your activity history.'
                                        : 'Partial scan data — tap Refresh to reload all period splits.'}
                                </p>
                            )}
                        </section>
                    )}

                    {!activityScan && data && !isFetching && (
                        <p className="text-xs text-cdmuted border border-dashed border-cdborder rounded-lg p-4">
                            No scan data yet. Open <strong className="text-cdtext">Overview</strong> and tap <strong className="text-cdtext">Refresh</strong> to load activity-based splits.
                        </p>
                    )}
                </div>
            )}

            {subTab === 'vslog' && (
                <StravaVsLogGapPanel
                    activities={activities}
                    scannedBikeActivities={scannedBikeActivities}
                    historyComplete={rawActivityScan?.historyComplete}
                    getStravaToken={getStravaToken}
                    persistedUi={data?.vsLogUi}
                    onPersistUi={persistVsLogUi}
                    stravaAthleteId={athleteId}
                />
            )}

            {subTab === 'overview' && bikes && bikes.length > 0 && (
                <section className="space-y-2">
                    <h3 className="text-xs font-bold text-cdtext uppercase tracking-wide flex items-center gap-2">
                        <Bike size={13} className="text-orange-400" /> Bikes ({bikes.length})
                    </h3>
                    <div className="space-y-1">
                        {bikes.map(bike => (
                            <div key={bike.id} className={`flex items-center gap-3 bg-cdbg/60 border rounded-lg px-3 py-2 text-xs ${bike.retired ? 'border-cdborder/30 opacity-60' : 'border-cdborder'}`}>
                                <Bike size={13} className={bike.retired ? 'text-cdmuted shrink-0' : 'text-orange-400 shrink-0'} />
                                <span className="flex-1 font-medium text-cdtext truncate">{bike.name || <span className="text-cdmuted italic">Unnamed</span>}</span>
                                <span className="text-cdmuted shrink-0">{fmt.dist(bike.distance || 0)}</span>
                                {bike.retired && <span className="text-[10px] text-cdmuted shrink-0">Retired</span>}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {subTab === 'overview' && (koms || starred) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                    {koms && (
                        <section className="space-y-2 min-w-0 rounded-xl border border-cdborder/60 bg-cdbg/20 p-3">
                            <h3 className="text-xs font-bold text-cdtext uppercase tracking-wide flex flex-wrap items-center gap-2">
                                <span className="flex items-center gap-2">
                                    <Trophy size={13} className="text-yellow-400" /> KOM / CR
                                </span>
                                <span className="flex items-center gap-2 font-normal text-[10px] sm:text-xs">
                                    {komCount > 0 && <span className="flex items-center gap-1 text-yellow-400"><Trophy size={10} /> {komCount} KOM</span>}
                                    {crCount > 0 && <span className="flex items-center gap-1 text-purple-400"><Crown size={10} /> {crCount} CR</span>}
                                </span>
                            </h3>
                            <div className="flex flex-wrap gap-2 items-center text-[10px]">
                                <label className="text-cdmuted font-bold uppercase shrink-0">Filter</label>
                                <select
                                    value={komFilter}
                                    onChange={(e) => setKomFilter(e.target.value)}
                                    className="bg-cdbg border border-cdborder rounded px-2 py-1 text-cdtext text-[10px] max-w-[140px]"
                                >
                                    <option value="all">All segments</option>
                                    <option value="outdoor">Outdoor only</option>
                                </select>
                                <label className="text-cdmuted font-bold uppercase shrink-0 ml-1">Sort</label>
                                <select
                                    value={komSort}
                                    onChange={(e) => setKomSort(e.target.value)}
                                    className="bg-cdbg border border-cdborder rounded px-2 py-1 text-cdtext text-[10px] max-w-[160px]"
                                >
                                    <option value="default">Strava order</option>
                                    <option value="length_desc">Length (long first)</option>
                                    <option value="grade_desc">Avg grade (steep first)</option>
                                </select>
                                <span className="text-cdmuted">{filteredSortedKoms.length} shown</span>
                            </div>
                            <p className="text-[9px] text-cdmuted">Outdoor filter uses segment activity type when Strava provides it; virtual segments are hidden in &quot;Outdoor only&quot;.</p>
                            <p className="text-[9px] text-cdmuted border border-cdborder/40 rounded px-2 py-1 bg-cdbg/40">
                                Segment links open Strava in <strong className="text-cdtext">this tab</strong> to reduce API rate-limit pressure after a heavy sync. Use the browser Back button to return here.
                            </p>
                            {koms.length === 0 ? (
                                <p className="text-xs text-cdmuted italic">No KOMs or CRs in this list.</p>
                            ) : filteredSortedKoms.length === 0 ? (
                                <p className="text-xs text-cdmuted italic">No segments match this filter.</p>
                            ) : (
                                <div className="max-h-80 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                                    {filteredSortedKoms.map((effort) => {
                                        const isKOM = effort.is_kom !== false;
                                        const segId = effort.segment?.id ?? effort.segment_id;
                                        return (
                                            <div key={effort.id} className={`flex flex-wrap sm:flex-nowrap items-center gap-2 bg-cdbg/50 border rounded px-2.5 py-1.5 text-xs transition-colors ${isKOM ? 'border-cdborder/40 hover:border-yellow-400/30' : 'border-cdborder/40 hover:border-purple-400/30'}`}>
                                                {isKOM
                                                    ? <Trophy size={11} className="text-yellow-400 shrink-0" title="KOM" />
                                                    : <Crown size={11} className="text-purple-400 shrink-0" title="CR" />}
                                                <span className={`text-[9px] font-bold px-1 py-0.5 rounded shrink-0 ${isKOM ? 'bg-yellow-500/20 text-yellow-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                                    {isKOM ? 'KOM' : 'CR'}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => navigateToStravaSegment(segId)}
                                                    className="flex-1 min-w-0 font-medium text-cdtext hover:text-orange-400 truncate transition-colors text-left"
                                                    title="Open segment on Strava (this tab)"
                                                >
                                                    {effort.name}
                                                </button>
                                                <span className="text-cdmuted shrink-0 font-mono text-[10px]">{fmt.segTime(effort.elapsed_time)}</span>
                                                <span className="text-cdmuted shrink-0 text-[10px]">{effort.segment?.distance != null ? `${fmt.num(effort.segment.distance / 1000, 1)} km` : '—'}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => navigateToStravaSegment(segId)}
                                                    className="text-cdmuted hover:text-orange-400 shrink-0 p-0.5 rounded"
                                                    title="Open segment on Strava (this tab)"
                                                    aria-label="Open segment on Strava"
                                                >
                                                    <ExternalLink size={10} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    )}
                    {starred && (
                        <section className="space-y-2 min-w-0 rounded-xl border border-cdborder/60 bg-cdbg/20 p-3">
                            <h3 className="text-xs font-bold text-cdtext uppercase tracking-wide flex items-center gap-2">
                                <Star size={13} className="text-yellow-400 fill-yellow-400" /> Starred segments ({fmt.int(starred.length)})
                            </h3>
                            <div className="flex flex-wrap gap-2 items-center text-[10px]">
                                <label className="text-cdmuted font-bold uppercase shrink-0">Filter</label>
                                <select
                                    value={starredFilter}
                                    onChange={(e) => setStarredFilter(e.target.value)}
                                    className="bg-cdbg border border-cdborder rounded px-2 py-1 text-cdtext text-[10px] max-w-[140px]"
                                >
                                    <option value="all">All segments</option>
                                    <option value="outdoor">Outdoor only</option>
                                </select>
                                <label className="text-cdmuted font-bold uppercase shrink-0 ml-1">Sort</label>
                                <select
                                    value={starredSort}
                                    onChange={(e) => setStarredSort(e.target.value)}
                                    className="bg-cdbg border border-cdborder rounded px-2 py-1 text-cdtext text-[10px] max-w-[180px]"
                                >
                                    <option value="default">Strava order</option>
                                    <option value="length_desc">Length (long first)</option>
                                    <option value="grade_desc">Avg grade (steep first)</option>
                                    <option value="elev_desc">Elevation gain (high first)</option>
                                </select>
                                <span className="text-cdmuted">{filteredSortedStarred.length} shown</span>
                            </div>
                            <p className="text-[9px] text-cdmuted">Outdoor filter uses segment activity type when Strava provides it.</p>
                            <p className="text-[9px] text-cdmuted border border-cdborder/40 rounded px-2 py-1 bg-cdbg/40">
                                Opens Strava in <strong className="text-cdtext">this tab</strong>. Use Back to return here.
                            </p>
                            {starred.length === 0 ? (
                                <p className="text-xs text-cdmuted italic">No starred segments.</p>
                            ) : filteredSortedStarred.length === 0 ? (
                                <p className="text-xs text-cdmuted italic">No segments match this filter.</p>
                            ) : (
                                <div className="max-h-80 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                                    {filteredSortedStarred.map((seg) => (
                                        <div key={seg.id} className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-cdbg/50 border border-cdborder/40 rounded px-2.5 py-1.5 text-xs hover:border-yellow-400/30 transition-colors">
                                            <Star size={11} className="text-yellow-400 fill-yellow-400 shrink-0" />
                                            <button
                                                type="button"
                                                onClick={() => navigateToStravaSegment(seg.id)}
                                                className="flex-1 min-w-0 font-medium text-cdtext hover:text-orange-400 truncate transition-colors text-left"
                                                title="Open segment on Strava (this tab)"
                                            >
                                                {seg.name}
                                            </button>
                                            <span className="text-cdmuted shrink-0 text-[10px]">{fmt.num(seg.distance / 1000, 1)} km</span>
                                            <span className="text-cdmuted shrink-0 text-[10px]">{seg.average_grade != null ? `${fmt.num(seg.average_grade, 1)}%` : '—'}</span>
                                            <span className="text-cdmuted shrink-0 text-[10px]">{fmt.elev(seg.total_elevation_gain ?? 0)}</span>
                                            <button
                                                type="button"
                                                onClick={() => navigateToStravaSegment(seg.id)}
                                                className="text-cdmuted hover:text-orange-400 shrink-0 p-0.5 rounded"
                                                title="Open segment on Strava (this tab)"
                                                aria-label="Open segment on Strava"
                                            >
                                                <ExternalLink size={10} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}
                </div>
            )}

        </div>
    );
};

export default StravaProfileTab;
