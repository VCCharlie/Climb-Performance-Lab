import React from 'react';

/**
 * Per-activity Intervals map backfill outcomes (Settings → Route map coverage).
 */
export default function RouteMapBackfillResults({ outcomes, onClose }) {
    if (!outcomes?.length) return null;

    const added = outcomes.filter((o) => o.status === 'added');
    const skipped = outcomes.filter((o) => o.status === 'skipped');
    const failed = outcomes.filter((o) => o.status === 'failed');

    return (
        <div className="mt-3 rounded-cdmd border border-cdborder bg-cdsurface/90 p-3 text-xs">
            <div className="flex items-center justify-between gap-2 mb-2">
                <p className="font-semibold text-cdtext">Map backfill results</p>
                {onClose && (
                    <button
                        type="button"
                        className="text-cdmuted hover:text-cdtext underline"
                        onClick={onClose}
                    >
                        Dismiss
                    </button>
                )}
            </div>
            <p className="text-cdmuted mb-2">
                {added.length} added · {skipped.length} skipped (no map available) · {failed.length} failed
            </p>
            <ul
                className="max-h-[min(50vh,24rem)] overflow-y-auto space-y-2 text-cdmuted border-t border-cdborder/50 pt-2"
                aria-label="Per-activity map backfill results"
            >
                {outcomes.map((row) => {
                    const date = row.date ? String(row.date).split('T')[0] : '?';
                    const title = row.title || '(no title)';
                    const type = row.type ? ` · ${row.type}` : '';
                    const statusClass = row.status === 'added'
                        ? 'text-cdgreen'
                        : row.status === 'failed'
                            ? 'text-red-400'
                            : 'text-amber-500/90';
                    return (
                        <li key={`${row.id}-${row.code}-${date}`} className="font-mono break-all">
                            <span className={statusClass}>{row.status}</span>
                            {' · '}
                            {date} · {row.id} · {title}{type}
                            <div className="font-sans text-cdmuted mt-0.5 pl-0">{row.message}</div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
