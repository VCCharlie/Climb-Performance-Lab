import React from 'react';
import { Monitor, Footprints, Mountain, Bike, Trash2, ExternalLink, Eye } from 'lucide-react';
import { formatDateDDMMYYYY, formatTime } from '../../utils';
import { ACTIVITY_COLUMNS } from '../../config';

const ActivityRow = ({ act, onDelete, deleteConfirm, setDeleteConfirm, isPreview = false, isSelected = false, onToggleSelect, onToggleType, onViewDetail }) => {
    if (!act) return null;

    const renderCell = (col) => {
        try {
            const val = act[col.key];
            if (val === null || val === undefined) return <span className="text-slate-600">-</span>;

            switch (col.key) {
                case 'date': return <span className="text-cdtext whitespace-nowrap">{formatDateDDMMYYYY(val)}</span>;
                case 'type': return (
                    <div
                        className={`flex justify-center items-center h-full ${isPreview ? 'cursor-pointer hover:text-yellow-400' : ''}`}
                        onClick={(e) => { if (isPreview && onToggleType) { e.stopPropagation(); onToggleType(act.id); } }}
                        title={isPreview ? `Huidig: ${val}. Klik om te wijzigen.` : val}
                    >
                        {val === 'VirtualRide' ? <Monitor size={16} className="text-orange-400" title="Virtual Ride" /> :
                            val === 'Run' ? <Footprints size={16} className="text-blue-400" title="Run" /> :
                                val === 'Walk' ? <Footprints size={16} className="text-green-300" title="Walk" /> :
                                    val === 'Hike' ? <Mountain size={16} className="text-green-500" title="Hike" /> :
                                        <Bike size={16} className="text-green-400" title="Ride" />}
                    </div>
                );
                case 'title': return (
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-cdtext block max-w-[200px] truncate" title={val}>{val}</span>
                            {act.id && !String(act.id).startsWith('csv_') && (
                                <a
                                    href={`https://intervals.icu/activities/${act.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-cdmuted hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={e => e.stopPropagation()}
                                    title="Open in Intervals.icu"
                                >
                                    <ExternalLink size={12} />
                                </a>
                            )}
                        </div>
                        {act.gear_name && (
                            <span className="flex items-center gap-1 text-[10px] text-orange-400/70 mt-0.5">
                                <Bike size={9} />{act.gear_name}
                            </span>
                        )}
                    </div>
                );
                case 'moving_time': return <span className="text-cdmuted font-mono">{formatTime(val)}</span>;
                case 'distance': case 'avg_speed': return <span className="text-cdmuted">{Number(val).toFixed(1)}</span>;
                case 'climbing': case 'avg_power': return <span className="text-cdmuted">{Math.round(val || 0)}</span>;
                case 'norm_power': return <span className="font-bold text-yellow-400">{Math.round(val || 0)}</span>;
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
            {ACTIVITY_COLUMNS.map(col => <td key={col.key} className={`p-3 text-${col.align} text-xs`}>{renderCell(col)}</td>)}
            {!isPreview && <td className="p-3 text-right">
                <div className="flex gap-2 justify-end items-center">
                    {onViewDetail && (
                        <button onClick={(e) => { e.stopPropagation(); onViewDetail(act); }} className="text-slate-600 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" title="View Details">
                            <Eye size={14} />
                        </button>
                    )}
                    {deleteConfirm === act.id ? <div className="flex gap-2 justify-end"><button onClick={(e) => { e.stopPropagation(); onDelete(act.id) }} className="text-red-500 font-bold text-xs bg-red-500/10 px-2 py-1 rounded">SURE?</button><button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null) }} className="text-cdmuted text-xs px-2 py-1">Cancel</button></div> : <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(act.id) }} className="text-slate-600 hover:text-red-400"><Trash2 size={14} /></button>}
                </div>
            </td>}
        </tr>
    );
};

export default ActivityRow;
