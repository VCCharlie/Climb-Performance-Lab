
import React, { useState } from 'react';
import {
    Download, X, Zap, Info
} from 'lucide-react';
import { TableHeader, Row } from './ActivityTable';

const ImportModal = ({
    showModal,
    onClose,
    fetchedActivities,
    selectedActivities,
    setSelectedActivities,
    toggleActivityTypeInPreview,
    previewSortConfig,
    requestPreviewSort,
    confirmImport,
    rawData,
    sortedFetchedActivities,
    profileFtp,
}) => {
    const [showDebug, setShowDebug] = useState(false);

    if (!showModal) return null;

    return (
        <div className="fixed inset-0 bg-cdbg/95 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-cdsurface border border-cdborder rounded-xl shadow-2xl w-full max-w-6xl max-h-[85vh] flex flex-col">
                <div className="flex-shrink-0 p-3 border-b border-cdborder flex justify-between items-center bg-cdbg">
                    <h3 className="font-bold text-cdtext flex items-center gap-2 text-sm"><Download size={16} className="text-green-400" /> {fetchedActivities.length} Activities Found</h3>
                    <span className="text-xs text-cdmuted ml-auto mr-4">Select to Import or Update</span>
                    <button onClick={onClose} aria-label="Close modal" className="p-1 hover:bg-cdborder rounded focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none"><X size={18} className="text-cdmuted hover:text-cdtext" /></button>
                </div>
                <div className="flex-shrink-0 px-3 py-2 bg-cdsurface border-b border-cdborder flex flex-wrap gap-2 items-center">
                    <button onClick={() => setSelectedActivities(fetchedActivities.map(r => r.id))} className="text-xs bg-cdborder px-3 py-1.5 rounded text-cdtext hover:bg-slate-600">Select All</button>
                    <button onClick={() => setSelectedActivities([])} className="text-xs bg-cdborder px-3 py-1.5 rounded text-cdtext hover:bg-slate-600">Deselect All</button>
                    <div className="w-px h-4 bg-slate-600 mx-1"></div>
                    <button onClick={() => {
                        // ⚡ Bolt Optimization: Use single-pass reduce instead of chained filter/map
                        const withPower = fetchedActivities.reduce((acc, a) => {
                            if (a.avg_power > 0 || a.norm_power > 0) acc.push(a.id);
                            return acc;
                        }, []);
                        setSelectedActivities(withPower);
                    }} className="text-xs bg-emerald-600/30 border border-emerald-500/50 px-3 py-1.5 rounded text-emerald-300 hover:bg-emerald-600/50 flex items-center gap-1"><Zap size={12} /> Only With Power</button>
                </div>
                <div className="overflow-auto flex-1 min-h-0 custom-scrollbar">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                        <TableHeader config={previewSortConfig} requestSort={requestPreviewSort} hasActions={false} isPreview={true} />
                        <tbody className="divide-y divide-cdborder bg-cdsurface">
                            {sortedFetchedActivities.map(act => (
                                <Row key={act.id} act={act} isPreview={true} isSelected={selectedActivities.includes(act.id)} onToggleSelect={(id) => { if (selectedActivities.includes(id)) setSelectedActivities(s => s.filter(x => x !== id)); else setSelectedActivities(s => [...s, id]); }} onToggleType={toggleActivityTypeInPreview} profileFtp={profileFtp} />
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Footer - Restored */}
                <div className="flex-shrink-0 p-3 border-t border-cdborder flex justify-between items-center bg-cdbg">
                    <span className="text-xs text-cdmuted">{selectedActivities.length} van {fetchedActivities.length} geselecteerd</span>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-cdmuted hover:text-cdtext">Cancel</button>
                        <button onClick={confirmImport} disabled={selectedActivities.length === 0} className="px-6 py-2 text-sm font-bold bg-green-500 hover:bg-green-400 disabled:bg-slate-600 disabled:text-cdmuted text-cdtext rounded-lg shadow-lg shadow-green-500/20 transition-all">✓ Import {selectedActivities.length}</button>
                    </div>
                </div>

                {/* DEBUG DATA */}
                {rawData && (
                    <div className="border-t border-cdborder bg-cdbg p-2">
                        <button onClick={() => setShowDebug(!showDebug)} className="text-xs text-cdmuted hover:text-cdtext flex items-center gap-1 w-full justify-center">
                            <Info size={12} /> {showDebug ? 'Hide Debug Data' : 'Show Debug Data (Raw API Response)'}
                        </button>
                        {showDebug && (
                            <pre className="mt-2 text-[10px] text-green-400 bg-black p-4 rounded overflow-auto max-h-60 font-mono select-text">
                                {JSON.stringify(rawData, null, 2)}
                            </pre>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImportModal;
