import React from 'react';
import { MessageSquare, Zap, TrendingUp, Mountain } from 'lucide-react';
import { Card } from '../ui';

/**
 * Plain-language summary of the most recent ride.
 */
export default function PostRideInsightCard({ insight, onOpenActivity }) {
    if (!insight) return null;

    return (
        <Card variant="outlined" padding="md" className="border-cdprimary/25 bg-cdprimarycontainer/5">
            <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-cdmuted flex items-center gap-1.5">
                        <MessageSquare size={14} className="text-cdprimary shrink-0" aria-hidden />
                        Latest ride insight
                    </p>
                    <h3 className="text-sm font-bold text-cdtext mt-1 truncate">{insight.title}</h3>
                    <p className="text-xs text-cdmuted">{insight.date}{insight.type ? ` · ${insight.type}` : ''}</p>
                </div>
                {onOpenActivity && (
                    <button
                        type="button"
                        onClick={onOpenActivity}
                        className="text-xs font-semibold text-cdprimary hover:underline cd-focus-ring rounded px-1 shrink-0"
                    >
                        Open in log
                    </button>
                )}
            </div>

            <p className="text-sm text-cdtext leading-relaxed">{insight.summary}</p>

            {insight.highlights?.length > 0 && (
                <ul className="mt-3 space-y-1">
                    {insight.highlights.map((line) => (
                        <li key={line} className="text-xs text-cdaccent flex items-start gap-1.5">
                            <TrendingUp size={12} className="shrink-0 mt-0.5" aria-hidden />
                            {line}
                        </li>
                    ))}
                </ul>
            )}

            {insight.bullets?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                    {insight.bullets.map((b) => (
                        <span
                            key={b}
                            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-cdsurfacelow border border-cdborder text-cdmuted"
                        >
                            {b.includes('TSS') ? <TrendingUp size={10} aria-hidden /> : null}
                            {b.includes('elev') ? <Mountain size={10} aria-hidden /> : null}
                            {b.includes('min') && !b.includes('TSS') ? <Zap size={10} aria-hidden /> : null}
                            {b}
                        </span>
                    ))}
                </div>
            )}
        </Card>
    );
}
