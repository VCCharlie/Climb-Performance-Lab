/**
 * src/components/DataHub/StravaProfileTab.jsx
 * Toont Strava-atletenprofiel: statistieken, KOMs/CRs en starred segments.
 * Data wordt opgehaald via de Strava REST API en gepersisteerd in App.jsx.
 */
import React, { useState, useCallback } from 'react';
import { Loader2, RefreshCw, Trophy, Star, TrendingUp, Clock, Mountain, Bike, ExternalLink, AlertCircle, Crown } from 'lucide-react';

const STRAVA_BASE = 'https://www.strava.com/api/v3';

const StravaIcon = () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
);

const fmt = {
    dist: (m) => `${(m / 1000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} km`,
    elev: (m) => `${Math.round(m).toLocaleString('nl-NL')} m`,
    time: (s) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        return h > 0 ? `${h}u ${m}m` : `${m}m`;
    },
    segTime: (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${String(sec).padStart(2, '0')}`;
    },
};

const StatCard = ({ icon: Icon, iconColor, label, value, sub }) => (
    <div className="bg-cdbg/60 border border-cdborder rounded-lg p-3 flex items-start gap-3">
        <Icon size={18} className={`${iconColor} shrink-0 mt-0.5`} />
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
        if (!resp.ok) throw new Error(`Strava API fout: ${resp.status}`);
        const data = await resp.json();
        if (!Array.isArray(data) || data.length === 0) break;
        all = all.concat(data);
        if (data.length < 200) break;
        page++;
    }
    return all;
};

/**
 * @param {Function} getStravaToken - haalt een geldig access token op
 * @param {string|number} athleteId - Strava athlete ID (uit stravaConfig)
 * @param {object|null} persistedData - eerder opgehaalde data (bewaard in App.jsx)
 * @param {Function} onDataChange - callback om persistedData bij te werken
 */
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

            setFetchProgress('Statistieken ophalen...');
            const statsResp = await fetch(`${STRAVA_BASE}/athletes/${athleteId}/stats`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!statsResp.ok) throw new Error(`Stats fout: ${statsResp.status}`);
            const stats = await statsResp.json();

            setFetchProgress('KOMs / CRs ophalen...');
            const koms = await fetchPaginated(`${STRAVA_BASE}/athletes/${athleteId}/koms`, token);

            setFetchProgress('Starred segments ophalen...');
            const starred = await fetchPaginated(`${STRAVA_BASE}/segments/starred`, token);

            setFetchProgress('Fietsen ophalen...');
            const athleteResp = await fetch(`${STRAVA_BASE}/athlete`, { headers: { Authorization: `Bearer ${token}` } });
            const bikes = athleteResp.ok ? ((await athleteResp.json()).bikes || []).sort((a, b) => (b.distance || 0) - (a.distance || 0)) : [];

            applyData({ stats, koms, starred, bikes, fetchedAt: new Date().toISOString() });
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
                Koppel eerst Strava via <strong>Settings → Strava Koppeling</strong>.
            </div>
        );
    }

    const { stats, koms, starred, bikes } = data || {};
    const komCount = koms ? koms.filter(e => !e.segment?.private).length : 0;
    const crCount = koms ? koms.filter(e => !!e.segment?.private).length : 0;

    return (
        <div className="space-y-5">
            {/* Header + Ophalen */}
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs text-cdmuted">
                        Statistieken, KOMs en starred segments van jouw Strava-profiel.
                    </p>
                    {data?.fetchedAt && !isFetching && (
                        <p className="text-[10px] text-cdmuted opacity-60 mt-0.5">
                            Opgehaald: {new Date(data.fetchedAt).toLocaleString('nl-NL')}
                        </p>
                    )}
                </div>
                <button
                    onClick={fetchAll}
                    disabled={isFetching || !athleteId}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded text-sm transition-colors shrink-0"
                >
                    {isFetching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    {isFetching ? fetchProgress || 'Ophalen...' : (data ? 'Vernieuwen' : 'Ophalen van Strava')}
                </button>
            </div>

            {!athleteId && (
                <div className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded p-3 flex gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    Koppel Strava opnieuw via Settings om je athlete ID op te slaan (eenmalig).
                </div>
            )}

            {error && (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded p-3 flex gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" /> {error}
                </div>
            )}

            {/* Statistieken */}
            {stats && (
                <section className="space-y-2">
                    <h3 className="text-xs font-bold text-cdtext uppercase tracking-wide flex items-center gap-2">
                        <TrendingUp size={13} className="text-orange-400" /> All-time statistieken
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <StatCard icon={Bike} iconColor="text-orange-400" label="Ritten" value={stats.all_ride_totals?.count?.toLocaleString('nl-NL') ?? '–'} sub={`YTD: ${stats.ytd_ride_totals?.count ?? '–'}`} />
                        <StatCard icon={TrendingUp} iconColor="text-blue-400" label="Afstand" value={fmt.dist(stats.all_ride_totals?.distance ?? 0)} sub={`YTD: ${fmt.dist(stats.ytd_ride_totals?.distance ?? 0)}`} />
                        <StatCard icon={Mountain} iconColor="text-green-400" label="Hoogte" value={fmt.elev(stats.all_ride_totals?.elevation_gain ?? 0)} sub={`YTD: ${fmt.elev(stats.ytd_ride_totals?.elevation_gain ?? 0)}`} />
                        <StatCard icon={Clock} iconColor="text-purple-400" label="Tijd" value={fmt.time(stats.all_ride_totals?.moving_time ?? 0)} sub={`YTD: ${fmt.time(stats.ytd_ride_totals?.moving_time ?? 0)}`} />
                    </div>
                    {stats.biggest_climb_elevation_gain > 0 && (
                        <div className="text-xs text-cdmuted bg-cdbg/40 border border-cdborder rounded p-2">
                            🏔 Grootste klim ooit: <span className="text-cdtext font-bold">{fmt.elev(stats.biggest_climb_elevation_gain)}</span> hoogteverschil
                            {stats.biggest_ride_distance > 0 && <> &nbsp;·&nbsp; Langste rit: <span className="text-cdtext font-bold">{fmt.dist(stats.biggest_ride_distance)}</span></>}
                        </div>
                    )}
                </section>
            )}

            {/* Fietsen */}
            {bikes && bikes.length > 0 && (
                <section className="space-y-2">
                    <h3 className="text-xs font-bold text-cdtext uppercase tracking-wide flex items-center gap-2">
                        <Bike size={13} className="text-orange-400" /> Fietsen ({bikes.length})
                    </h3>
                    <div className="space-y-1">
                        {bikes.map(bike => (
                            <div key={bike.id} className={`flex items-center gap-3 bg-cdbg/60 border rounded-lg px-3 py-2 text-xs ${bike.retired ? 'border-cdborder/30 opacity-60' : 'border-cdborder'}`}>
                                <Bike size={13} className={bike.retired ? 'text-cdmuted shrink-0' : 'text-orange-400 shrink-0'} />
                                <span className="flex-1 font-medium text-cdtext truncate">{bike.name}</span>
                                <span className="text-cdmuted shrink-0">{fmt.dist(bike.distance || 0)}</span>
                                {bike.retired && <span className="text-[10px] text-cdmuted shrink-0">gepensioneerd</span>}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* KOMs / CRs */}
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
                        <p className="text-xs text-cdmuted italic">Geen KOMs gevonden.</p>
                    ) : (
                        <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                            {koms.map((effort) => {
                                const isKOM = !effort.segment?.private;
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
                                        <span className="text-cdmuted shrink-0">{(effort.segment?.distance / 1000).toFixed(1)} km</span>
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

            {/* Starred Segments */}
            {starred && (
                <section className="space-y-2">
                    <h3 className="text-xs font-bold text-cdtext uppercase tracking-wide flex items-center gap-2">
                        <Star size={13} className="text-yellow-400 fill-yellow-400" /> Starred segments ({starred.length})
                    </h3>
                    {starred.length === 0 ? (
                        <p className="text-xs text-cdmuted italic">Geen starred segments gevonden.</p>
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
                                    <span className="text-cdmuted shrink-0">{seg.average_grade?.toFixed(1)}%</span>
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

            {!data && !isFetching && !error && (
                <div className="flex flex-col items-center justify-center py-12 text-cdmuted gap-3">
                    <StravaIcon />
                    <p className="text-sm">Klik "Ophalen van Strava" om je profiel te laden.</p>
                </div>
            )}
        </div>
    );
};

export default StravaProfileTab;
