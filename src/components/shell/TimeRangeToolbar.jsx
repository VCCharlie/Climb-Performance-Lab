import React, { useMemo } from 'react';
import NlDateInput from '../NlDateInput';
import { SegmentedControl, inputBaseClass, cn } from '../ui';
import { TIME_RANGE_OPTIONS } from '../../config/navTabs';

const RANGE_SEGMENT_OPTIONS = TIME_RANGE_OPTIONS.map((r) => ({ value: r, label: r }));

/**
 * Global time-range filter — desktop bar, mobile scroll row, or compact quick toggle.
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
  const quickOptions = useMemo(() => {
    const values = [...new Set(timeRange === 'Custom' ? ['Custom'] : [timeRange, '1Y'])];
    return values.map((r) => ({ value: r, label: r }));
  }, [timeRange]);

  const segmentProps = {
    size: 'sm',
    dense: compact,
    value: timeRange,
    onChange: onTimeRangeChange,
    options: RANGE_SEGMENT_OPTIONS,
    'aria-label': 'Time range',
  };

  if (layout === 'mobile-quick') {
    return (
      <SegmentedControl
        {...segmentProps}
        options={quickOptions}
        aria-label="Quick time range"
        className={className}
      />
    );
  }

  if (layout === 'mobile-full') {
    return (
      <div className={className}>
        <div className={cn('overflow-x-auto no-scrollbar -mx-1 px-1', compact ? 'pb-1' : 'pb-3')}>
          <SegmentedControl
            {...segmentProps}
            className="min-w-max"
          />
        </div>
        {timeRange === 'Custom' && (
          <div
            className={cn(
              'flex items-center gap-2 bg-cdsurfacelow rounded-cdmd border border-cdborder/60',
              compact ? 'p-1.5 mb-2' : 'p-2 mb-4',
            )}
          >
            <NlDateInput
              value={customStart}
              onChange={onCustomStart}
              className={`${inputBaseClass} text-[10px] ${compact ? 'py-1' : 'py-1.5'} flex-1`}
              aria-label="Start date (dd-mm-jjjj)"
            />
            <span className="text-cdmuted text-[10px]">–</span>
            <NlDateInput
              value={customEnd}
              onChange={onCustomEnd}
              className={`${inputBaseClass} text-[10px] ${compact ? 'py-1' : 'py-1.5'} flex-1`}
              aria-label="End date (dd-mm-jjjj)"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <SegmentedControl {...segmentProps} />
      {timeRange === 'Custom' && (
        <div className={cn('flex justify-end animate-in fade-in slide-in-from-right-2', compact ? 'pb-0 mt-1' : 'pb-1.5 mt-2')}>
          <div
            className={cn(
              'flex items-center gap-2 bg-cdsurfacelow rounded-cdmd border border-cdborder/60',
              compact ? 'p-1' : 'p-1.5',
            )}
          >
            <NlDateInput
              value={customStart}
              onChange={onCustomStart}
              className={`${inputBaseClass} text-[10px] ${compact ? 'py-0.5' : 'py-1'}`}
              aria-label="Start date (dd-mm-jjjj)"
            />
            <span className="text-cdmuted text-[10px]">–</span>
            <NlDateInput
              value={customEnd}
              onChange={onCustomEnd}
              className={`${inputBaseClass} text-[10px] ${compact ? 'py-0.5' : 'py-1'}`}
              aria-label="End date (dd-mm-jjjj)"
            />
          </div>
        </div>
      )}
    </div>
  );
}
