import React, { useEffect, useRef, useState } from 'react';
import { LayoutGrid, ChevronDown } from 'lucide-react';
import AnchoredDropdownPortal from '../../ui/AnchoredDropdownPortal';
import { cn } from '../../ui';
import {
    FILTER_ANALYTICS_METRICS,
    FILTER_ANALYTICS_METRIC_GROUPS,
    FILTER_ANALYTICS_PRESET_LABELS,
} from '../../../utils/filterAnalyticsMetrics';

const PRESET_ORDER = ['essential', 'volume', 'intensity', 'full'];

/**
 * Choose which metrics appear in the filter analytics bar.
 */
export default function FilterAnalyticsMetricPicker({
    visibleKeys,
    activePreset,
    presetLabel,
    applyPreset,
    toggleMetric,
    isMetricVisible,
    contextProfile = null,
    usingContextSuggestion = false,
    manualOverride = false,
    onApplyContextSuggestion,
    className,
}) {
    const [open, setOpen] = useState(false);
    const buttonRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const onDoc = (e) => {
            if (buttonRef.current?.contains(e.target)) return;
            if (e.target.closest?.('[data-anchored-dropdown]')) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    const buttonLabel = presetLabel
        || (activePreset === 'custom'
            ? 'Custom'
            : (FILTER_ANALYTICS_PRESET_LABELS[activePreset] || 'Metrics'));

    const grouped = FILTER_ANALYTICS_METRICS.reduce((acc, metric) => {
        const group = metric.group;
        if (!acc[group]) acc[group] = [];
        acc[group].push(metric);
        return acc;
    }, {});

    return (
        <div className={cn('relative shrink-0', className)}>
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-haspopup="dialog"
                aria-label="Choose filter insight metrics"
                title="Show or hide insight metrics"
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-cdmuted hover:text-cdtext cd-focus-ring rounded px-1.5 py-0.5"
            >
                <LayoutGrid size={13} aria-hidden />
                <span className="hidden sm:inline max-w-[7rem] truncate">{buttonLabel}</span>
                <ChevronDown
                    size={13}
                    className={cn('cd-transition', open && 'rotate-180')}
                    aria-hidden
                />
            </button>

            <AnchoredDropdownPortal
                open={open}
                anchorRef={buttonRef}
                onClose={() => setOpen(false)}
                minWidth={280}
                className="max-w-[calc(100vw-1rem)]"
            >
                <div role="dialog" aria-label="Filter insight metrics">
                    <div className="px-3 py-2 border-b border-cdborder/60 bg-cdsurfacelow">
                        <p className="text-xs font-semibold text-cdtext">Insight metrics</p>
                        <p className="text-[10px] text-cdmuted mt-0.5">
                            {visibleKeys.length} of {FILTER_ANALYTICS_METRICS.length} visible in the bar.
                        </p>
                        {usingContextSuggestion && contextProfile ? (
                            <p className="text-[10px] text-cdaccent mt-1">
                                Auto layout for {contextProfile.label}.
                            </p>
                        ) : null}
                    </div>

                    {manualOverride && contextProfile && typeof onApplyContextSuggestion === 'function' ? (
                        <div className="px-3 py-2 border-b border-cdborder/40">
                            <button
                                type="button"
                                onClick={() => {
                                    onApplyContextSuggestion();
                                    setOpen(false);
                                }}
                                className="w-full text-left text-[10px] font-semibold text-cdaccent hover:underline cd-focus-ring rounded"
                            >
                                Apply {contextProfile.label} suggestion
                            </button>
                        </div>
                    ) : null}

                    <div className="px-3 py-2 border-b border-cdborder/40 flex flex-wrap gap-1.5">
                        {PRESET_ORDER.map((id) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => {
                                    applyPreset(id);
                                    setOpen(false);
                                }}
                                className={cn(
                                    'text-[10px] font-bold px-2 py-1 rounded border cd-focus-ring',
                                    activePreset === id && !usingContextSuggestion
                                        ? 'border-cdaccent/50 bg-cdaccent/15 text-cdaccent'
                                        : 'border-cdborder text-cdmuted hover:text-cdtext',
                                )}
                            >
                                {FILTER_ANALYTICS_PRESET_LABELS[id]}
                            </button>
                        ))}
                    </div>

                    <div className="max-h-64 overflow-y-auto px-3 py-2 space-y-3">
                        {Object.entries(grouped).map(([groupId, metrics]) => (
                            <div key={groupId}>
                                <p className="text-[9px] font-semibold uppercase tracking-wide text-cdmuted mb-1.5">
                                    {FILTER_ANALYTICS_METRIC_GROUPS[groupId] || groupId}
                                </p>
                                <ul className="space-y-1">
                                    {metrics.map((metric) => (
                                        <li key={metric.key}>
                                            <label className="flex items-center gap-2 text-[11px] text-cdtext cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={isMetricVisible(metric.key)}
                                                    onChange={() => toggleMetric(metric.key)}
                                                    className="rounded border-cdborder text-cdaccent focus:ring-cdaccent/40"
                                                />
                                                <span>{metric.label}</span>
                                            </label>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </AnchoredDropdownPortal>
        </div>
    );
}
