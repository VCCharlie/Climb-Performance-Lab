
import React from 'react';
import {
    CopyPlus
} from 'lucide-react';
import { formatDateDDMMYYYY, formatTime } from '../../utils';
import { duplicateResolutionSummary } from '../../utils/duplicateResolutions';

const DuplicateResolver = ({ duplicates, onResolve, onClose }) => {
    return (
        <div className="fixed inset-0 bg-cdbg/95 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-cdsurface border border-cdborder rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
                <div className="flex-shrink-0 p-4 border-b border-cdborder bg-cdbg">
                    <h3 className="font-bold text-cdtext flex items-center gap-2 text-lg">
                        <CopyPlus size={20} className="text-orange-400" />
                        {duplicates.length} conflicts found
                    </h3>
                    <p className="text-xs text-cdmuted mt-1">Compare and choose which activity to keep.</p>
                </div>

                <div className="overflow-auto flex-1 p-4 space-y-4 bg-cdbg/50">
                    {duplicates.map((dup, idx) => (
                        <div key={idx} className="bg-cdsurface border border-cdborder rounded-lg p-4 flex flex-col gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="text-xs font-mono text-orange-300 bg-orange-900/20 px-2 py-1 rounded w-fit">
                                    {dup.reason}
                                </div>
                                {dup.savedResolution && (
                                    <div className="text-[10px] font-bold text-cdaccent bg-cdaccent/10 border border-cdaccent/30 px-2 py-1 rounded">
                                        {duplicateResolutionSummary(dup.savedResolution)}
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {/* OPTIE A */}
                                <div className="border border-cdborder rounded p-3 bg-cdborder/30 hover:bg-cdborder/50 transition-colors">
                                    <div className="flex justify-between mb-2">
                                        <span className="font-bold text-cdtext text-sm">Version A</span>
                                        <span className="text-xs text-cdmuted">{dup.a.type}</span>
                                    </div>
                                    <div className="space-y-1 text-xs text-cdtext">
                                        <div className="font-medium text-cdtext">{dup.a.title}</div>
                                        <div>Date: {formatDateDDMMYYYY(dup.a.date)}</div>
                                        <div>Dist: {dup.a.distance}km</div>
                                        <div>Time: {formatTime(dup.a.moving_time)}</div>
                                        <div>Power: {dup.a.avg_power}W</div>
                                    </div>
                                    <button onClick={() => onResolve('keepA', dup)} className="mt-3 w-full py-2 bg-green-600 hover:bg-green-500 text-cdtext text-xs font-bold rounded">Keep A (Delete B)</button>
                                </div>

                                {/* OPTIE B */}
                                <div className="border border-cdborder rounded p-3 bg-cdborder/30 hover:bg-cdborder/50 transition-colors">
                                    <div className="flex justify-between mb-2">
                                        <span className="font-bold text-cdtext text-sm">Version B</span>
                                        <span className="text-xs text-cdmuted">{dup.b.type}</span>
                                    </div>
                                    <div className="space-y-1 text-xs text-cdtext">
                                        <div className="font-medium text-cdtext">{dup.b.title}</div>
                                        <div>Date: {formatDateDDMMYYYY(dup.b.date)}</div>
                                        <div>Dist: {dup.b.distance}km</div>
                                        <div>Time: {formatTime(dup.b.moving_time)}</div>
                                        <div>Power: {dup.b.avg_power}W</div>
                                    </div>
                                    <button onClick={() => onResolve('keepB', dup)} className="mt-3 w-full py-2 bg-green-600 hover:bg-green-500 text-cdtext text-xs font-bold rounded">Keep B (Delete A)</button>
                                </div>
                            </div>

                            {/* EXTRA OPTIONS */}
                            <div className="flex gap-2 justify-center pt-2 border-t border-cdborder/50">
                                <button onClick={() => onResolve('keepBoth', dup)} className="px-4 py-2 bg-cdborder hover:bg-slate-600 text-cdtext text-xs font-bold rounded border border-slate-500">Keep Both</button>
                                <button onClick={() => onResolve('deleteBoth', dup)} className="px-4 py-2 bg-red-900/50 hover:bg-red-900 text-red-200 text-xs font-bold rounded border border-red-800">Delete Both</button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex-shrink-0 p-3 border-t border-cdborder bg-cdbg flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-cdmuted hover:text-cdtext">Close (decide later)</button>
                </div>
            </div>
        </div>
    );
};

export default DuplicateResolver;
