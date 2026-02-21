import React from 'react';
import { X, Calendar, Clock, Activity, MapPin, Zap, ExternalLink, Mountain, TrendingUp } from 'lucide-react';
import { formatDateDDMMYYYY, formatTime } from '../../utils';

// Helper to render a stat box
const StatBox = ({ label, value, unit, icon: Icon, color = "text-cdmuted" }) => (
    <div className="bg-cdbg/50 p-3 rounded-lg border border-cdborder/50 flex flex-col items-center justify-center relative overflow-hidden group">
        <div className={`absolute top-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
            <Icon size={32} />
        </div>
        <span className="text-[10px] uppercase font-bold text-cdmuted mb-1">{label}</span>
        <div className="flex items-baseline gap-1">
            <span className={`text-xl font-bold text-cdtext`}>{value || '-'}</span>
            <span className="text-xs text-cdmuted">{unit}</span>
        </div>
    </div>
);

const ActivityDetailModal = ({ activity, onClose }) => {
    if (!activity) return null;

    const hasMapData = activity.map && (activity.map.summary_polyline || activity.map.polyline);

    // Config for Power Curve
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
                        <div className="flex items-center gap-4 mt-2">
                            {activity.id && !String(activity.id).startsWith('csv_') && (
                                <a href={`https://intervals.icu/activities/${activity.id}`} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                                    View on Intervals.icu <ExternalLink size={10} />
                                </a>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-cdsurface rounded-full text-cdmuted hover:text-cdtext"><X size={20} /></button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">

                    {/* Primary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                        <StatBox label="Time" value={formatTime(activity.moving_time)} unit="" icon={Clock} color="text-blue-500" />
                        <StatBox label="Distance" value={Number(activity.distance).toFixed(1)} unit="km" icon={MapPin} color="text-green-500" />
                        <StatBox label="Elevation" value={activity.climbing} unit="m" icon={Mountain} color="text-yellow-500" />
                        <StatBox label="Load" value={activity.load} unit="TSS" icon={TrendingUp} color="text-purple-500" />
                    </div>

                    {/* Power Stats */}
                    {(activity.avg_power > 0 || activity.norm_power > 0) && (
                        <div className="mb-6">
                            <h3 className="text-xs uppercase font-bold text-cdmuted mb-3 flex items-center gap-2"><Zap size={14} className="text-yellow-400" /> Power Metrics</h3>
                            <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mb-4">
                                <div className="bg-cdborder/30 p-2 rounded text-center">
                                    <div className="text-xs text-cdmuted">Avg</div>
                                    <div className="font-bold text-cdtext">{activity.avg_power}w</div>
                                </div>
                                <div className="bg-cdborder/30 p-2 rounded text-center border-l-2 border-yellow-400">
                                    <div className="text-xs text-cdmuted">NPÂ®</div>
                                    <div className="font-bold text-yellow-400">{activity.norm_power}w</div>
                                </div>
                                <div className="bg-cdborder/30 p-2 rounded text-center">
                                    <div className="text-xs text-cdmuted">Intensity</div>
                                    <div className="font-bold text-cdtext">{activity.ftp > 0 ? (activity.norm_power / activity.ftp).toFixed(2) : '-'}</div>
                                </div>
                                <div className="bg-cdborder/30 p-2 rounded text-center">
                                    <div className="text-xs text-cdmuted">Work</div>
                                    <div className="font-bold text-cdtext">{activity.kj ? Math.round(activity.kj) : Math.round((activity.avg_power * activity.moving_time) / 1000)}kJ</div>
                                </div>
                            </div>

                            {/* Power Curve */}
                            {powerCurve.length > 0 && (
                                <div className="bg-cdbg/50 rounded-lg p-3 border border-cdborder/50">
                                    <div className="text-[10px] text-cdmuted mb-2 uppercase font-bold text-center">Peak Power Curve</div>
                                    <div className="flex justify-between items-end h-32 gap-2 px-2">
                                        {powerCurve.map((p, idx) => {
                                            const maxVal = Math.max(...powerCurve.map(i => i.val));
                                            const heightPct = (p.val / maxVal) * 100;
                                            return (
                                                <div key={idx} className="flex-1 flex flex-col h-full justify-end items-center group relative">
                                                    {/* Tooltip positioned absolutely above the chart area */}
                                                    <div className="absolute top-0 w-full text-center">
                                                        <span className="text-[10px] font-bold text-cdtext opacity-0 group-hover:opacity-100 transition-opacity bg-cdsurface px-1 rounded border border-cdborder shadow-sm z-10">{p.val}w</span>
                                                    </div>

                                                    {/* Chart Area: Flex-1 fills available space. Items-end aligns bar to bottom. */}
                                                    <div className="flex-1 w-full flex items-end">
                                                        <div className="w-full bg-yellow-500/20 group-hover:bg-yellow-500/40 rounded-t relative transition-all" style={{ height: `${heightPct}%` }}>
                                                            <div className="absolute top-0 w-full h-0.5 bg-yellow-400/50"></div>
                                                        </div>
                                                    </div>

                                                    {/* Label */}
                                                    <div className="text-[10px] text-cdmuted mt-1 h-4 flex items-center">{p.label}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Map Placeholder - ONLY RENDER IF DATA EXISTS */}
                    {hasMapData && (
                        <div>
                            <h3 className="text-xs uppercase font-bold text-cdmuted mb-3 flex items-center gap-2"><MapPin size={14} className="text-green-400" /> Map</h3>
                            <div className="h-48 bg-cdbg rounded-lg border border-cdborder flex items-center justify-center relative overflow-hidden">
                                {/* Since we don't have Leaflet yet, we show a clean message or could try a static image API if key available. 
                                      For now, just a placeholder that acknowledges data exists but renderer is missing. */}
                                <div className="text-center">
                                    <MapPin size={32} className="mx-auto text-slate-600 mb-2" />
                                    <p className="text-xs text-cdmuted">Map Data Available (Polyline)</p>
                                    <p className="text-[10px] text-slate-600">Renderer not yet implemented</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActivityDetailModal;
