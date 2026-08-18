import React from 'react';
import { Loader2, Trash, Zap } from 'lucide-react';
import ModalPortal from '../ui/ModalPortal';
import { modalScrimClass, modalPanelClass, modalHeaderClass, modalFooterClass } from '../ui/modalStyles';
import { useModalA11y } from '../../hooks/useModalA11y';

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
    const panelRef = useModalA11y({ isOpen: open, onClose });

    if (!open) return null;

    const noPowerList = (activities || []).filter((a) => !(Number(a.avg_power) > 0));
    const allSelected = noPowerList.length > 0 && noPowerList.every((a) => selectedIds.includes(a.id));

    return (
        <ModalPortal>
            <div className={`${modalScrimClass} z-[100]`}>
                <div
                    ref={panelRef}
                    className={`${modalPanelClass} max-w-2xl max-h-[85vh]`}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="no-power-modal-title"
                    tabIndex={-1}
                >
                    <div className={modalHeaderClass}>
                        <div>
                            <h3 id="no-power-modal-title" className="text-cdtext font-bold flex items-center gap-2">
                                <Zap size={16} className="text-cdprimary" aria-hidden />
                                Activities without power ({noPowerList.length})
                            </h3>
                            <p className="text-xs text-cdmuted mt-0.5">Select which ones to remove.</p>
                        </div>
                        <button
                            type="button"
                            aria-label="Close modal"
                            onClick={onClose}
                            className="text-cdmuted hover:text-cdtext text-lg font-bold px-2 cd-focus-ring rounded"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-2 border-b border-cdborder bg-cdbg/40">
                        <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={onToggleAll}
                            className="accent-cdprimary w-4 h-4"
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
                                    className="accent-cdprimary w-4 h-4 shrink-0"
                                />
                                <span className="text-xs text-cdmuted w-24 shrink-0">{a.date}</span>
                                <span className="text-sm text-cdtext flex-1 truncate">{a.title || 'Untitled'}</span>
                                <span className="text-xs text-cdmuted w-16 text-right shrink-0">{a.distance ? `${a.distance} km` : '-'}</span>
                            </div>
                        ))}
                    </div>
                    <div className={modalFooterClass}>
                        <button type="button" onClick={onClose} className="px-4 py-2 text-cdmuted hover:text-cdtext font-bold text-sm">Close</button>
                        <button
                            type="button"
                            onClick={onDeleteSelected}
                            disabled={isDeleting || selectedIds.length === 0}
                            className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded text-sm flex items-center gap-2 disabled:opacity-50"
                        >
                            {isDeleting ? <Loader2 className="animate-spin" size={14} aria-hidden /> : <Trash size={14} aria-hidden />}
                            Delete {selectedIds.length} activities
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};

export default NoPowerModal;
