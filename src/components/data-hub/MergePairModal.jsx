import React from 'react';
import { Loader2, GitMerge } from 'lucide-react';
import ModalPortal from '../ui/ModalPortal';
import { modalScrimClass, modalPanelClass, modalHeaderClass, modalFooterClass } from '../ui/modalStyles';
import { useModalA11y } from '../../hooks/useModalA11y';

const MergePairModal = ({
    open,
    mergePairPreview,
    mergeError,
    isMerging,
    hasDb,
    onClose,
    onConfirm,
}) => {
    const panelRef = useModalA11y({ isOpen: open, onClose });

    if (!open) return null;

    return (
        <ModalPortal>
            <div className={`${modalScrimClass} z-[100]`}>
                <div
                    ref={panelRef}
                    className={`${modalPanelClass} max-w-lg`}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="merge-pair-modal-title"
                    tabIndex={-1}
                >
                    <div className={modalHeaderClass}>
                        <h3 id="merge-pair-modal-title" className="text-cdtext font-bold flex items-center gap-2 text-sm">
                            <GitMerge size={18} className="text-orange-400 shrink-0" aria-hidden />
                            Merge two activities
                        </h3>
                        <button
                            type="button"
                            aria-label="Close modal"
                            onClick={onClose}
                            className="text-cdmuted hover:text-cdtext text-lg font-bold px-2 cd-focus-ring rounded"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="p-4 space-y-3 text-xs text-cdmuted overflow-y-auto custom-scrollbar">
                        <p>
                            Keeps the <strong className="text-cdtext">Intervals.icu</strong> activity id and power/load metrics.
                            Pulls in <strong className="text-cdtext">Strava</strong> link, map polyline, gear, and a better title when the Intervals title is generic.
                            After merge, if you are signed in to Strava, we fetch activity details to fill <strong className="text-cdtext">gear</strong> and route polyline when missing.
                            The duplicate Strava-only row is <strong className="text-red-400">deleted</strong> from the database.
                        </p>
                        {mergePairPreview?.error && (
                            <div className="rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 px-3 py-2">{mergePairPreview.error}</div>
                        )}
                        {mergePairPreview && !mergePairPreview.error && (
                            <>
                                <div className="rounded-lg border border-cdborder bg-cdbg/40 p-2 space-y-1">
                                    <div className="text-[10px] font-bold text-cdaccent uppercase">Keep (Intervals)</div>
                                    <div className="text-cdtext tabular-nums text-[11px]">id {mergePairPreview.intervals.id}</div>
                                    <div className="text-cdtext truncate">{mergePairPreview.intervals.title || '—'}</div>
                                </div>
                                <div className="rounded-lg border border-cdborder bg-cdbg/40 p-2 space-y-1">
                                    <div className="text-[10px] font-bold text-orange-400 uppercase">Remove after merge (Strava import)</div>
                                    <div className="text-cdtext tabular-nums text-[11px]">id {mergePairPreview.stravaSide.id}</div>
                                    <div className="text-cdtext truncate">{mergePairPreview.stravaSide.title || '—'}</div>
                                    {mergePairPreview.stravaSide.strava_id && (
                                        <div className="text-[10px]">strava_id {mergePairPreview.stravaSide.strava_id}</div>
                                    )}
                                </div>
                            </>
                        )}
                        {mergeError && (
                            <div className="rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 px-3 py-2">{mergeError}</div>
                        )}
                    </div>
                    <div className={modalFooterClass}>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-cdmuted hover:text-cdtext font-bold text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={!mergePairPreview || !!mergePairPreview.error || isMerging || !hasDb}
                            onClick={onConfirm}
                            className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm disabled:opacity-40 flex items-center gap-2"
                        >
                            {isMerging ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <GitMerge size={14} aria-hidden />}
                            Merge &amp; delete duplicate
                        </button>
                    </div>
                    {!hasDb && (
                        <p className="px-4 pb-3 text-[10px] text-cdprimary">Sign in and sync is required to write merges to the database.</p>
                    )}
                </div>
            </div>
        </ModalPortal>
    );
};

export default MergePairModal;
