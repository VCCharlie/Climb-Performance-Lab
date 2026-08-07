import React from 'react';
import TimeRangeToolbar from './TimeRangeToolbar';
import { TimeRangeCustomDates } from './TimeRangePresetPicker';
import DashboardTodaySyncButton from '../dashboard/DashboardTodaySyncButton';

/**
 * Mobile-only action row below the site header — time-range preset and today's sync.
 * Shown on tabs where at least one control applies; navigation uses bottom tabs instead.
 */
export default function MobileContextToolbar({
    activeTab,
    timeRange,
    onTimeRangeChange,
    customStart,
    customEnd,
    onCustomStart,
    onCustomEnd,
    showTimeRange,
    syncTodayActivities,
    isTodaySyncBusy,
}) {
    const showSync = activeTab === 'dashboard' && Boolean(syncTodayActivities);
    const visible = showTimeRange || showSync;

    if (!visible) return null;

    return (
        <div className="md:hidden pb-2" data-mobile-nav-chrome="">
            <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-end gap-2">
                    {showTimeRange ? (
                        <TimeRangeToolbar
                            layout="mobile-inline"
                            timeRange={timeRange}
                            onTimeRangeChange={onTimeRangeChange}
                            customStart={customStart}
                            customEnd={customEnd}
                            onCustomStart={onCustomStart}
                            onCustomEnd={onCustomEnd}
                            compact
                        />
                    ) : null}
                    {showSync ? (
                        <DashboardTodaySyncButton
                            onSync={syncTodayActivities}
                            isBusy={isTodaySyncBusy}
                            size="sm"
                        />
                    ) : null}
                </div>
                {showTimeRange && timeRange === 'Custom' ? (
                    <TimeRangeCustomDates
                        customStart={customStart}
                        customEnd={customEnd}
                        onCustomStart={onCustomStart}
                        onCustomEnd={onCustomEnd}
                        compact
                    />
                ) : null}
            </div>
        </div>
    );
}
