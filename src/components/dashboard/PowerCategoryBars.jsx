import React from 'react';
import { computePowerProfileCategoryBars } from '../../utils/powerProfileCategories';

function barTone(pct) {
    if (pct == null) return 'bg-cdborder/50';
    if (pct >= 95) return 'bg-emerald-500';
    if (pct >= 80) return 'bg-cdprimary';
    if (pct >= 65) return 'bg-amber-500';
    return 'bg-orange-600/80';
}

/**
 * Horizontal Sprint / Attack / Breakaway / Endurance bars vs history baseline.
 */
export default function PowerCategoryBars({ powerPeakRows, historyPeakRows }) {
    const bars = computePowerProfileCategoryBars(powerPeakRows, historyPeakRows);

    const hasData = bars.some((b) => b.periodWatts > 0 || b.baselineWatts > 0);
    if (!hasData) return null;

    return (
        <div className="rounded-lg border border-cdborder/50 bg-cdsurfacelow/30 p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wide text-cdmuted">
                    Power categories
                </h4>
                <span className="text-[10px] text-cdmuted">% of all-time peak</span>
            </div>

            {bars.map((bar) => {
                const pct = bar.pctOfBaseline ?? 0;
                const width = bar.pctOfBaseline != null
                    ? Math.min(100, Math.max(4, pct))
                    : 0;

                return (
                    <div key={bar.id} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-bold text-cdtext">{bar.label}</span>
                            <span className="text-cdmuted tabular-nums font-mono text-[11px]">
                                {bar.periodWatts > 0 ? `${bar.periodWatts} W` : '—'}
                                {bar.baselineWatts > 0 && bar.periodWatts > 0
                                    ? ` · ${bar.pctOfBaseline}%`
                                    : ''}
                            </span>
                        </div>
                        <div className="h-2 rounded-full bg-cdborder/40 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${barTone(bar.pctOfBaseline)}`}
                                style={{ width: `${width}%` }}
                                role="presentation"
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
