import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button, Chip, cn, inputBaseClass } from '../../ui';

const RANGE_INPUT_CLASS = cn(inputBaseClass, 'w-12 !py-0.5 !px-1 !text-[10px] !leading-tight');

function RangeField({ label, minValue, maxValue, onMinChange, onMaxChange, step = 1 }) {
    return (
        <label className="flex flex-col gap-0.5 text-[10px] text-cdmuted">
            <span className="font-semibold uppercase text-[9px]">{label}</span>
            <span className="flex items-center gap-1">
                <input
                    type="number"
                    min={0}
                    step={step}
                    placeholder="min"
                    value={minValue}
                    onChange={(e) => onMinChange(e.target.value)}
                    className={RANGE_INPUT_CLASS}
                    aria-label={`${label} minimum`}
                />
                <span aria-hidden>–</span>
                <input
                    type="number"
                    min={0}
                    step={step}
                    placeholder="max"
                    value={maxValue}
                    onChange={(e) => onMaxChange(e.target.value)}
                    className={RANGE_INPUT_CLASS}
                    aria-label={`${label} maximum`}
                />
            </span>
        </label>
    );
}

const METRIC_PRESETS = [
    { label: 'Short <1h', apply: (h) => h.onFilterDurMaxMinChange('60') },
    { label: 'Long ≥4h', apply: (h) => h.onFilterDurMinMinChange('240') },
    { label: '≥50 km', apply: (h) => h.onFilterDistMinChange('50') },
    { label: '≤30 km', apply: (h) => h.onFilterDistMaxChange('30') },
    { label: 'Fast ≥32 km/h', apply: (h) => h.onFilterSpeedMinChange('32') },
    { label: 'Easy ≤26 km/h', apply: (h) => h.onFilterSpeedMaxChange('26') },
    { label: 'Pwr ≥200 W', apply: (h) => h.onFilterPowerMinChange('200') },
    { label: 'Climb ≥1000 m', apply: (h) => h.onFilterElevMinChange('1000') },
    { label: 'Work ≥1500 kJ', apply: (h) => h.onFilterKjMinChange('1500') },
];

/**
 * Collapsible metric range filters — flat section (no nested card).
 */
export default function MetricRangesSection({
    expanded,
    onExpandedChange,
    metricRangeActive,
    clearMetricFilters,
    applyMetricPreset,
    filterDistMin,
    onFilterDistMinChange,
    filterDistMax,
    onFilterDistMaxChange,
    filterSpeedMin,
    onFilterSpeedMinChange,
    filterSpeedMax,
    onFilterSpeedMaxChange,
    filterPowerMin,
    onFilterPowerMinChange,
    filterPowerMax,
    onFilterPowerMaxChange,
    filterDurMinMin,
    onFilterDurMinMinChange,
    filterDurMaxMin,
    onFilterDurMaxMinChange,
    filterElevMin,
    onFilterElevMinChange,
    filterElevMax,
    onFilterElevMaxChange,
    filterKjMin,
    onFilterKjMinChange,
    filterKjMax,
    onFilterKjMaxChange,
}) {
    const handlers = {
        onFilterDistMinChange,
        onFilterDistMaxChange,
        onFilterSpeedMinChange,
        onFilterSpeedMaxChange,
        onFilterPowerMinChange,
        onFilterPowerMaxChange,
        onFilterDurMinMinChange,
        onFilterDurMaxMinChange,
        onFilterElevMinChange,
        onFilterElevMaxChange,
        onFilterKjMinChange,
        onFilterKjMaxChange,
    };

    return (
        <div className="border-t border-cdborder/40">
            <div className="flex flex-wrap items-center gap-2 px-3 py-2">
                <button
                    type="button"
                    onClick={() => onExpandedChange?.(!expanded)}
                    className="flex items-center gap-1.5 text-left text-[10px] font-semibold text-cdtext uppercase tracking-wide hover:text-cdprimary cd-focus-ring rounded-sm"
                    aria-expanded={expanded}
                >
                    {expanded ? (
                        <ChevronDown size={14} className="text-cdmuted shrink-0" aria-hidden />
                    ) : (
                        <ChevronRight size={14} className="text-cdmuted shrink-0" aria-hidden />
                    )}
                    Metric ranges
                    {metricRangeActive ? (
                        <span className="normal-case font-medium text-cdprimary">· active</span>
                    ) : null}
                </button>
                <span className="text-[9px] text-cdmuted hidden sm:inline">Dist · Speed · Power · Duration · Elev · kJ</span>
                {metricRangeActive ? (
                    <Button
                        type="button"
                        variant="text"
                        size="sm"
                        onClick={clearMetricFilters}
                        className="!text-[10px] !h-7 ml-auto"
                    >
                        Clear ranges
                    </Button>
                ) : null}
            </div>

            {expanded ? (
                <div className="px-3 pb-3 space-y-2">
                    <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
                        <RangeField label="Dist" minValue={filterDistMin} maxValue={filterDistMax} onMinChange={onFilterDistMinChange} onMaxChange={onFilterDistMaxChange} step={0.1} />
                        <RangeField label="Speed" minValue={filterSpeedMin} maxValue={filterSpeedMax} onMinChange={onFilterSpeedMinChange} onMaxChange={onFilterSpeedMaxChange} step={0.1} />
                        <RangeField label="Power" minValue={filterPowerMin} maxValue={filterPowerMax} onMinChange={onFilterPowerMinChange} onMaxChange={onFilterPowerMaxChange} />
                        <RangeField label="Duration" minValue={filterDurMinMin} maxValue={filterDurMaxMin} onMinChange={onFilterDurMinMinChange} onMaxChange={onFilterDurMaxMinChange} />
                        <RangeField label="Elev" minValue={filterElevMin} maxValue={filterElevMax} onMinChange={onFilterElevMinChange} onMaxChange={onFilterElevMaxChange} />
                        <RangeField label="kJ" minValue={filterKjMin} maxValue={filterKjMax} onMinChange={onFilterKjMinChange} onMaxChange={onFilterKjMaxChange} />
                    </div>
                    <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-[9px] font-semibold text-cdmuted uppercase shrink-0 mr-0.5">Presets</span>
                        {METRIC_PRESETS.map((preset) => (
                            <Chip
                                key={preset.label}
                                size="sm"
                                variant="assist"
                                onClick={() => applyMetricPreset(() => preset.apply(handlers))}
                            >
                                {preset.label}
                            </Chip>
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
