/**
 * Strava athlete profile: summary, recent activity, bikes, KOMs/CRs, starred segments.
 * Data from Strava REST API; persisted via App.jsx.
 */
import React, { useState, useCallback } from 'react';
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
import { fetchAllBikeActivitiesForRecords, matchRecordActivities } from '../../utils/stravaProfileRecords';

const STRAVA_BASE = 'https://www.strava.com/api/v3';
const LOCALE = 'en-US';

const fmt = {
    dist: (m) => `${(m / 1000).toFixed(1)} km`,
    elev: (m) => `${Math.round(m).toLocaleString(LOCALE)} m`,
    time: (s) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    },
    segTime: (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${String(sec).padStart(2, '0')}`;
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
        if (!resp.ok) throw new Error(`Strava API error: ${resp.status}`);
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

const StravaProfileTab = ({ getStravaToken, athleteId, persistedData, onDataChange }) => {
    const [isFetching, setIsFetching] = useState(false);
    const [fetchProgress, setFetchProgress] = useState('');
    const [error, setError] = useState(null);
    const [data, setData] = useState(persistedData ?? null);

    const applyData = useCallback((d) => {
        setData(d);
        onDataChange?.(d);
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
            if (!statsResp.ok) throw new Error(`Stats error: ${statsResp.status}`);
            const stats = await statsResp.json();

            setFetchProgress('Loading KOMs / CRs…');
            const koms = await fetchPaginated(`${STRAVA_BASE}/athletes/${athleteId}/koms`, token);

            setFetchProgress('Loading starred segments…');
            const starred = await fetchPaginated(`${STRAVA_BASE}/segments/starred`, token);

            setFetchProgress('Loading bikes…');
            const bikes = (athlete?.bikes || []).sort((a, b) => (b.distance || 0) - (a.distance || 0));

            setFetchProgress('Linking record rides…');
            let recordRides = null;
            try {
                const { activities: scanned, historyComplete } = await fetchAllBikeActivitiesForRecords(
                    token,
                    (msg) => setFetchProgress(msg)
                );
                recordRides = matchRecordActivities(scanned, stats, { historyComplete });
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
                fetchedAt: new Date().toISOString()
            });
        } catch (e) {
            setError(e.message);
        } finally {
            setIsFetching(false);
            setFetchProgress('');
        }
    }, [getStravaToken, athleteId, applyData]);

    if (!getStravaToken) {
        return (
            <div className="text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                Connect Strava first under <strong>Settings → Strava connection</strong>.
            </div>
        );
    }

    const { athlete, stats, koms, starred, bikes, recordRides } = data || {};
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
                                    rel="noreferrer"
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
                        {data?.fetchedAt && !isFetching && (
                            <p className="text-[10px] text-cdmuted opacity-60 mt-0.5">
                                Last updated: {new Date(data.fetchedAt).toLocaleString(LOCALE)}
                            </p>
                        )}
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

            {!athleteId && (
                <div className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded p-3 flex gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    Reconnect Strava in Settings once so your athlete ID is saved.
                </div>
            )}

            {error && (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded p-3 flex gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" /> {error}
                </div>
            )}

            {recent && (recent.count > 0 || recent.distance > 0) && (
                <section className="space-y-2">
                    <h3 className="text-xs font-bold text-cdtext uppercase tracking-wide flex items-center gap-2">
                        <Activity size={13} className="text-orange-400" /> Last 4 weeks (rides)
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <StatCard icon={Bike} iconColor="text-orange-400" label="Activities" value={recent.count?.toLocaleString(LOCALE) ?? '–'} />
                        <StatCard icon={TrendingUp} iconColor="text-blue-400" label="Distance" value={fmt.dist(recent.distance ?? 0)} />
                        <StatCard icon={Mountain} iconColor="text-green-400" label="Elevation" value={fmt.elev(recent.elevation_gain ?? 0)} />
                        <StatCard icon={Clock} iconColor="text-purple-400" label="Moving time" value={fmt.time(recent.moving_time ?? 0)} />
                    </div>
                </section>
            )}

            {stats && (
                <section className="space-y-2">
                    <h3 className="text-xs font-bold text-cdtext uppercase tracking-wide flex items-center gap-2">
                        <TrendingUp size={13} className="text-orange-400" /> All-time ride totals
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <StatCard icon={Bike} iconColor="text-orange-400" label="Rides" value={stats.all_ride_totals?.count?.toLocaleString(LOCALE) ?? '–'} sub={`YTD: ${stats.ytd_ride_totals?.count ?? '–'}`} />
                        <StatCard icon={TrendingUp} iconColor="text-blue-400" label="Distance" value={fmt.dist(stats.all_ride_totals?.distance ?? 0)} sub={`YTD: ${fmt.dist(stats.ytd_ride_totals?.distance ?? 0)}`} />
                        <StatCard icon={Mountain} iconColor="text-green-400" label="Elevation" value={fmt.elev(stats.all_ride_totals?.elevation_gain ?? 0)} sub={`YTD: ${fmt.elev(stats.ytd_ride_totals?.elevation_gain ?? 0)}`} />
                        <StatCard icon={Clock} iconColor="text-purple-400" label="Moving time" value={fmt.time(stats.all_ride_totals?.moving_time ?? 0)} sub={`YTD: ${fmt.time(stats.ytd_ride_totals?.moving_time ?? 0)}`} />
                    </div>
                    {(stats.biggest_climb_elevation_gain > 0 || stats.biggest_ride_distance > 0) && (
                        <div className="bg-cdbg/40 border border-cdborder rounded-lg p-3 space-y-3">
                            <h4 className="text-[10px] font-bold text-cdmuted uppercase tracking-wide flex items-center gap-2">
                                <Route size={12} className="text-orange-400" /> Personal records (Strava)
                            </h4>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {stats.biggest_ride_distance > 0 && (
                                    <div className="text-xs text-cdmuted rounded border border-cdborder/60 bg-cdbg/50 p-2.5">
                                        <div className="text-[10px] uppercase font-bold text-cdmuted mb-1">Longest ride</div>
                                        <div className="text-cdtext font-bold">{fmt.dist(stats.biggest_ride_distance)}</div>
                                        {recordRides?.longestRide ? (
                                            <a
                                                href={`https://www.strava.com/activities/${recordRides.longestRide.id}`}
                                                target="_blank"
                                                rel="noreferrer"
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
                                                        ? 'Link unavailable: history scan capped at 20k activities.'
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
                                        <div className="text-[10px] uppercase font-bold text-cdmuted mb-1">Most elevation (single ride)</div>
                                        <div className="text-cdtext font-bold">{fmt.elev(stats.biggest_climb_elevation_gain)}</div>
                                        {recordRides?.mostElevation ? (
                                            <a
                                                href={`https://www.strava.com/activities/${recordRides.mostElevation.id}`}
                                                target="_blank"
                                                rel="noreferrer"
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
                                                        ? 'Link unavailable: history scan capped at 20k activities.'
                                                        : 'No ride in scanned history matched Strava record numbers.'}
                                            </p>
                                        )}
                                        {recordRides?.elevApprox && (
                                            <p className="text-[10px] text-yellow-500/90 mt-1">Best match: max elevation in scanned rides (± stats).</p>
                                        )}
                                    </div>
                                )}
                            </div>
                            {recordRides?.ridesScanned > 0 && (
                                <p className="text-[10px] text-cdmuted opacity-70">
                                    Scanned {recordRides.ridesScanned.toLocaleString(LOCALE)} bike activities for links.
                                    {!recordRides.historyComplete && ' Older rides may not be included.'}
                                </p>
                            )}
                        </div>
                    )}
                </section>
            )}

            {bikes && bikes.length > 0 && (
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

            {koms && (
                <section className="space-y-2">
                    <h3 className="text-xs font-bold text-cdtext uppercase tracking-wide flex items-center gap-2">
                        <Trophy size={13} className="text-yellow-400" /> KOM / CR
                        <span className="ml-auto flex items-center gap-2 font-normal">
                            {komCount > 0 && <span className="flex items-center gap-1 text-yellow-400"><Trophy size={10} /> {komCount} KOM</span>}
                            {crCount > 0 && <span className="flex items-center gap-1 text-purple-400"><Crown size={10} /> {crCount} CR</span>}
                        </span>
                    </h3>
                    {koms.length === 0 ? (
                        <p className="text-xs text-cdmuted italic">No KOMs or CRs in this list.</p>
                    ) : (
                        <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                            {koms.map((effort) => {
                                const isKOM = effort.is_kom !== false;
                                return (
                                    <div key={effort.id} className={`flex items-center gap-3 bg-cdbg/50 border rounded px-3 py-1.5 text-xs transition-colors ${isKOM ? 'border-cdborder/40 hover:border-yellow-400/30' : 'border-cdborder/40 hover:border-purple-400/30'}`}>
                                        {isKOM
                                            ? <Trophy size={11} className="text-yellow-400 shrink-0" title="KOM" />
                                            : <Crown size={11} className="text-purple-400 shrink-0" title="CR" />}
                                        <span className={`text-[9px] font-bold px-1 py-0.5 rounded shrink-0 ${isKOM ? 'bg-yellow-500/20 text-yellow-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                            {isKOM ? 'KOM' : 'CR'}
                                        </span>
                                        <a
                                            href={`https://www.strava.com/segments/${effort.segment?.id}`}
                                            target="_blank" rel="noreferrer"
                                            className="flex-1 font-medium text-cdtext hover:text-orange-400 truncate transition-colors"
                                        >
                                            {effort.name}
                                        </a>
                                        <span className="text-cdmuted shrink-0">{fmt.segTime(effort.elapsed_time)}</span>
                                        <span className="text-cdmuted shrink-0">{effort.segment?.distance != null ? `${(effort.segment.distance / 1000).toFixed(1)} km` : '—'}</span>
                                        <a href={`https://www.strava.com/segments/${effort.segment?.id}`} target="_blank" rel="noreferrer" className="text-cdmuted hover:text-orange-400 shrink-0">
                                            <ExternalLink size={10} />
                                        </a>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            )}

            {starred && (
                <section className="space-y-2">
                    <h3 className="text-xs font-bold text-cdtext uppercase tracking-wide flex items-center gap-2">
                        <Star size={13} className="text-yellow-400 fill-yellow-400" /> Starred segments ({starred.length})
                    </h3>
                    {starred.length === 0 ? (
                        <p className="text-xs text-cdmuted italic">No starred segments.</p>
                    ) : (
                        <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                            {starred.map((seg) => (
                                <div key={seg.id} className="flex items-center gap-3 bg-cdbg/50 border border-cdborder/40 rounded px-3 py-1.5 text-xs hover:border-yellow-400/30 transition-colors">
                                    <Star size={11} className="text-yellow-400 fill-yellow-400 shrink-0" />
                                    <a
                                        href={`https://www.strava.com/segments/${seg.id}`}
                                        target="_blank" rel="noreferrer"
                                        className="flex-1 font-medium text-cdtext hover:text-orange-400 truncate transition-colors"
                                    >
                                        {seg.name}
                                    </a>
                                    <span className="text-cdmuted shrink-0">{(seg.distance / 1000).toFixed(1)} km</span>
                                    <span className="text-cdmuted shrink-0">{seg.average_grade != null ? `${seg.average_grade.toFixed(1)}%` : '—'}</span>
                                    <span className="text-cdmuted shrink-0">{fmt.elev(seg.total_elevation_gain ?? 0)}</span>
                                    <a href={`https://www.strava.com/segments/${seg.id}`} target="_blank" rel="noreferrer" className="text-cdmuted hover:text-orange-400 shrink-0">
                                        <ExternalLink size={10} />
                                    </a>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}

        </div>
    );
};

export default StravaProfileTab;
