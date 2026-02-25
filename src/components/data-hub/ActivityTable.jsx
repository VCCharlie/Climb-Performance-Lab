
import React from 'react';
import {
    ArrowUpDown, ChevronUp, ChevronDown, ChevronRight, Monitor, Bike, Footprints,
    Mountain, Edit2, Trash2, ExternalLink, Eye
} from 'lucide-react';
import { formatDateDDMMYYYY, formatTime } from '../../utils';
import { ACTIVITY_COLUMNS, MONTH_ORDER } from '../../config';

const SortIcon = ({ colKey, config }) => {
    if (config.key !== colKey) return <ArrowUpDown size={12} className="opacity-30 inline" />;
    return config.direction === 'asc' ? <ChevronUp size={12} className="text-yellow-400 inline" /> : <ChevronDown size={12} className="text-yellow-400 inline" />;
};

export const TableHeader = ({ config, requestSort, hasActions = true, isPreview = false }) => (
    <thead className="bg-cdbg text-cdmuted uppercase font-bold sticky top-0 z-10 shadow-md text-[0.7rem] tracking-wider">
        <tr>
            {isPreview && <th className="px-2 py-2 w-8"></th>}
            {ACTIVITY_COLUMNS.map((col) => (
                <th key={col.key} className={`px-2 py-2 cursor-pointer hover:bg-cdsurface transition-colors select-none text-${col.align} ${col.width || ''}`} onClick={() => requestSort && requestSort(col.key)}>
                    <span className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                        {col.align === 'left' && <span>{col.label}</span>}
                        {requestSort && <SortIcon colKey={col.key} config={config} />}
                        {col.align !== 'left' && <span>{col.label}</span>}
                    </span>
                </th>
            ))}
            {hasActions && <th className="px-2 py-2 text-right w-28">Action</th>}
        </tr>
    </thead>
);

// Strava logo SVG (inline, geen extra dependency)
const StravaIcon = () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
);

export const Row = React.memo(({ act, onDelete, onEdit, onViewDetail, isConfirmingDelete, setDeleteConfirm, isPreview = false, isSelected = false, onToggleSelect, onToggleType }) => {
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
                    <span className="font-medium text-cdtext block truncate" title={val} style={{ maxWidth: 'none' }}>
                        {val}
                    </span>
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
            {isPreview && <td className="px-2 py-1.5 w-8"><input type="checkbox" checked={isSelected} readOnly className="w-4 h-4 accent-green-500 cursor-pointer" /></td>}
            {ACTIVITY_COLUMNS.map(col => <td key={col.key} className={`px-2 py-1.5 text-${col.align} text-xs ${col.width || ''}`}>{renderCell(col)}</td>)}
            {!isPreview && <td className="px-2 py-1.5 text-right w-28">
                {isConfirmingDelete ? (
                    <div className="flex gap-2 justify-end">
                        <button onClick={(e) => { e.stopPropagation(); onDelete(act.id) }} className="text-red-500 font-bold text-xs bg-red-500/10 px-2 py-1 rounded">SURE?</button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null) }} className="text-cdmuted text-xs px-2 py-1">Cancel</button>
                    </div>
                ) : (
                    <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* DETAIL VIEW */}
                        {onViewDetail && (
                            <button onClick={(e) => { e.stopPropagation(); onViewDetail(act); }} className="text-slate-600 hover:text-green-400 p-1" title="Bekijk details">
                                <Eye size={14} />
                            </button>
                        )}
                        {/* INTERVALS.ICU LINK */}
                        {!String(act.id).startsWith('csv_') && (
                            <a href={`https://intervals.icu/activities/${act.id}`} target="_blank" rel="noreferrer" className="text-slate-600 hover:text-blue-400 p-1 flex items-center" onClick={(e) => e.stopPropagation()} title="Open in Intervals.icu">
                                <ExternalLink size={14} />
                            </a>
                        )}
                        {/* STRAVA LINK */}
                        {act.strava_id && (
                            <a href={`https://www.strava.com/activities/${act.strava_id}`} target="_blank" rel="noreferrer" className="text-slate-600 hover:text-orange-400 p-1 flex items-center" onClick={(e) => e.stopPropagation()} title="Open in Strava">
                                <StravaIcon />
                            </a>
                        )}
                        {/* EDIT */}
                        <button onClick={(e) => { e.stopPropagation(); onEdit(act) }} className="text-slate-600 hover:text-yellow-400 p-1">
                            <Edit2 size={14} />
                        </button>
                        {/* DELETE */}
                        <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(act.id) }} className="text-slate-600 hover:text-red-400 p-1">
                            <Trash2 size={14} />
                        </button>
                    </div>
                )}
            </td>}
        </tr>
    );
});

const ActivityTable = ({ activities, sortConfig, onSort, onDelete, onEdit, onViewDetail, isGroupedView, isYearExpanded, onToggleYear, isMonthExpanded, onToggleMonth, deleteConfirm, setDeleteConfirm }) => {
    return (
        <div className="overflow-x-auto overflow-y-auto flex-1 border border-cdborder rounded-lg custom-scrollbar relative max-h-[65vh]">
            <table className="w-full text-left text-xs whitespace-nowrap">
                <TableHeader config={sortConfig} requestSort={onSort} hasActions={true} isPreview={false} />
                <tbody className="divide-y divide-cdborder bg-cdsurface">
                    {isGroupedView ? (
                        Object.keys(activities).sort((a, b) => sortConfig.direction === 'asc' ? a - b : b - a).map(year => (
                            <React.Fragment key={year}>
                                <tr id={`year-${year}`} className="bg-cdborder/50 scroll-mt-10"><td colSpan={ACTIVITY_COLUMNS.length + 1} className="p-2 font-bold text-cdtext"><button onClick={() => onToggleYear(year)} className="flex items-center gap-2 w-full text-left hover:text-yellow-400">{isYearExpanded(year) ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {year}</button></td></tr>
                                {isYearExpanded(year) && Object.keys(activities[year]).sort((a, b) => { const diff = MONTH_ORDER.indexOf(b) - MONTH_ORDER.indexOf(a); return sortConfig.direction === 'asc' ? -diff : diff; }).map(month => (
                                    <React.Fragment key={month}>
                                        <tr id={`month-${year}-${month}`} className="bg-cdborder/20 scroll-mt-12"><td colSpan={ACTIVITY_COLUMNS.length + 1} className="px-8 py-1 text-[10px] uppercase font-bold text-cdmuted"><button onClick={() => onToggleMonth(year, month)} className="flex items-center gap-1 hover:text-cdtext text-left w-full transition-colors">{isMonthExpanded(year, month) ? <ChevronDown size={12} /> : <ChevronRight size={12} />} {month}</button></td></tr>
                                        {isMonthExpanded(year, month) && activities[year][month].map(act => (
                                            <Row key={act.id} act={act} onDelete={onDelete} onEdit={onEdit} onViewDetail={onViewDetail} isConfirmingDelete={deleteConfirm === act.id} setDeleteConfirm={setDeleteConfirm} />
                                        ))}
                                    </React.Fragment>
                                ))}
                            </React.Fragment>
                        ))
                    ) : (
                        activities.map(act => (
                            <Row key={act.id} act={act} onDelete={onDelete} onEdit={onEdit} onViewDetail={onViewDetail} isConfirmingDelete={deleteConfirm === act.id} setDeleteConfirm={setDeleteConfirm} />
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default ActivityTable;
