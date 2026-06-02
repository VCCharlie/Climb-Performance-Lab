import React, { useState } from 'react';
import { X, AlertTriangle, Check, ArrowRight, Activity, Calendar, Clock, MapPin } from 'lucide-react';
import { formatDateDDMMYYYY, formatTime } from '../../utils';

const DuplicateReviewModal = ({ conflicts, onResolve, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const currentConflict = conflicts[currentIndex];

    // If no conflicts or index out of bounds (shouldn't happen with correct logic)
    if (!currentConflict) {
        return null;
    }

    const [itemA, itemB] = currentConflict.items;
    // Note: logic supports >2 duplicates but UI designed for pairs primarily. 
    // If >2, we just compare first two for now or we could list all. 
    // For simplicity of MVP, let's assume pairs or take first two.

    const handleNext = () => {
        if (currentIndex < conflicts.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            onClose(); // Finished
        }
    };

    const handleKeep = (keepId) => {
        // Resolve: keepId is the one to keep. The others in this conflict group should be deleted.
        // ⚡ Bolt Optimization: Use single-pass reduce instead of chained .filter().map()
        const idsToDelete = currentConflict.items.reduce((acc, item) => {
            if (item.id !== keepId) {
                acc.push(item.id);
            }
            return acc;
        }, []);

        onResolve(idsToDelete);

        // Auto-advance
        if (conflicts.length > 1) {
            // Remove current conflict from local view or just advance index?
            // The parent manages state? Assuming parent *removes* the conflict from the list when `onResolve` is called 
            // OR we just advance. 
            // Better: `onResolve` will trigger parent to remove items. Parent might refresh the `conflicts` prop. 
            // If `conflicts` prop changes, we need to handle that.
            // But usually modal handles steps. Let's assume parent doesn't auto-remove the conflict from the array immediately 
            // or if it does, `currentIndex` might point to wrong item.
            // SAFEST: Let parent handle the data. We just emit event. 
            // BUT for smooth UI, we should probably just advance locally if the prop doesn't strict-control us.
            // Let's assume the parent WILL remove the resolved conflict from the list. 
            // So index 0 is always the "next" one if we shift the array. 
            // Strategy: Parent removes resolved conflict. Modal always shows conflicts[0].
        }
    };

    // Comparison Helper
    const DiffRow = ({ icon: Icon, label, valA, valB, formatFn }) => {
        const a = formatFn ? formatFn(valA) : valA;
        const b = formatFn ? formatFn(valB) : valB;
        const isMatch = valA === valB; // exact match

        return (
            <div className="grid grid-cols-[1fr_20px_1fr] items-center gap-2 text-xs border-b border-cdborder/50 py-2 last:border-0">
                <div className={`text-right ${isMatch ? 'text-cdmuted' : 'text-cdtext font-bold'}`}>{a || '-'}</div>
                <div className="flex justify-center text-slate-600"><Icon size={12} /></div>
                <div className={`text-left ${isMatch ? 'text-cdmuted' : 'text-cdtext font-bold'}`}>{b || '-'}</div>
            </div>
        );
    };

    const Card = ({ item, title }) => (
        <div className="flex-1 bg-cdsurface rounded-lg p-4 border border-cdborder flex flex-col">
            <div className="text-xs uppercase font-bold text-cdmuted mb-2 tracking-wider text-center">{title}</div>
            <div className="text-center mb-4">
                <div className="font-bold text-cdtext text-lg truncate" title={item.title}>{item.title}</div>
                <div className="text-xs text-cdmuted flex justify-center gap-2 items-center mt-1">
                    <span className="bg-cdborder px-2 py-0.5 rounded text-cdtext">{item.type}</span>
                    <span>{item.id}</span>
                </div>
            </div>
            <button
                onClick={() => handleKeep(item.id)}
                className="mt-auto w-full py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/50 rounded font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
                <Check size={16} /> Keep This
            </button>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-cdbg/95 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-cdsurface border border-cdborder rounded-xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-4 border-b border-cdborder flex justify-between items-center bg-cdbg">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-400/10 rounded-full"><AlertTriangle size={20} className="text-yellow-400" /></div>
                        <div>
                            <h3 className="font-bold text-cdtext">Duplicate Detector</h3>
                            <p className="text-xs text-cdmuted">Conflict {currentIndex + 1} of {conflicts.length}</p>
                        </div>
                    </div>
                    <button onClick={onClose} aria-label="Close modal" className="p-2 hover:bg-cdsurface rounded-full text-cdmuted hover:text-cdtext focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none"><X size={20} /></button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto max-h-[70vh]">
                    <div className="flex gap-6 items-stretch">
                        <Card item={itemA} title="Version A" />

                        {/* Center Comparison Column */}
                        <div className="w-1/3 flex flex-col justify-center gap-1">
                            <div className="text-center text-xs text-cdmuted mb-2 uppercase font-bold">Differences</div>
                            <div className="bg-cdbg/50 rounded-lg p-3 border border-cdborder">
                                <DiffRow icon={Calendar} valA={itemA.date} valB={itemB.date} formatFn={formatDateDDMMYYYY} />
                                <DiffRow icon={Clock} valA={itemA.moving_time} valB={itemB.moving_time} formatFn={formatTime} />
                                <DiffRow icon={MapPin} valA={itemA.distance} valB={itemB.distance} formatFn={(v) => `${Number(v).toFixed(1)} km`} />
                                <DiffRow icon={Activity} valA={itemA.avg_power} valB={itemB.avg_power} formatFn={(v) => `${Math.round(v || 0)} w`} />
                                <DiffRow icon={Activity} valA={itemA.norm_power} valB={itemB.norm_power} formatFn={(v) => `${Math.round(v || 0)} np`} />
                            </div>
                            <div className="flex justify-center mt-4">
                                <button onClick={() => { onResolve([]); /* Keep both implies no deletion, just remove from list */ }} className="text-xs text-cdmuted hover:text-cdtext underline">Switch to next (Keep Both)</button>
                            </div>
                        </div>

                        <Card item={itemB} title="Version B" />
                    </div>
                </div>

                {/* Footer */}
                {conflicts.length > 1 && (
                    <div className="p-3 bg-cdbg border-t border-cdborder flex justify-between items-center">
                        <div className="text-xs text-cdmuted">Resolving duplicates cleans up your analytics.</div>
                        <div className="flex gap-2">
                            {/* Optional: Skip button if we want to defer decision */}
                            <button onClick={() => {
                                // Logic to skip without removing
                                // Just remove from local view or advance index
                                // Ideally we emit 'skip'
                                onResolve([]);
                            }} className="px-3 py-1 text-xs text-cdmuted hover:text-cdtext">Skip</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DuplicateReviewModal;
