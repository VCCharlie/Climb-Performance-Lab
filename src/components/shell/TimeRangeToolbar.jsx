import React from 'react';
import TimeRangePresetPicker from './TimeRangePresetPicker';
import { cn } from '../ui';

/**
 * Global time-range filter — collapsed preset picker on desktop and mobile.
 */
export default function TimeRangeToolbar({
    timeRange,
    onTimeRangeChange,
    customStart,
    customEnd,
    onCustomStart,
    onCustomEnd,
    layout = 'desktop',
    className,
    compact = false,
}) {
    const pickerProps = {
        timeRange,
        onTimeRangeChange,
        customStart,
        customEnd,
        onCustomStart,
        onCustomEnd,
        compact,
        align: layout === 'desktop' ? 'end' : 'start',
    };

    if (layout === 'mobile-full') {
        return (
            <TimeRangePresetPicker
                {...pickerProps}
                className={cn(compact ? 'pb-1' : 'pb-3', className)}
            />
        );
    }

    return (
        <TimeRangePresetPicker
            {...pickerProps}
            className={cn(
                layout === 'desktop' && 'flex justify-end',
                className,
            )}
        />
    );
}
