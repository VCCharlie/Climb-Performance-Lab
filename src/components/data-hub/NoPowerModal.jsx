import React from 'react';
import { Loader2, Trash, Zap } from 'lucide-react';

const NoPowerModal = ({
    open,
    activities,
    selectedIds,
    onToggleAll,
    onToggleOne,
    onClose,
    onDeleteSelected,
    isDeleting,
}) => {
    if (!open) return null;

    const noPowerList = (activities || []).filter((a) => !(Number(a.avg_power) > 0));
    const allSelected = noPowerList.length > 0 && noPowerList.every((a) => selectedIds.includes(a.id));

    return (
        <div className="fixed inset-0 bg-cdbg/95 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-cdsurface border border-cdborder rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]">
                <div className="flex justify-between items-center p-4 border-b border-cdborder">
                    <div>
                        <h3 className="text-cdtext font-bold flex items-center gap-2">
                            <Zap size={16} className="text-yellow-400" />
                            Activities without power ({noPowerList.length})
                        </h3>
                        <p className="text-xs text-cdmuted mt-0.5">Select which ones to remove.</p>
                    </div>
                    <button
                        type="button"
                        aria-label="Close modal"
                        onClick={onClose}
                        className="text-cdmuted hover:text-cdtext text-lg font-bold px-2 focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none rounded"
                    >
                        ✕
                    </button>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 border-b border-cdborder bg-cdbg/40">
                    <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={onToggleAll}
                        className="accent-yellow-400 w-4 h-4"
                    />
                    <span className="text-xs text-cdmuted font-bold uppercase">Select all</span>
                    <span className="ml-auto text-xs text-cdmuted">{selectedIds.length} selected</span>
                </div>
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    {noPowerList.map((a) => (
                        <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-cdborder/40 hover:bg-cdborder/20">
                            <input
                                type="checkbox"
                                checked={selectedIds.includes(a.id)}
                                onChange={() => onToggleOne(a.id)}
                                className="accent-yellow-400 w-4 h-4 shrink-0"
                            />
                            <span className="text-xs text-cdmuted w-24 shrink-0">{a.date}</span>
                            <span className="text-sm text-cdtext flex-1 truncate">{a.title || 'Untitled'}</span>
                            <span className="text-xs text-cdmuted w-16 text-right shrink-0">{a.distance ? `${a.distance} km` : '-'}</span>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-3 p-4 border-t border-cdborder">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-cdmuted hover:text-cdtext font-bold text-sm">Close</button>
                    <button
                        onClick={onDeleteSelected}
                        disabled={isDeleting || selectedIds.length === 0}
                        className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded text-sm flex items-center gap-2 disabled:opacity-50"
                    >
                        {isDeleting ? <Loader2 className="animate-spin" size={14} /> : <Trash size={14} />}
                        Delete {selectedIds.length} activities
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NoPowerModal;
