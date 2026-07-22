import React from 'react';
import { Monitor, Footprints, Mountain, Bike, Trash2, ExternalLink } from 'lucide-react';
import { formatDateDDMMYYYY, formatTime } from '../../utils';
import { ACTIVITY_TABLE_COLUMNS } from '../../config';
import NormPowerCell from '../data-hub/NormPowerCell';
import ZoneMetricCell from '../data-hub/ZoneMetricCell';

const ActivityRow = ({ act, onDelete, deleteConfirm, setDeleteConfirm, isPreview = false, isSelected = false, onToggleSelect, onToggleType, onViewDetail, profileFtp, profileMaxHr }) => {
    if (!act) return null;

    const renderCell = (col) => {
        try {
            if (col.key === 'intensity_factor') {
                return (
                    <ZoneMetricCell
                        metric="if"
                        normPower={act.norm_power}
                        profileFtp={profileFtp}
                    />
                );
            }

            const val = act[col.key];
            if (val === null || val === undefined) return <span className="text-slate-600">-</span>;

            switch (col.key) {
                case 'data_source': return <span className="text-cdmuted text-center block">—</span>;
                case 'date': return <span className="text-cdtext whitespace-nowrap">{formatDateDDMMYYYY(val)}</span>;
                case 'type': return (
                    <div
                        className={`flex justify-center items-center h-full ${isPreview ? 'cursor-pointer hover:text-yellow-400' : ''}`}
                        onClick={(e) => { if (isPreview && onToggleType) { e.stopPropagation(); onToggleType(act.id); } }}
                        title={isPreview ? `Current: ${val}. Click to change.` : val}
                    >
                        {val === 'VirtualRide' ? <Monitor size={16} className="text-orange-400" title="Virtual Ride" /> :
                            val === 'Run' ? <Footprints size={16} className="text-blue-400" title="Run" /> :
                                val === 'Walk' ? <Footprints size={16} className="text-green-300" title="Walk" /> :
                                    val === 'Hike' ? <Mountain size={16} className="text-green-500" title="Hike" /> :
                                        <Bike size={16} className="text-green-400" title="Ride" />}
                    </div>
                );
                case 'title': return (
                    <div className="flex items-center gap-2 group/title focus-within:opacity-100">
                        {!isPreview && onViewDetail && val ? (
                            <button
                                type="button"
                                className="font-medium text-cdtext block max-w-[200px] truncate text-left hover:text-cdaccent hover:underline focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none rounded-sm"
                                title={`${val} — click for details`}
                                onClick={(e) => { e.stopPropagation(); onViewDetail(act); }}
                            >
                                {val}
                            </button>
                        ) : (
                            <span className="font-medium text-cdtext block max-w-[200px] truncate" title={val}>{val}</span>
                        )}
                        {act.id && !String(act.id).startsWith('csv_') && (
                            <a
                                href={`https://intervals.icu/activities/${act.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cdmuted hover:text-blue-400 opacity-0 group-hover:opacity-100 group-focus-within/title:opacity-100 focus-visible:opacity-100 transition-opacity focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none rounded-sm p-0.5"
                                onClick={e => e.stopPropagation()}
                                title="Open in Intervals.icu"
                                aria-label="Open in Intervals.icu"
                            >
                                <ExternalLink size={12} />
                            </a>
                        )}
                    </div>
                );
                case 'gear_name': {
                    const gid = act.gear_id != null ? String(act.gear_id) : '';
                    if (val && typeof val === 'string') {
                        return (
                            <span className="flex items-center gap-1 text-orange-400/80" title={gid ? `${val} (${gid})` : val}>
                                <span className="truncate max-w-[100px] text-xs">{val}</span>
                            </span>
                        );
                    }
                    if (gid) {
                        return (
                            <span className="font-mono text-[10px] text-cdmuted truncate max-w-[100px] block" title={`Strava gear_id: ${gid}`}>
                                {gid.length > 14 ? `${gid.slice(0, 12)}…` : gid}
                            </span>
                        );
                    }
                    return <span className="text-cdmuted">-</span>;
                }
                case 'moving_time': return <span className="text-cdmuted font-mono">{formatTime(val)}</span>;
                case 'distance': case 'avg_speed': return <span className="text-cdmuted">{Number(val).toFixed(1)}</span>;
                case 'climbing': return <span className="text-cdmuted">{Math.round(val || 0)}</span>;
                case 'avg_power': return <ZoneMetricCell metric="power" value={val} profileFtp={profileFtp} />;
                case 'avg_hr':
                case 'max_hr': return <ZoneMetricCell metric="hr" value={val} profileMaxHr={profileMaxHr} />;
                case 'norm_power': return <NormPowerCell watts={val} profileFtp={profileFtp} />;
                case 'load': return <span className="font-bold text-blue-400">{Math.round(val || 0)}</span>;
                case 'rpe': return <span className="text-cdmuted">{val || '-'}</span>;
                default: return <span className={`text-${col.text || 'slate-500'}`}>{val ? Math.round(val) : '-'}</span>;
            }
        } catch (e) {
            console.error("Error rendering cell", col.key, e);
            return <span className="text-red-500 text-xs">Err</span>;
        }
    };

    return (
        <tr className={`group hover:bg-cdborder/50 transition-colors border-b border-cdborder/50 ${isSelected ? 'bg-cdborder/30' : ''}`} onClick={onToggleSelect ? () => onToggleSelect(act.id) : undefined}>
            {isPreview && <td className="p-3 w-10"><input type="checkbox" checked={isSelected} readOnly className="w-4 h-4 accent-green-500 cursor-pointer" /></td>}
            {ACTIVITY_TABLE_COLUMNS.map(col => <td key={col.key} className={`p-3 text-${col.align} text-xs`}>{renderCell(col)}</td>)}
            {!isPreview && <td className="p-3 text-right">
                <div className="flex gap-2 justify-end items-center">
                    {deleteConfirm === act.id ? <div className="flex gap-2 justify-end"><button type="button" onClick={(e) => { e.stopPropagation(); onDelete(act.id) }} className="text-red-500 font-bold text-xs bg-red-500/10 px-2 py-1 rounded focus-visible:ring-2 focus-visible:ring-red-400 focus:outline-none" aria-label={`Confirm delete activity ${act.title || ''}`}>SURE?</button><button type="button" onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null) }} className="text-cdmuted text-xs px-2 py-1 rounded focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none" aria-label="Cancel delete">Cancel</button></div> : <button type="button" onClick={(e) => { e.stopPropagation(); setDeleteConfirm(act.id) }} className="text-slate-600 hover:text-red-400 focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none rounded-sm" title="Delete Activity" aria-label={`Delete activity ${act.title || ''}`}>
                        <Trash2 size={14} />
                    </button>}
                </div>
            </td>}
        </tr>
    );
};

export default ActivityRow;
