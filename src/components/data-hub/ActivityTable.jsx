
import React from 'react';
import {
    ArrowUpDown, ChevronUp, ChevronDown, ChevronRight, Monitor, Bike, Footprints,
    Mountain, Edit2, Trash2, ExternalLink
} from 'lucide-react';
import { formatDateDDMMYYYY, formatTime } from '../../utils';
import { ACTIVITY_COLUMNS, MONTH_ORDER } from '../../config';

const SortIcon = ({ colKey, config }) => {
    if (config.key !== colKey) return <ArrowUpDown size={12} className="opacity-30 inline" />;
    return config.direction === 'asc' ? <ChevronUp size={12} className="text-yellow-400 inline" /> : <ChevronDown size={12} className="text-yellow-400 inline" />;
};

export const TableHeader = ({ config, requestSort, hasActions = true, isPreview = false }) => (
    <thead className="bg-slate-900 text-slate-400 uppercase font-bold sticky top-0 z-10 shadow-md text-[0.7rem] tracking-wider">
        <tr>
            {isPreview && <th className="p-3 w-10"></th>}
            {ACTIVITY_COLUMNS.map((col) => (
                <th key={col.key} className={`p-3 cursor-pointer hover:bg-slate-800 transition-colors select-none text-${col.align} ${col.width || ''}`} onClick={() => requestSort && requestSort(col.key)}>
                    <span className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                        {col.align === 'left' && <span>{col.label}</span>}
                        {requestSort && <SortIcon colKey={col.key} config={config} />}
                        {col.align !== 'left' && <span>{col.label}</span>}
                    </span>
                </th>
            ))}
            {hasActions && <th className="p-3 text-right">Action</th>}
        </tr>
    </thead>
);

export const Row = React.memo(({ act, onDelete, onEdit, deleteConfirm, setDeleteConfirm, isPreview = false, isSelected = false, onToggleSelect, onToggleType }) => {
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
            {ACTIVITY_COLUMNS.map(col => <td key={col.key} className={`p-3 text-${col.align} text-xs ${col.width || ''}`}>{renderCell(col)}</td>)}
            {!isPreview && <td className="p-3 text-right">
                {deleteConfirm === act.id ? (
                    <div className="flex gap-2 justify-end">
                        <button onClick={(e) => { e.stopPropagation(); onDelete(act.id) }} className="text-red-500 font-bold text-xs bg-red-500/10 px-2 py-1 rounded">SURE?</button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null) }} className="text-slate-400 text-xs px-2 py-1">Cancel</button>
                    </div>
                ) : (
                    <div className="flex gap-1 justify-end">
                        {/* EXTERNAL LINK */}
                        <a
                            href={`https://intervals.icu/activities/${act.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-600 hover:text-blue-400 p-1 flex items-center"
                            onClick={(e) => e.stopPropagation()}
                            title="Open in Intervals.icu"
                        >
                            <ExternalLink size={14} />
                        </a >
                        {/* EDIT BUTTON */}
                        < button onClick={(e) => { e.stopPropagation(); onEdit(act) }} className="text-slate-600 hover:text-yellow-400 p-1" >
                            <Edit2 size={14} />
                        </button >
                        {/* DELETE BUTTON */}
                        < button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(act.id) }} className="text-slate-600 hover:text-red-400 p-1" >
                            <Trash2 size={14} />
                        </button >
                    </div >
                )}
            </td >}
        </tr >
    );
});

const ActivityTable = ({ activities, sortConfig, onSort, onDelete, onEdit, isGroupedView, expandedYears, onToggleYear, deleteConfirm, setDeleteConfirm }) => {
    // Logic for grouping is assumed handled by parent or we move it here?
    // For now, let's keep it simple: props pass in the processed activities or we do the grouping here.
    // The previous implementation used `isGroupedView` and `groupedActivities` calculated in parent.
    // Let's expect `groupedActivities` if isGroupedView is true, else `activities`.

    // Wait, the parent calculates `processedActivities` and `groupedActivities`. 
    // To keep it clean, let's pass both or just the relevant data.
    // Let's stick to the previous pattern: Parent passes logic.

    // Actually, `activities` prop here should be `processedActivities` (filtered & sorted).
    // And if `isGroupedView` is true, we expect `activities` to be the object? 
    // No, `groupedActivities` was a separate memo.

    // Let's accept `groupedActivities` as an optional prop.

    return (
        <div className="overflow-x-auto overflow-y-auto flex-1 border border-slate-700 rounded-lg custom-scrollbar relative">
            <table className="w-full text-left text-xs whitespace-nowrap">
                <TableHeader config={sortConfig} requestSort={onSort} hasActions={true} isPreview={false} />
                <tbody className="divide-y divide-slate-700 bg-slate-800">
                    {isGroupedView ? (
                        // We need groupedActivities passed in
                        Object.keys(activities).sort((a, b) => sortConfig.direction === 'asc' ? a - b : b - a).map(year => (
                            <React.Fragment key={year}>
                                <tr id={`year-${year}`} className="bg-slate-700/50 scroll-mt-10"><td colSpan={ACTIVITY_COLUMNS.length + 1} className="p-2 font-bold text-slate-300"><button onClick={() => onToggleYear(year)} className="flex items-center gap-2">{expandedYears[year] ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {year}</button></td></tr>
                                {expandedYears[year] && Object.keys(activities[year]).sort((a, b) => { const diff = MONTH_ORDER.indexOf(b) - MONTH_ORDER.indexOf(a); return sortConfig.direction === 'asc' ? -diff : diff; }).map(month => (
                                    <React.Fragment key={month}>
                                        <tr id={`month-${year}-${month}`} className="bg-slate-700/20 scroll-mt-12"><td colSpan={ACTIVITY_COLUMNS.length + 1} className="px-8 py-1 text-[10px] uppercase font-bold text-slate-500">{month}</td></tr>
                                        {activities[year][month].map(act => <Row key={act.id} act={act} onDelete={onDelete} onEdit={onEdit} deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm} />)}
                                    </React.Fragment>
                                ))}
                            </React.Fragment>
                        ))
                    ) : (
                        activities.map(act => <Row key={act.id} act={act} onDelete={onDelete} onEdit={onEdit} deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm} />)
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default ActivityTable;
