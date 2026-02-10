
import React from 'react';
import {
    CopyPlus
} from 'lucide-react';
import { formatDateDDMMYYYY, formatTime } from '../../utils';

const DuplicateResolver = ({ duplicates, onResolve, onClose }) => {
    return (
        <div className="fixed inset-0 bg-slate-900/95 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
                <div className="flex-shrink-0 p-4 border-b border-slate-700 bg-slate-900">
                    <h3 className="font-bold text-white flex items-center gap-2 text-lg">
                        <CopyPlus size={20} className="text-orange-400" />
                        {duplicates.length} Conflicten Gevonden
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Vergelijk en kies welke activiteit je wilt behouden.</p>
                </div>

                <div className="overflow-auto flex-1 p-4 space-y-4 bg-slate-900/50">
                    {duplicates.map((dup, idx) => (
                        <div key={idx} className="bg-slate-800 border border-slate-600 rounded-lg p-4 flex flex-col gap-3">
                            <div className="text-xs font-mono text-orange-300 bg-orange-900/20 px-2 py-1 rounded w-fit">
                                {dup.reason}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {/* OPTIE A */}
                                <div className="border border-slate-700 rounded p-3 bg-slate-700/30 hover:bg-slate-700/50 transition-colors">
                                    <div className="flex justify-between mb-2">
                                        <span className="font-bold text-white text-sm">Versie A</span>
                                        <span className="text-xs text-slate-400">{dup.a.type}</span>
                                    </div>
                                    <div className="space-y-1 text-xs text-slate-300">
                                        <div className="font-medium text-white">{dup.a.title}</div>
                                        <div>Date: {formatDateDDMMYYYY(dup.a.date)}</div>
                                        <div>Dist: {dup.a.distance}km</div>
                                        <div>Time: {formatTime(dup.a.moving_time)}</div>
                                        <div>Power: {dup.a.avg_power}W</div>
                                    </div>
                                    <button onClick={() => onResolve(dup.a.id, dup.b.id)} className="mt-3 w-full py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded">Keep A (Delete B)</button>
                                </div>

                                {/* OPTIE B */}
                                <div className="border border-slate-700 rounded p-3 bg-slate-700/30 hover:bg-slate-700/50 transition-colors">
                                    <div className="flex justify-between mb-2">
                                        <span className="font-bold text-white text-sm">Versie B</span>
                                        <span className="text-xs text-slate-400">{dup.b.type}</span>
                                    </div>
                                    <div className="space-y-1 text-xs text-slate-300">
                                        <div className="font-medium text-white">{dup.b.title}</div>
                                        <div>Date: {formatDateDDMMYYYY(dup.b.date)}</div>
                                        <div>Dist: {dup.b.distance}km</div>
                                        <div>Time: {formatTime(dup.b.moving_time)}</div>
                                        <div>Power: {dup.b.avg_power}W</div>
                                    </div>
                                    <button onClick={() => onResolve(dup.b.id, dup.a.id)} className="mt-3 w-full py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded">Keep B (Delete A)</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex-shrink-0 p-3 border-t border-slate-700 bg-slate-900 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Sluiten (Later beslissen)</button>
                </div>
            </div>
        </div>
    );
};

export default DuplicateResolver;
