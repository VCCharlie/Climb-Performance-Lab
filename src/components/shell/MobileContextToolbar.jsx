import React from 'react';
import TimeRangeToolbar from './TimeRangeToolbar';
import { TimeRangeCustomDates } from './TimeRangePresetPicker';
import DashboardTodaySyncButton from '../dashboard/DashboardTodaySyncButton';
import { TIME_RANGE_TAB_IDS, INTERVALS_QUICK_SYNC_TAB_IDS } from '../../config/navTabs';

function headerToolbarVisibility(activeTab, syncTodayActivities) {
    const showTimeRange = TIME_RANGE_TAB_IDS.has(activeTab);
    const showSync = INTERVALS_QUICK_SYNC_TAB_IDS.has(activeTab) && Boolean(syncTodayActivities);
    return { showTimeRange, showSync, visible: showTimeRange || showSync };
}

function buildContextToolbarActions({
    showTimeRange,
    showSync,
    layout,
    timeRange,
    onTimeRangeChange,
    customStart,
    customEnd,
    onCustomStart,
    onCustomEnd,
    syncTodayActivities,
    isTodaySyncBusy,
    syncButtonSize = 'sm',
    hideCustomDates = false,
}) {
    return (
        <div className="flex items-center gap-1.5 shrink-0">
            {showTimeRange ? (
                <TimeRangeToolbar
                    layout={layout}
                    timeRange={timeRange}
                    onTimeRangeChange={onTimeRangeChange}
                    customStart={customStart}
                    customEnd={customEnd}
                    onCustomStart={onCustomStart}
                    onCustomEnd={onCustomEnd}
                    compact
                    hideCustomDates={hideCustomDates}
                />
            ) : null}
            {showSync ? (
                <DashboardTodaySyncButton
                    onSync={syncTodayActivities}
                    isBusy={isTodaySyncBusy}
                    size={syncButtonSize}
                />
            ) : null}
        </div>
    );
}

function buildCustomDatesFooter(showTimeRange, timeRange, customStart, customEnd, onCustomStart, onCustomEnd) {
    if (!showTimeRange || timeRange !== 'Custom') {
        return null;
    }

    return (
        <TimeRangeCustomDates
            customStart={customStart}
            customEnd={customEnd}
            onCustomStart={onCustomStart}
            onCustomEnd={onCustomEnd}
            compact
        />
    );
}

/**
 * Build inline header chrome for mobile (preset + sync buttons, optional custom dates row).
 */
export function buildMobileHeaderToolbar(props) {
    const { showTimeRange, showSync, visible } = headerToolbarVisibility(
        props.activeTab,
        props.syncTodayActivities,
    );

    if (!visible) {
        return null;
    }

    return {
        actions: buildContextToolbarActions({
            showTimeRange,
            showSync,
            layout: 'mobile-inline',
            ...props,
        }),
        footer: buildCustomDatesFooter(
            showTimeRange,
            props.timeRange,
            props.customStart,
            props.customEnd,
            props.onCustomStart,
            props.onCustomEnd,
        ),
    };
}

/**
 * Build header chrome for desktop lg+ (period preset + sync today, optional custom dates row).
 */
export function buildDesktopHeaderToolbar(props) {
    const { showTimeRange, showSync, visible } = headerToolbarVisibility(
        props.activeTab,
        props.syncTodayActivities,
    );

    if (!visible) {
        return null;
    }

    return {
        actions: buildContextToolbarActions({
            showTimeRange,
            showSync,
            layout: 'desktop',
            syncButtonSize: 'sm',
            hideCustomDates: true,
            ...props,
        }),
        footer: buildCustomDatesFooter(
            showTimeRange,
            props.timeRange,
            props.customStart,
            props.customEnd,
            props.onCustomStart,
            props.onCustomEnd,
        ),
    };
}
