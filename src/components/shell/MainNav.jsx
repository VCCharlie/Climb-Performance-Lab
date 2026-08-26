import React from 'react';
import { cn } from '../ui';
import MainNavTabs from './MainNavTabs';
import TimeRangeToolbar from './TimeRangeToolbar';
import StickyTimeRangeToolbar from './StickyTimeRangeToolbar';
import { TIME_RANGE_TAB_IDS } from '../../config/navTabs';

/**
 * Desktop navigation row below the header.
 * lg+: tabs live in the header banner — this row shows only the time-range filter when relevant.
 * md–lg: tabs + time range (unchanged tablet layout).
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
}) {
  const showTimeRange = TIME_RANGE_TAB_IDS.has(activeTab);

  const timeRangeProps = {
    timeRange,
    onTimeRangeChange,
    customStart,
    customEnd,
    onCustomStart,
    onCustomEnd,
  };

  return (
    <div className={cn('relative mb-4 hidden md:block', !showTimeRange && 'lg:hidden')}>
      <StickyTimeRangeToolbar enabled>
        <div className="border-b border-cdborder/40 pb-1" data-pinned-main-nav="">
          <div className="flex items-center gap-2">
            <MainNavTabs
              activeTab={activeTab}
              onTabChange={onTabChange}
              className="lg:hidden"
            />
            {showTimeRange ? (
              <TimeRangeToolbar
                layout="desktop"
                {...timeRangeProps}
                compact
                className="ml-auto"
              />
            ) : null}
          </div>
        </div>
      </StickyTimeRangeToolbar>
    </div>
  );
}

export default React.memo(MainNav);
