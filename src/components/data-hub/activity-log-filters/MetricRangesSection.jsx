import React, { useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button, Chip, cn, inputBaseClass } from '../../ui';
import {
    GENERAL_METRIC_PRESETS,
    DRIFT_METRIC_PRESETS,
} from '../../../utils/metricRangePresets';

const RANGE_INPUT_CLASS = cn(inputBaseClass, 'w-12 !py-0.5 !px-1 !text-[10px] !leading-tight');

function wrapManualMetricHandler(handler, onManualMetricChange) {
    if (!onManualMetricChange) return handler;
    return (value) => {
        onManualMetricChange();
        handler(value);
    };
}

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

function PresetChipRow({ label, presets, activeMetricPresetIds, toggleMetricPreset }) {
    return (
        <div className="flex flex-wrap gap-1.5 items-center">
            {label ? (
                <span className="text-[9px] font-semibold text-cdmuted uppercase shrink-0 mr-0.5">{label}</span>
            ) : null}
            {presets.map((preset) => {
                const selected = activeMetricPresetIds.includes(preset.id);
                return (
                    <Chip
                        key={preset.id}
                        size="xs"
                        variant="filter"
                        selected={selected}
                        onClick={() => toggleMetricPreset(preset.id)}
                        aria-label={`${selected ? 'Remove' : 'Apply'} preset ${preset.label}`}
                    >
                        {preset.label}
                    </Chip>
                );
            })}
        </div>
    );
}

/**
 * Collapsible metric range filters — flat section (no nested card).
 */
