import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { computePowerProfileCategoryBars } from '../../utils/powerProfileCategories';
import { inferRiderPhenotype, PHENOTYPE_BANDS } from '../../utils/riderPhenotype';
import {
    cdTypeCaption,
    cdTypeLabel,
    cdTypeMetricLg,
    cdTypeNumeric,
    cdTypeBody,
} from '../../utils/typography';
import { cn } from '../ui';

function barTone(pct) {
    if (pct == null) return 'bg-cdborder/50';
    if (pct >= 95) return 'bg-cdgreen/70';
    if (pct >= 80) return 'bg-cdprimary/75';
    if (pct >= 65) return 'bg-cdaccent/60';
    return 'bg-cdprimary/55';
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
    const [showBands, setShowBands] = useState(false);

    const bars = computePowerProfileCategoryBars(powerPeakRows, historyPeakRows);
    const phenotype = useMemo(
        () => inferRiderPhenotype(powerPeakRows, { ftp: manualFtp, weightKg, historyPeakRows: historyPeakRows }),
        [powerPeakRows, manualFtp, weightKg, historyPeakRows],
    );

    const hasData = bars.some((b) => b.periodWatts > 0 || b.baselineWatts > 0);
    if (!hasData) return null;

    return (
        <div className="rounded-lg border border-cdborder/50 bg-cdsurfacelow/30 p-3 space-y-3">
            <div
                className={cn(
                    'rounded-md border px-3 py-2.5',
                    phenotype.id === 'building'
                        ? 'border-cdborder/50 bg-cdborder/15'
                        : 'border-cdprimary/35 bg-cdprimary/10',
                )}
            >
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                    <p className={cdTypeLabel}>Rider phenotype</p>
                    {phenotype.confidence > 0 && phenotype.id !== 'building' && (
                        <span className={cn(cdTypeCaption, cdTypeNumeric, 'font-semibold')} title="How much the top type leads the runner-up">
                            {phenotype.confidence}% match
                        </span>
                    )}
                </div>
                <p className={cn('mt-0.5 leading-tight font-barlow', cdTypeMetricLg, 'text-xl sm:text-2xl font-black')}>
                    {phenotype.label}
                </p>
                <p className={cn('mt-1 leading-snug', cdTypeBody, 'text-cdmuted')}>
                    {phenotype.tagline}
                </p>
                <p className={cn('mt-1.5', cdTypeCaption)}>
                    Training guide from this period&apos;s peaks — not a diagnosis.
                </p>

                <button
                    type="button"
                    onClick={() => setShowBands((open) => !open)}
                    className={cn(
                        'mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1',
                        'text-cdaccent hover:bg-cdaccent/10 cd-transition cd-focus-ring cd-min-touch-y',
                        cdTypeCaption,
                        'font-semibold uppercase tracking-wide',
                    )}
                    aria-expanded={showBands}
                >
                    <Info size={12} aria-hidden />
                    How is this calculated?
                    {showBands ? <ChevronUp size={12} aria-hidden /> : <ChevronDown size={12} aria-hidden />}
                </button>

                {showBands ? (
                    <div className="mt-2 space-y-2.5 rounded-md border border-cdborder/40 bg-cdsurface/60 px-3 py-2.5">
                        <p className={cdTypeCaption}>
                            We compare this period&apos;s peak power at 15 s, 1, 5, 10, 20, and 60 min (Coggan zones + key ratios).
                            The highest-scoring shape wins; match % is how far ahead of the runner-up it is.
                        </p>
                        {PHENOTYPE_BANDS.map((band) => (
                            <div
                                key={band.id}
                                className={cn(
                                    'rounded border px-2.5 py-2',
                                    band.id === phenotype.id
                                        ? 'border-cdprimary/40 bg-cdprimary/10'
                                        : 'border-cdborder/30 bg-cdborder/10',
                                )}
                            >
                                <p className={cn(cdTypeLabel, 'text-cdtext')}>{band.label}</p>
                                <p className={cn('mt-0.5', cdTypeCaption)}>{band.summary}</p>
                                <ul className={cn('mt-1.5 space-y-0.5 list-disc pl-4', cdTypeCaption)}>
                                    {band.thresholds.map((t) => (
                                        <li key={t}>{t}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>

            <div className="flex items-start justify-between gap-2">
                <h4 className={cdTypeLabel}>Power categories</h4>
                <span className={cn(cdTypeCaption, 'shrink-0 pt-0.5')}>% of all-time peak</span>
            </div>

            {bars.map((bar) => {
                const pct = bar.pctOfBaseline ?? 0;
                const width = bar.pctOfBaseline != null
                    ? Math.min(100, Math.max(4, pct))
                    : 0;

                return (
                    <div key={bar.id} className="space-y-1">
                        <div className={cn('flex items-center justify-between gap-2', cdTypeBody, 'text-xs')}>
                            <span className="font-bold text-cdtext">{bar.label}</span>
                            <span className={cn('text-cdmuted', cdTypeNumeric, cdTypeCaption)}>
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
