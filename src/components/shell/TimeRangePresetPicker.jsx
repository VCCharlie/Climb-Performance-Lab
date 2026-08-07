import React, { useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import AnchoredDropdownPortal from '../ui/AnchoredDropdownPortal';
import NlDateInput from '../NlDateInput';
import { inputBaseClass, cn } from '../ui';
import { TIME_RANGE_OPTIONS } from '../../config/navTabs';

/**
 * Start/end date inputs for the Custom time-range preset.
 */
export function TimeRangeCustomDates({
    customStart,
    customEnd,
    onCustomStart,
    onCustomEnd,
    compact = false,
    className,
}) {
    return (
        <div
            className={cn(
                'flex items-center gap-2 bg-cdsurfacelow rounded-cdmd border border-cdborder/60 animate-in fade-in slide-in-from-top-1',
                compact ? 'p-1.5' : 'p-1.5',
                className,
            )}
        >
            <NlDateInput
                value={customStart}
                onChange={onCustomStart}
                className={`${inputBaseClass} text-[10px] ${compact ? 'py-0.5' : 'py-1'} flex-1`}
                aria-label="Start date (dd-mm-jjjj)"
            />
            <span className="text-cdmuted text-[10px]">–</span>
            <NlDateInput
                value={customEnd}
                onChange={onCustomEnd}
                className={`${inputBaseClass} text-[10px] ${compact ? 'py-0.5' : 'py-1'} flex-1`}
                aria-label="End date (dd-mm-jjjj)"
            />
        </div>
    );
}

/**
 * Collapsed time-range control — shows the active preset; opens a menu to pick another.
 */
export default function TimeRangePresetPicker({
    timeRange,
    onTimeRangeChange,
    customStart,
    customEnd,
    onCustomStart,
    onCustomEnd,
    compact = false,
    className,
    align = 'start',
    hideCustomDates = false,
}) {
    const [open, setOpen] = useState(false);
    const anchorRef = useRef(null);

    const selectPreset = (value) => {
        onTimeRangeChange(value);
        setOpen(false);
    };

    return (
        <div className={className}>
            <button
                ref={anchorRef}
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                aria-expanded={open}
                aria-haspopup="listbox"
                aria-label={`Time range: ${timeRange}. Click to change.`}
                className={cn(
                    'inline-flex items-center gap-1.5 font-semibold uppercase tracking-wide',
                    'bg-cdsurfacelow border border-cdborder/60 rounded-cdmd text-cdtext',
                    'cd-focus-ring cd-transition hover:bg-cdsurfacehigh',
                    compact ? 'px-2.5 py-1 text-[10px] min-h-8' : 'px-3 py-1.5 text-xs min-h-10',
                )}
            >
                {timeRange}
                <ChevronDown
                    size={compact ? 12 : 14}
                    className={cn('shrink-0 cd-transition', open && 'rotate-180')}
                    aria-hidden
                />
            </button>

            <AnchoredDropdownPortal
                open={open}
                anchorRef={anchorRef}
                onClose={() => setOpen(false)}
                align={align}
                minWidth={168}
                role="listbox"
                aria-label="Time range options"
            >
                <div className="py-1 max-h-64 overflow-y-auto">
                    {TIME_RANGE_OPTIONS.map((opt) => (
                        <button
                            key={opt}
                            type="button"
                            role="option"
                            aria-selected={timeRange === opt}
                            onClick={() => selectPreset(opt)}
                            className={cn(
                                'w-full text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide cd-focus-ring',
                                timeRange === opt
                                    ? 'bg-cdprimarycontainer text-cdonprimarycontainer'
                                    : 'text-cdtext hover:bg-cdsurfacelow',
                            )}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            </AnchoredDropdownPortal>

            {!hideCustomDates && timeRange === 'Custom' && (
                <TimeRangeCustomDates
                    customStart={customStart}
                    customEnd={customEnd}
                    onCustomStart={onCustomStart}
                    onCustomEnd={onCustomEnd}
                    compact={compact}
                    className={compact ? 'mt-1.5' : 'mt-2'}
                />
            )}
        </div>
    );
}
