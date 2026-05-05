import React, { useMemo } from 'react';
import { Download, X, Zap, Info } from 'lucide-react';
import TableHeader from './TableHeader';
import ActivityRow from './ActivityRow';
import useSortableData from '../../hooks/useSortableData';

const ReviewModal = ({
    fetchedActivities,
    selectedActivities,
    setSelectedActivities,
    onClose,
    onImport,
    toggleActivityType
}) => {

    // Internal sorting state for the modal's table
    const { items: sortedActivities, requestSort, sortConfig } = useSortableData(fetchedActivities, { key: 'date', direction: 'desc' });

    const handleSelectAll = () => setSelectedActivities(fetchedActivities.map(r => r.id));
    const handleDeselectAll = () => setSelectedActivities([]);
    const handleSelectWithPower = () => {
        const withPower = fetchedActivities.filter(a => a.avg_power > 0 || a.norm_power > 0).map(a => a.id);
        setSelectedActivities(withPower);
    };

    const toggleSelect = (id) => {
        if (selectedActivities.includes(id)) {
            setSelectedActivities(s => s.filter(x => x !== id));
        } else {
            setSelectedActivities(s => [...s, id]);
        }
    };

    return (
        <div className="fixed inset-0 bg-cdbg/95 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-cdsurface border border-cdborder rounded-xl shadow-2xl w-full max-w-6xl max-h-[85vh] flex flex-col">
                <div className="flex-shrink-0 p-3 border-b border-cdborder flex justify-between items-center bg-cdbg">
                    <h3 className="font-bold text-cdtext flex items-center gap-2 text-sm">
                        <Download size={16} className="text-green-400" /> {fetchedActivities.length} Activities Found
                    </h3>
                    <button onClick={onClose} aria-label="Close modal" className="p-1 hover:bg-cdborder rounded focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none"><X size={18} className="text-cdmuted hover:text-cdtext" /></button>
                </div>
                <div className="flex-shrink-0 px-3 py-2 bg-cdsurface border-b border-cdborder flex flex-wrap gap-2 items-center">
                    <button onClick={handleSelectAll} className="text-xs bg-cdborder px-3 py-1.5 rounded text-cdtext hover:bg-slate-600 focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none">Select All</button>
                    <button onClick={handleDeselectAll} className="text-xs bg-cdborder px-3 py-1.5 rounded text-cdtext hover:bg-slate-600 focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none">Deselect All</button>
                    <div className="w-px h-4 bg-slate-600 mx-1"></div>
                    <button onClick={handleSelectWithPower} className="text-xs bg-emerald-600/30 border border-emerald-500/50 px-3 py-1.5 rounded text-emerald-300 hover:bg-emerald-600/50 flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none"><Zap size={12} /> Only With Power</button>
                    <span className="text-[10px] text-yellow-400 ml-auto flex items-center gap-1"><Info size={10} /> Klik icoon: Ride ↔ Virtual</span>
                </div>
                <div className="overflow-auto flex-1 min-h-0 custom-scrollbar">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                        <TableHeader config={sortConfig} requestSort={requestSort} hasActions={false} isPreview={true} />
                        <tbody className="divide-y divide-cdborder bg-cdsurface">
                            {sortedActivities.map(act => (
                                <ActivityRow
                                    key={act.id}
                                    act={act}
                                    isPreview={true}
                                    isSelected={selectedActivities.includes(act.id)}
                                    onToggleSelect={toggleSelect}
                                    onToggleType={toggleActivityType}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex-shrink-0 p-3 border-t border-cdborder flex justify-between items-center bg-cdbg">
                    <span className="text-xs text-cdmuted">{selectedActivities.length} van {fetchedActivities.length} geselecteerd</span>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-cdmuted hover:text-cdtext focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none rounded-sm">Cancel</button>
                        <button onClick={onImport} disabled={selectedActivities.length === 0} className="px-6 py-2 text-sm font-bold bg-green-500 hover:bg-green-400 disabled:bg-slate-600 disabled:text-cdmuted text-cdtext rounded-lg shadow-lg shadow-green-500/20 transition-all focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none">✓ Import {selectedActivities.length}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReviewModal;
