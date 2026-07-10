import React from 'react';
import { Loader2, GitMerge } from 'lucide-react';

const MergePairModal = ({
    open,
    mergePairPreview,
    mergeError,
    isMerging,
    hasDb,
    onClose,
    onConfirm,
}) => {
    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-cdbg/95 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-cdsurface border border-cdborder rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b border-cdborder">
                    <h3 className="text-cdtext font-bold flex items-center gap-2 text-sm">
                        <GitMerge size={18} className="text-orange-400 shrink-0" />
                        Merge two activities
                    </h3>
                    <button
                        type="button"
                        aria-label="Close modal"
                        onClick={onClose}
                        className="text-cdmuted hover:text-cdtext text-lg font-bold px-2 focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none rounded"
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
                                <div className="text-cdtext font-mono text-[11px]">id {mergePairPreview.intervals.id}</div>
                                <div className="text-cdtext truncate">{mergePairPreview.intervals.title || '—'}</div>
                            </div>
                            <div className="rounded-lg border border-cdborder bg-cdbg/40 p-2 space-y-1">
                                <div className="text-[10px] font-bold text-orange-400 uppercase">Remove after merge (Strava import)</div>
                                <div className="text-cdtext font-mono text-[11px]">id {mergePairPreview.stravaSide.id}</div>
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
                <div className="flex justify-end gap-2 p-4 border-t border-cdborder">
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
                        {isMerging ? <Loader2 size={14} className="animate-spin" /> : <GitMerge size={14} />}
                        Merge &amp; delete duplicate
                    </button>
                </div>
                {!hasDb && (
                    <p className="px-4 pb-3 text-[10px] text-yellow-500">Sign in and sync is required to write merges to the database.</p>
                )}
            </div>
        </div>
    );
};

export default MergePairModal;
