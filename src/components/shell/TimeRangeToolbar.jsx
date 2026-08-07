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
        hideCustomDates: layout === 'mobile-inline',
        className: cn(
            layout === 'desktop' && 'shrink-0',
            layout === 'mobile-inline' && 'shrink-0',
            className,
        ),
    };

    return <TimeRangePresetPicker {...pickerProps} />;
}