export default function MetricRangesSection({
    expanded,
    onExpandedChange,
    metricRangeActive,
    clearMetricFilters,
    activeMetricPresetIds = [],
    toggleMetricPreset,
    clearActiveMetricPresets,
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
    filterDecMin,
    onFilterDecMinChange,
    filterDecMax,
    onFilterDecMaxChange,
    filterThrMin,
    onFilterThrMinChange,
    filterThrMax,
    onFilterThrMaxChange,
    filterRaceMin,
    onFilterRaceMinChange,
    filterRaceMax,
    onFilterRaceMaxChange,
    minTss,
    onMinTssChange,
    clearActiveMetricPresets,
}) {
    const onManualMetricChange = clearActiveMetricPresets;
    const onMinTssManualChange = wrapManualMetricHandler(onMinTssChange, onManualMetricChange);

    const handlers = useMemo(() => ({
        onFilterDistMinChange: wrapManualMetricHandler(onFilterDistMinChange, onManualMetricChange),
        onFilterDistMaxChange: wrapManualMetricHandler(onFilterDistMaxChange, onManualMetricChange),
        onFilterSpeedMinChange: wrapManualMetricHandler(onFilterSpeedMinChange, onManualMetricChange),
        onFilterSpeedMaxChange: wrapManualMetricHandler(onFilterSpeedMaxChange, onManualMetricChange),
        onFilterPowerMinChange: wrapManualMetricHandler(onFilterPowerMinChange, onManualMetricChange),
        onFilterPowerMaxChange: wrapManualMetricHandler(onFilterPowerMaxChange, onManualMetricChange),
        onFilterDurMinMinChange: wrapManualMetricHandler(onFilterDurMinMinChange, onManualMetricChange),
        onFilterDurMaxMinChange: wrapManualMetricHandler(onFilterDurMaxMinChange, onManualMetricChange),
        onFilterElevMinChange: wrapManualMetricHandler(onFilterElevMinChange, onManualMetricChange),
        onFilterElevMaxChange: wrapManualMetricHandler(onFilterElevMaxChange, onManualMetricChange),
        onFilterKjMinChange: wrapManualMetricHandler(onFilterKjMinChange, onManualMetricChange),
        onFilterKjMaxChange: wrapManualMetricHandler(onFilterKjMaxChange, onManualMetricChange),
        onFilterDecMinChange: wrapManualMetricHandler(onFilterDecMinChange, onManualMetricChange),
        onFilterDecMaxChange: wrapManualMetricHandler(onFilterDecMaxChange, onManualMetricChange),
        onFilterThrMinChange: wrapManualMetricHandler(onFilterThrMinChange, onManualMetricChange),
        onFilterThrMaxChange: wrapManualMetricHandler(onFilterThrMaxChange, onManualMetricChange),
        onFilterRaceMinChange: wrapManualMetricHandler(onFilterRaceMinChange, onManualMetricChange),
        onFilterRaceMaxChange: wrapManualMetricHandler(onFilterRaceMaxChange, onManualMetricChange),
    }), [
        onManualMetricChange,
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
        onFilterDecMinChange,
        onFilterDecMaxChange,
        onFilterThrMinChange,
        onFilterThrMaxChange,
        onFilterRaceMinChange,
        onFilterRaceMaxChange,
    ]);

    return (
        <div className="border-t border-cdborder/40">
            <div className="flex flex-wrap items-center gap-2 px-3 py-2">
                <button
                    type="button"
                    onClick={() => onExpandedChange?.(!expanded)}
                    className="flex flex-1 min-w-0 items-center justify-between gap-2 text-left cd-type-subsection hover:text-cdprimary cd-focus-ring rounded-sm"
                    aria-expanded={expanded}
                >
                    <span className="flex items-center gap-1.5 min-w-0">
                        Metric ranges
                        {metricRangeActive ? (
                            <span className="normal-case font-medium text-cdprimary">· active</span>
                        ) : null}
                    </span>
                    {expanded ? (
                        <ChevronDown size={14} className="text-cdmuted shrink-0" aria-hidden />
                    ) : (
                        <ChevronRight size={14} className="text-cdmuted shrink-0" aria-hidden />
                    )}
                </button>
                <span className="cd-type-caption hidden sm:inline">Dist · Speed · Power · Duration · TSS · Elev · kJ · Dec · Thr · Race</span>
                {metricRangeActive ? (
                    <Button
                        type="button"
                        variant="text"
                        size="sm"
                        onClick={clearMetricFilters}
                        className="!text-[10px] !h-7 shrink-0"
                    >
                        Clear ranges
                    </Button>
                ) : null}
            </div>

            {expanded ? (
                <div className="px-3 pb-3 space-y-2">
                    <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
                        <RangeField label="Dist" minValue={filterDistMin} maxValue={filterDistMax} onMinChange={handlers.onFilterDistMinChange} onMaxChange={handlers.onFilterDistMaxChange} step={0.1} />
                        <RangeField label="Speed" minValue={filterSpeedMin} maxValue={filterSpeedMax} onMinChange={handlers.onFilterSpeedMinChange} onMaxChange={handlers.onFilterSpeedMaxChange} step={0.1} />
                        <RangeField label="Power" minValue={filterPowerMin} maxValue={filterPowerMax} onMinChange={handlers.onFilterPowerMinChange} onMaxChange={handlers.onFilterPowerMaxChange} />
                        <RangeField label="Duration" minValue={filterDurMinMin} maxValue={filterDurMaxMin} onMinChange={handlers.onFilterDurMinMinChange} onMaxChange={handlers.onFilterDurMaxMinChange} />
                        <label className="flex flex-col gap-0.5 text-[10px] text-cdmuted">
                            <span className="font-semibold uppercase text-[9px]">TSS</span>
                            <input
                                type="number"
                                min={0}
                                step={1}
                                placeholder="min"
                                value={minTss}
                                onChange={(e) => onMinTssManualChange(e.target.value)}
                                className={RANGE_INPUT_CLASS}
                                aria-label="Minimum TSS (load)"
                                title="Show activities with load (TSS) greater than this value"
                            />
                        </label>
                        <RangeField label="Elev" minValue={filterElevMin} maxValue={filterElevMax} onMinChange={handlers.onFilterElevMinChange} onMaxChange={handlers.onFilterElevMaxChange} />
                        <RangeField label="kJ" minValue={filterKjMin} maxValue={filterKjMax} onMinChange={handlers.onFilterKjMinChange} onMaxChange={handlers.onFilterKjMaxChange} />
                        <RangeField label="Dec %" minValue={filterDecMin} maxValue={filterDecMax} onMinChange={handlers.onFilterDecMinChange} onMaxChange={handlers.onFilterDecMaxChange} step={0.1} />
                        <RangeField label="Thr %" minValue={filterThrMin} maxValue={filterThrMax} onMinChange={handlers.onFilterThrMinChange} onMaxChange={handlers.onFilterThrMaxChange} step={0.1} />
                        <RangeField label="Race %" minValue={filterRaceMin} maxValue={filterRaceMax} onMinChange={handlers.onFilterRaceMinChange} onMaxChange={handlers.onFilterRaceMaxChange} step={0.1} />
                    </div>
                    <div className="space-y-1.5">
                        <PresetChipRow
                            label="Presets"
                            presets={GENERAL_METRIC_PRESETS}
                            activeMetricPresetIds={activeMetricPresetIds}
                            toggleMetricPreset={toggleMetricPreset}
                        />
                        <PresetChipRow
                            label="Drift"
                            presets={DRIFT_METRIC_PRESETS}
                            activeMetricPresetIds={activeMetricPresetIds}
                            toggleMetricPreset={toggleMetricPreset}
                        />
                    </div>
                </div>
            ) : null}
        </div>
    );
}
