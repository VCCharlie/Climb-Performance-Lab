import React from 'react';
import NavTab from './NavTab';
import TimeRangeToolbar from './TimeRangeToolbar';
import MobileContextToolbar from './MobileContextToolbar';
import StickyTimeRangeToolbar from './StickyTimeRangeToolbar';
import { MAIN_NAV_TABS, TIME_RANGE_TAB_IDS } from '../../config/navTabs';
import { prefetchMainTabChunk } from '../../utils/prefetchTabChunks';
import { useTodayIntervalsSync } from '../../context/TodayIntervalsSyncContext';

/**
 * App shell navigation — desktop tab bar + mobile context toolbar (bottom tabs handle mobile nav).
 */
function MainNav({
  activeTab,
  onTabChange,
  timeRange,
  onTimeRangeChange,
  customStart,
  customEnd,
  onCustomStart,
  onCustomEnd,
  tabs = MAIN_NAV_TABS,
}) {
  const { syncTodayActivities, isTodaySyncBusy } = useTodayIntervalsSync();
  const showTimeRange = TIME_RANGE_TAB_IDS.has(activeTab);
  const showMobileSync = activeTab === 'dashboard' && Boolean(syncTodayActivities);
  const showMobileToolbar = showTimeRange || showMobileSync;

  const timeRangeProps = {
    timeRange,
    onTimeRangeChange,
    customStart,
    customEnd,
    onCustomStart,
    onCustomEnd,
  };

  return (
    <div className="relative mb-4">
      <StickyTimeRangeToolbar enabled mobileEnabled={showMobileToolbar}>
        <MobileContextToolbar
          activeTab={activeTab}
          showTimeRange={showTimeRange}
          syncTodayActivities={syncTodayActivities}
          isTodaySyncBusy={isTodaySyncBusy}
          {...timeRangeProps}
        />

        <div className="hidden md:block border-b border-cdborder/40 pb-1" data-pinned-main-nav="">
          <div className="flex items-center gap-2">
            <nav
              className="flex flex-1 flex-wrap items-center gap-x-0.5 gap-y-0 min-w-0"
              role="tablist"
              aria-label="Main navigation"
            >
              {tabs.map((item) => (
                <NavTab
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  isActive={activeTab === item.id}
                  onClick={() => onTabChange(item.id)}
                  onPrefetch={() => prefetchMainTabChunk(item.id)}
                />
              ))}
            </nav>
            {showTimeRange ? (
              <TimeRangeToolbar
                layout="desktop"
                {...timeRangeProps}
                compact
              />
            ) : null}
          </div>
        </div>
      </StickyTimeRangeToolbar>
    </div>
  );
}

export default React.memo(MainNav);
