import React, { useMemo } from 'react';
import { computePowerProfileCategoryBars } from '../../utils/powerProfileCategories';
import { inferRiderPhenotype } from '../../utils/riderPhenotype';

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
export default function PowerCategoryBars({
    powerPeakRows,
    historyPeakRows,
    manualFtp = 0,
    weightKg = 0,
}) {
    const bars = computePowerProfileCategoryBars(powerPeakRows, historyPeakRows);
    const phenotype = useMemo(
        () => inferRiderPhenotype(powerPeakRows, { ftp: manualFtp, weightKg }),
        [powerPeakRows, manualFtp, weightKg],
    );

    const hasData = bars.some((b) => b.periodWatts > 0 || b.baselineWatts > 0);
    if (!hasData) return null;

    return (
        <div className="rounded-lg border border-cdborder/50 bg-cdsurfacelow/30 p-3 space-y-3">
            <div
                className={[
                    'rounded-md border px-3 py-2.5',
                    phenotype.id === 'building'
                        ? 'border-cdborder/50 bg-cdborder/15'
                        : 'border-cdprimary/35 bg-cdprimary/10',
                ].join(' ')}
            >
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-cdmuted">
                        Rider phenotype
                    </p>
                    {phenotype.confidence > 0 && phenotype.id !== 'building' && (
                        <span className="text-[10px] font-semibold text-cdmuted tabular-nums">
                            {phenotype.confidence}% match
                        </span>
                    )}
                </div>
                <p className="mt-0.5 text-lg sm:text-xl font-black text-cdtext leading-tight font-barlow">
                    {phenotype.label}
                </p>
                <p className="mt-1 text-xs sm:text-sm text-cdmuted leading-snug">
                    {phenotype.tagline}
                </p>
                <p className="mt-1.5 text-[10px] text-cdmuted/90 leading-snug">
                    Training guide from this period&apos;s peaks — not a diagnosis.
                </p>
            </div>

            <div className="flex items-start justify-between gap-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wide text-cdmuted">
                    Power categories
                </h4>
                <span className="text-[10px] text-cdmuted shrink-0 pt-0.5">% of all-time peak</span>
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
                        <div className="h-2.5 rounded-full bg-cdborder/40 overflow-hidden">
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
