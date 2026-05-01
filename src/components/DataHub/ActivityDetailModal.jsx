import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Zap, ExternalLink, Mountain, TrendingUp, Loader2, AlertCircle, Star, Bike, Trophy, Crown } from 'lucide-react';
import { formatDateDDMMYYYY, formatTime } from '../../utils';
import StravaMap from './StravaMap';
import { formatSegmentTime } from '../../utils/strava';

// Strava logo SVG
const StravaIcon = ({ size = 14 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
);

const StatBox = ({ label, value, unit, icon, color = "text-cdmuted" }) => (
    <div className="bg-cdbg/50 p-3 rounded-lg border border-cdborder/50 flex flex-col items-center justify-center relative overflow-hidden group">
        <div className={`absolute top-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
            {React.createElement(icon, { size: 32 })}
        </div>
        <span className="text-[10px] uppercase font-bold text-cdmuted mb-1">{label}</span>
        <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-cdtext">{value || '-'}</span>
            <span className="text-xs text-cdmuted">{unit}</span>
        </div>
    </div>
);

const ActivityDetailModal = ({ activity, onClose, getStravaToken }) => {
    const [stravaData, setStravaData] = useState(null);
    const [stravaLoading, setStravaLoading] = useState(false);
    const [stravaError, setStravaError] = useState(null);

    useEffect(() => {
        if (!activity?.strava_id || !getStravaToken) return;

        let cancelled = false;
        queueMicrotask(() => {
            if (cancelled) return;
            setStravaLoading(true);
            setStravaError(null);
            getStravaToken()
                .then(token =>
                    fetch(`https://www.strava.com/api/v3/activities/${activity.strava_id}?include_all_efforts=true`, {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                )
                .then(r => {
                    if (!r.ok) throw new Error(`Strava API error: ${r.status}`);
                    return r.json();
                })
                .then(data => {
                    if (!cancelled) setStravaData(data);
                })
                .catch(e => {
                    if (!cancelled) setStravaError(e.message);
                })
                .finally(() => {
                    if (!cancelled) setStravaLoading(false);
                });
        });
        return () => { cancelled = true; };
    }, [activity?.strava_id, getStravaToken]);

    if (!activity) return null;

    const polyline = stravaData?.map?.summary_polyline;
    const segments = stravaData?.segment_efforts || [];

    const powerCurve = [
        { label: '1m', val: activity.best_1min },
        { label: '5m', val: activity.best_5min },
        { label: '10m', val: activity.best_10min },
        { label: '20m', val: activity.best_20min },
        { label: '60m', val: activity.best_60min },
    ].filter(p => p.val > 0);

    return (
        <div className="fixed inset-0 bg-cdbg/95 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-cdsurface border border-cdborder rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden relative">

                {/* Header */}
                <div className="flex-shrink-0 p-4 border-b border-cdborder bg-cdbg flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-cdborder text-cdtext text-[10px] font-bold px-2 py-0.5 rounded uppercase">{activity.type}</span>
                            <span className="text-cdmuted text-xs flex items-center gap-1"><Calendar size={12} /> {formatDateDDMMYYYY(activity.date)}</span>
                        </div>
                        <h2 className="text-xl font-bold text-cdtext">{activity.title}</h2>
                        <div className="flex items-center gap-4 mt-2 flex-wrap">
                            {activity.id && !String(activity.id).startsWith('csv_') && (
                                <a href={`https://intervals.icu/activities/${activity.id}`} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                                    Intervals.icu <ExternalLink size={10} />
                                </a>
                            )}
                            {activity.strava_id && (
                                <a href={`https://www.strava.com/activities/${activity.strava_id}`} target="_blank" rel="noreferrer" className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1">
                                    <StravaIcon size={12} /> Strava <ExternalLink size={10} />
                                </a>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-cdsurface rounded-full text-cdmuted hover:text-cdtext focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none"
                        aria-label="Close modal"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">

                    {/* Primary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <StatBox label="Time" value={formatTime(activity.moving_time)} unit="" icon={Clock} color="text-blue-500" />
                        <StatBox label="Distance" value={Number(activity.distance).toFixed(1)} unit="km" icon={MapPin} color="text-green-500" />
                        <StatBox label="Elevation" value={activity.climbing} unit="m" icon={Mountain} color="text-yellow-500" />
                        <StatBox label="Load" value={activity.load} unit="TSS" icon={TrendingUp} color="text-purple-500" />
                    </div>

                    {/* Gear */}
                    {activity.gear_name && (
                        <div className="flex items-center gap-2 text-xs text-cdmuted bg-cdbg/50 border border-cdborder rounded px-3 py-2">
                            <Bike size={13} className="text-orange-400 shrink-0" />
                            <span>Ridden on: <span className="text-cdtext font-medium">{activity.gear_name}</span></span>
                        </div>
                    )}

                    {/* Power Stats */}
                    {(activity.avg_power > 0 || activity.norm_power > 0) && (
                        <div>
                            <h3 className="text-xs uppercase font-bold text-cdmuted mb-3 flex items-center gap-2"><Zap size={14} className="text-yellow-400" /> Power Metrics</h3>
                            <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mb-4">
                                <div className="bg-cdborder/30 p-2 rounded text-center">
                                    <div className="text-xs text-cdmuted">Avg</div>
                                    <div className="font-bold text-cdtext">{activity.avg_power}w</div>
                                </div>
                                <div className="bg-cdborder/30 p-2 rounded text-center border-l-2 border-yellow-400">
                                    <div className="text-xs text-cdmuted">NP®</div>
                                    <div className="font-bold text-yellow-400">{activity.norm_power}w</div>
                                </div>
                                <div className="bg-cdborder/30 p-2 rounded text-center">
                                    <div className="text-xs text-cdmuted">Intensity</div>
                                    <div className="font-bold text-cdtext">{activity.ftp > 0 ? (activity.norm_power / activity.ftp).toFixed(2) : '-'}</div>
                                </div>
                                <div className="bg-cdborder/30 p-2 rounded text-center">
                                    <div className="text-xs text-cdmuted">Work</div>
                                    <div className="font-bold text-cdtext">{Math.round((activity.avg_power * activity.moving_time) / 1000)}kJ</div>
                                </div>
                            </div>

                            {/* Power Curve */}
                            {powerCurve.length > 0 && (
                                <div className="bg-cdbg/50 rounded-lg p-3 border border-cdborder/50">
                                    <div className="text-[10px] text-cdmuted mb-2 uppercase font-bold text-center">Peak Power Curve</div>
                                    <div className="flex justify-between items-end h-28 gap-2 px-2">
                                        {powerCurve.map((p, idx) => {
                                            const maxVal = Math.max(...powerCurve.map(i => i.val));
                                            const heightPct = (p.val / maxVal) * 100;
                                            return (
                                                <div key={idx} className="flex-1 flex flex-col h-full justify-end items-center group relative">
                                                    <div className="absolute top-0 w-full text-center">
                                                        <span className="text-[10px] font-bold text-cdtext opacity-0 group-hover:opacity-100 transition-opacity bg-cdsurface px-1 rounded border border-cdborder shadow-sm z-10">{p.val}w</span>
                                                    </div>
                                                    <div className="flex-1 w-full flex items-end">
                                                        <div className="w-full bg-yellow-500/20 group-hover:bg-yellow-500/40 rounded-t transition-all" style={{ height: `${heightPct}%` }}>
                                                            <div className="absolute top-0 w-full h-0.5 bg-yellow-400/50"></div>
                                                        </div>
                                                    </div>
                                                    <div className="text-[10px] text-cdmuted mt-1 h-4 flex items-center">{p.label}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Strava Sectie: kaart + segmenten */}
                    {activity.strava_id && (
                        <div>
                            <h3 className="text-xs uppercase font-bold text-cdmuted mb-3 flex items-center gap-2">
                                <span className="text-orange-400"><StravaIcon size={14} /></span>
                                Strava Data
                            </h3>

                            {stravaLoading && (
                                <div className="flex items-center gap-2 text-cdmuted text-xs py-4">
                                    <Loader2 size={16} className="animate-spin text-orange-400" />
                                    Loading Strava data…
                                </div>
                            )}

                            {stravaError && (
                                <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                    <span>{stravaError}</span>
                                </div>
                            )}

                            {!stravaLoading && !stravaError && stravaData && (
                                <div className="space-y-4">
                                    {/* Kaart */}
                                    {polyline && (
                                        <div>
                                            <div className="text-[10px] text-cdmuted uppercase font-bold mb-2">Route</div>
                                            <StravaMap polyline={polyline} />
                                        </div>
                                    )}

                                    {/* Segmenten */}
                                    {segments.length > 0 && (
                                        <div>
                                            <div className="text-[10px] text-cdmuted uppercase font-bold mb-2">
                                                Segments ({segments.length})
                                            </div>
                                            <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                                                {segments.map((seg, i) => (
                                                    <div key={i} className="flex items-center gap-2 bg-cdbg/50 rounded px-3 py-2 border border-cdborder/30 text-xs">
                                                        <div className="flex-1 truncate flex items-center gap-1">
                                                            {seg.segment?.starred && (
                                                                <Star size={11} className="text-yellow-400 fill-yellow-400 shrink-0" />
                                                            )}
                                                            <a
                                                                href={`https://www.strava.com/segments/${seg.segment?.id}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-cdtext hover:text-orange-400 font-medium transition-colors truncate"
                                                                onClick={e => e.stopPropagation()}
                                                            >
                                                                {seg.name}
                                                            </a>
                                                        </div>
                                                        <span className="text-cdmuted font-mono shrink-0">{formatSegmentTime(seg.elapsed_time)}</span>
                                                        {seg.average_watts > 0 && (
                                                            <span className="text-yellow-400 font-bold shrink-0">{Math.round(seg.average_watts)}w</span>
                                                        )}
                                                        {seg.pr_rank === 1 && (
                                                            <span className="text-xs bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded font-bold shrink-0">PR</span>
                                                        )}
                                                        {seg.kom_rank === 1 && (
                                                            <span className="inline-flex shrink-0" title="Overall #1 on segment">
                                                                <Crown size={14} className="text-amber-400" fill="currentColor" strokeWidth={1.25} aria-hidden />
                                                            </span>
                                                        )}
                                                        {seg.kom_rank && seg.kom_rank >= 2 && seg.kom_rank <= 10 && (
                                                            <span
                                                                className="relative inline-flex h-[22px] w-[20px] shrink-0 items-end justify-center pb-0.5"
                                                                title={`#${seg.kom_rank} on segment leaderboard`}
                                                            >
                                                                <Trophy
                                                                    size={18}
                                                                    className="absolute bottom-0 left-1/2 -translate-x-1/2 text-amber-400/90 pointer-events-none"
                                                                    strokeWidth={2}
                                                                    aria-hidden
                                                                />
                                                                <span className="relative z-[1] min-w-[15px] translate-y-px rounded px-[2px] py-[1px] text-center text-[8px] font-black tabular-nums leading-none text-cdtext bg-cdsurface/95 border border-cdborder/60 shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
                                                                    {seg.kom_rank}
                                                                </span>
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Geen Strava connectie */}
                            {!stravaLoading && !stravaError && !stravaData && !getStravaToken && (
                                <div className="text-xs text-cdmuted bg-cdbg/50 rounded-lg p-3 border border-cdborder/30">
                                    Connect Strava in Settings to see the map and segments.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActivityDetailModal;
