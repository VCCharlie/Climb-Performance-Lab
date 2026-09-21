import React, { useCallback, useId } from 'react';
import { cn } from '../../ui';
import {
    applyDualRangeToMetricFilters,
    readDualRangeValues,
    snapMetricStep,
} from '../../../utils/metricRangeBounds';

/**
 * Accessible dual-thumb range slider for metric filters (distance km, duration min).
 */
export default function MetricDualRangeSlider({
    label,
    bounds,
    minValue,
    maxValue,
    onMinChange,
    onMaxChange,
    step = 1,
    formatValue = (v) => String(v),
    unit = '',
    className,
}) {
    const id = useId();
    const { low, high } = readDualRangeValues(minValue, maxValue, bounds);

    const clampPair = useCallback((nextLow, nextHigh) => {
        let lo = snapMetricStep(nextLow, step);
        let hi = snapMetricStep(nextHigh, step);
        lo = Math.max(bounds.min, Math.min(lo, bounds.max));
        hi = Math.max(bounds.min, Math.min(hi, bounds.max));
        if (lo > hi) {
            if (nextLow !== low) lo = hi;
            else hi = lo;
        }
        return { lo, hi };
    }, [bounds.min, bounds.max, step, low, high]);

    const commit = useCallback((lo, hi) => {
        applyDualRangeToMetricFilters(lo, hi, bounds, onMinChange, onMaxChange, step);
    }, [bounds, onMinChange, onMaxChange, step]);

    const onLowInput = (e) => {
        const { lo, hi } = clampPair(Number(e.target.value), high);
        commit(lo, hi);
    };

    const onHighInput = (e) => {
        const { lo, hi } = clampPair(low, Number(e.target.value));
        commit(lo, hi);
    };

    const lowPct = ((low - bounds.min) / (bounds.max - bounds.min)) * 100;
    const highPct = ((high - bounds.min) / (bounds.max - bounds.min)) * 100;

    return (
        <div className={cn('space-y-2', className)}>
            <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase text-cdmuted">{label}</span>
                <span className="text-[10px] text-cdtext tabular-nums">
                    {formatValue(low)}
                    {' – '}
                    {formatValue(high)}
                    {unit ? ` ${unit}` : ''}
                </span>
            </div>
            <div className="relative h-7 flex items-center">
                <div className="absolute inset-x-0 h-1.5 rounded-full bg-cdborder/50" aria-hidden />
                <div
                    className="absolute h-1.5 rounded-full bg-cdaccent/70"
                    style={{ left: `${lowPct}%`, right: `${100 - highPct}%` }}
                    aria-hidden
                />
                <input
                    id={`${id}-min`}
                    type="range"
                    min={bounds.min}
                    max={bounds.max}
                    step={step}
                    value={low}
                    onChange={onLowInput}
                    aria-label={`${label} minimum`}
                    className="metric-dual-range-thumb absolute w-full h-7 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto"
                />
                <input
                    id={`${id}-max`}
                    type="range"
                    min={bounds.min}
                    max={bounds.max}
                    step={step}
                    value={high}
                    onChange={onHighInput}
                    aria-label={`${label} maximum`}
                    className="metric-dual-range-thumb absolute w-full h-7 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto"
                />
            </div>
            <p className="text-[9px] text-cdmuted tabular-nums">
                Dataset: {formatValue(bounds.min)}–{formatValue(bounds.max)}
                {unit ? ` ${unit}` : ''}
                {' · '}
                {bounds.count} rides
            </p>
        </div>
    );
}
