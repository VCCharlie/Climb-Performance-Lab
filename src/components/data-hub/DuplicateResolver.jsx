
import React from 'react';
import { CopyPlus } from 'lucide-react';
import { formatDateDDMMYYYY, formatTime } from '../../utils';
import { duplicateResolutionSummary } from '../../utils/duplicateResolutions';
import ModalPortal from '../ui/ModalPortal';
import { modalScrimClass, modalPanelClass, modalHeaderClass, modalFooterClass } from '../ui/modalStyles';
import { useModalA11y } from '../../hooks/useModalA11y';

const DuplicateResolver = ({ duplicates, onResolve, onClose }) => {
    const panelRef = useModalA11y({ isOpen: true, onClose });

    return (
        <ModalPortal>
            <div className={`${modalScrimClass} z-[100]`}>
                <div
                    ref={panelRef}
                    className={`${modalPanelClass} max-w-4xl max-h-[85vh]`}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="duplicate-resolver-title"
                    tabIndex={-1}
                >
                    <div className={modalHeaderClass}>
                        <div>
                            <h3 id="duplicate-resolver-title" className="font-bold text-cdtext flex items-center gap-2 text-lg">
                                <CopyPlus size={20} className="text-orange-400" aria-hidden />
                                {duplicates.length} conflicts found
                            </h3>
                            <p className="text-xs text-cdmuted mt-1">Compare and choose which activity to keep.</p>
                        </div>
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
                                        <button type="button" onClick={() => onResolve('keepA', dup)} className="mt-3 w-full py-2 bg-green-600 hover:bg-green-500 text-cdtext text-xs font-bold rounded">Keep A (Delete B)</button>
                                    </div>

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
                                        <button type="button" onClick={() => onResolve('keepB', dup)} className="mt-3 w-full py-2 bg-green-600 hover:bg-green-500 text-cdtext text-xs font-bold rounded">Keep B (Delete A)</button>
                                    </div>
                                </div>

                                <div className="flex gap-2 justify-center pt-2 border-t border-cdborder/50">
                                    <button type="button" onClick={() => onResolve('keepBoth', dup)} className="px-4 py-2 bg-cdborder hover:bg-cdsurfacehigh text-cdtext text-xs font-bold rounded border border-cdborder">Keep Both</button>
                                    <button type="button" onClick={() => onResolve('deleteBoth', dup)} className="px-4 py-2 bg-red-900/50 hover:bg-red-900 text-red-200 text-xs font-bold rounded border border-red-800">Delete Both</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className={modalFooterClass}>
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-cdmuted hover:text-cdtext">Close (decide later)</button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};

export default DuplicateResolver;
