import React from 'react';
import { Monitor, Footprints, Mountain, Bike, Trash2 } from 'lucide-react';
import { formatDateDDMMYYYY, formatTime } from '../../utils';
import { ACTIVITY_COLUMNS } from '../../config';

const ActivityRow = ({ act, onDelete, deleteConfirm, setDeleteConfirm, isPreview = false, isSelected = false, onToggleSelect, onToggleType }) => {
    if (!act) return null;

    const renderCell = (col) => {
        try {
            const val = act[col.key];
            if (val === null || val === undefined) return <span className="text-slate-600">-</span>;

            switch (col.key) {
                case 'date': return <span className="text-slate-300 whitespace-nowrap">{formatDateDDMMYYYY(val)}</span>;
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
                case 'title': return <span className="font-medium text-white block max-w-[200px] truncate" title={val}>{val}</span>;
                case 'moving_time': return <span className="text-slate-400 font-mono">{formatTime(val)}</span>;
                case 'distance': case 'avg_speed': return <span className="text-slate-400">{Number(val).toFixed(1)}</span>;
                case 'climbing': case 'avg_power': return <span className="text-slate-400">{Math.round(val || 0)}</span>;
                case 'norm_power': return <span className="font-bold text-yellow-400">{Math.round(val || 0)}</span>;
                case 'load': return <span className="font-bold text-blue-400">{Math.round(val || 0)}</span>;
                case 'rpe': return <span className="text-slate-400">{val || '-'}</span>;
                default: return <span className={`text-${col.text || 'slate-500'}`}>{val ? Math.round(val) : '-'}</span>;
            }
        } catch (e) {
            console.error("Error rendering cell", col.key, e);
            return <span className="text-red-500 text-xs">Err</span>;
        }
    };

    return (
        <tr className={`hover:bg-slate-700/50 transition-colors border-b border-slate-700/50 ${isSelected ? 'bg-slate-700/30' : ''}`} onClick={onToggleSelect ? () => onToggleSelect(act.id) : undefined}>
            {isPreview && <td className="p-3 w-10"><input type="checkbox" checked={isSelected} readOnly className="w-4 h-4 accent-green-500 cursor-pointer" /></td>}
            {ACTIVITY_COLUMNS.map(col => <td key={col.key} className={`p-3 text-${col.align} text-xs`}>{renderCell(col)}</td>)}
            {!isPreview && <td className="p-3 text-right">
                {deleteConfirm === act.id ? <div className="flex gap-2 justify-end"><button onClick={(e) => { e.stopPropagation(); onDelete(act.id) }} className="text-red-500 font-bold text-xs bg-red-500/10 px-2 py-1 rounded">SURE?</button><button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null) }} className="text-slate-400 text-xs px-2 py-1">Cancel</button></div> : <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(act.id) }} className="text-slate-600 hover:text-red-400"><Trash2 size={14} /></button>}
            </td>}
        </tr>
    );
};

export default ActivityRow;
