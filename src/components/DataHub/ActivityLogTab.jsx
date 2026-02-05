import React, { useState, useMemo } from 'react';
import { Search, Trash, Loader2, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import TableHeader from './TableHeader';
import ActivityRow from './ActivityRow';
import useSortableData from '../../hooks/useSortableData';
import { ACTIVITY_COLUMNS, MONTH_ORDER } from '../../config';

// Helper for validity
const isValidActivity = (act) => {
    return act && act.id && act.date;
};

const ActivityLogTab = ({ activities, onDelete, onClear, isDeleting }) => {
    const [search, setSearch] = useState("");
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [expandedYears, setExpandedYears] = useState({});

    // Sorting Logic
    const { items: sortedItems, requestSort, sortConfig } = useSortableData(activities, { key: 'date', direction: 'desc' });

    // Filter Logic
    const processedActivities = useMemo(() => {
        if (!sortedItems) return [];
        return sortedItems.filter(a => {
            if (!isValidActivity(a)) return false;
            return (a.title && a.title.toLowerCase().includes(search.toLowerCase())) || (a.date && a.date.includes(search));
        });
    }, [sortedItems, search]);

    // Grouping Logic
    const toggleYear = (year) => setExpandedYears(p => ({ ...p, [year]: !p[year] }));
    const isGroupedView = sortConfig?.key === 'date';

    const groupedActivities = useMemo(() => {
        if (!isGroupedView) return null;
        const groups = {};
        processedActivities.forEach(act => {
            try {
                const d = new Date(act.date);
                const y = d.getFullYear();
                const m = d.toLocaleString('en-US', { month: 'long' });
                if (!groups[y]) groups[y] = {};
                if (!groups[y][m]) groups[y][m] = [];
                groups[y][m].push(act);
            } catch (e) { console.warn("Skipping activity", act); }
        });
        return groups;
    }, [processedActivities, isGroupedView]);

    return (
        <>
            <div className="flex justify-between items-center mb-4 gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full bg-slate-900 border border-slate-600 rounded pl-10 pr-4 py-2 text-sm text-white outline-none" />
                </div>
                <button
                    onClick={onClear}
                    disabled={isDeleting || !activities || activities.length === 0}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 px-4 py-2 rounded flex items-center gap-2 text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash size={16} />}
                    {isDeleting ? 'Wissen...' : 'Clear Database'}
                </button>
            </div>

            {!activities ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4"><Loader2 className="animate-spin text-yellow-400" size={32} /><p>Loading Activities...</p></div>
            ) : processedActivities.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-2 border border-dashed border-slate-700 rounded-lg"><AlertTriangle size={32} className="text-slate-600" /><p>No activities found. Start with an Import!</p></div>
            ) : (
                <div className="overflow-x-auto flex-1 border border-slate-700 rounded-lg custom-scrollbar">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                        <TableHeader config={sortConfig} requestSort={requestSort} hasActions={true} isPreview={false} />
                        <tbody className="divide-y divide-slate-700 bg-slate-800">
                            {isGroupedView && groupedActivities && Object.keys(groupedActivities).sort((a, b) => sortConfig.direction === 'asc' ? a - b : b - a).map(year => (
                                <React.Fragment key={year}>
                                    <tr className="bg-slate-700/50"><td colSpan={ACTIVITY_COLUMNS.length + 1} className="p-2 font-bold text-slate-300"><button onClick={() => toggleYear(year)} className="flex items-center gap-2">{expandedYears[year] ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {year}</button></td></tr>
                                    {expandedYears[year] && Object.keys(groupedActivities[year]).sort((a, b) => { const diff = MONTH_ORDER.indexOf(b) - MONTH_ORDER.indexOf(a); return sortConfig.direction === 'asc' ? -diff : diff; }).map(month => (
                                        <React.Fragment key={month}>
                                            <tr className="bg-slate-700/20"><td colSpan={ACTIVITY_COLUMNS.length + 1} className="px-8 py-1 text-[10px] uppercase font-bold text-slate-500">{month}</td></tr>
                                            {groupedActivities[year][month].map(act => <ActivityRow key={act.id} act={act} onDelete={onDelete} deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm} />)}
                                        </React.Fragment>
                                    ))}
                                </React.Fragment>
                            ))}
                            {!isGroupedView && processedActivities.map(act => <ActivityRow key={act.id} act={act} onDelete={onDelete} deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm} />)}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
};

export default ActivityLogTab;
