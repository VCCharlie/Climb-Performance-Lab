import React, { useMemo } from 'react';
import NlDateInput from '../NlDateInput';
import { SegmentedControl, inputBaseClass } from '../ui';
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
}) {
  const quickOptions = useMemo(() => {
    const values = [...new Set(timeRange === 'Custom' ? ['Custom'] : [timeRange, '1Y'])];
    return values.map((r) => ({ value: r, label: r }));
  }, [timeRange]);

  if (layout === 'mobile-quick') {
    return (
      <SegmentedControl
        size="sm"
        value={timeRange}
        onChange={onTimeRangeChange}
        aria-label="Quick time range"
        options={quickOptions}
        className={className}
      />
    );
  }

  if (layout === 'mobile-full') {
    return (
      <div className={className}>
        <div className="overflow-x-auto no-scrollbar -mx-1 px-1 pb-3">
          <SegmentedControl
            size="sm"
            value={timeRange}
            onChange={onTimeRangeChange}
            aria-label="Time range"
            options={RANGE_SEGMENT_OPTIONS}
            className="min-w-max"
          />
        </div>
        {timeRange === 'Custom' && (
          <div className="flex items-center gap-2 bg-cdsurfacelow p-2 rounded-cdmd border border-cdborder/60 mb-4">
            <NlDateInput
              value={customStart}
              onChange={onCustomStart}
              className={`${inputBaseClass} text-[10px] py-1.5 flex-1`}
              aria-label="Start date (dd/mm/yyyy)"
            />
            <span className="text-cdmuted text-[10px]">–</span>
            <NlDateInput
              value={customEnd}
              onChange={onCustomEnd}
              className={`${inputBaseClass} text-[10px] py-1.5 flex-1`}
              aria-label="End date (dd/mm/yyyy)"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <SegmentedControl
        size="sm"
        value={timeRange}
        onChange={onTimeRangeChange}
        aria-label="Time range"
        options={RANGE_SEGMENT_OPTIONS}
      />
      {timeRange === 'Custom' && (
        <div className="flex justify-end pb-1.5 mt-2 animate-in fade-in slide-in-from-right-2">
          <div className="flex items-center gap-2 bg-cdsurfacelow p-1.5 rounded-cdmd border border-cdborder/60">
            <NlDateInput
              value={customStart}
              onChange={onCustomStart}
              className={`${inputBaseClass} text-[10px] py-1`}
              aria-label="Start date (dd/mm/yyyy)"
            />
            <span className="text-cdmuted text-[10px]">–</span>
            <NlDateInput
              value={customEnd}
              onChange={onCustomEnd}
              className={`${inputBaseClass} text-[10px] py-1`}
              aria-label="End date (dd/mm/yyyy)"
            />
          </div>
        </div>
      )}
    </div>
  );
}
