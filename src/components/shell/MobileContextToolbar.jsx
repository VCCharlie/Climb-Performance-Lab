import React from 'react';
import TimeRangeToolbar from './TimeRangeToolbar';
import { TimeRangeCustomDates } from './TimeRangePresetPicker';
import DashboardTodaySyncButton from '../dashboard/DashboardTodaySyncButton';
import { TIME_RANGE_TAB_IDS } from '../../config/navTabs';

/**
 * Build inline header chrome for mobile (preset + sync buttons, optional custom dates row).
 */
export function buildMobileHeaderToolbar({
    activeTab,
    timeRange,
    onTimeRangeChange,
    customStart,
    customEnd,
    onCustomStart,
    onCustomEnd,
    syncTodayActivities,
    isTodaySyncBusy,
}) {
    const showTimeRange = TIME_RANGE_TAB_IDS.has(activeTab);
    const showSync = activeTab === 'dashboard' && Boolean(syncTodayActivities);
    const visible = showTimeRange || showSync;

    if (!visible) {
        return null;
    }

    const actions = (
        <div className="flex items-center gap-1.5 shrink-0">
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
    );

    const footer = showTimeRange && timeRange === 'Custom' ? (
        <TimeRangeCustomDates
            customStart={customStart}
            customEnd={customEnd}
            onCustomStart={onCustomStart}
            onCustomEnd={onCustomEnd}
            compact
        />
    ) : null;

    return { actions, footer };
}
