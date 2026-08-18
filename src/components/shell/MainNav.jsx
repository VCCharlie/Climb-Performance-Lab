import React from 'react';
import NavTab from './NavTab';
import NavMoreMenu from './NavMoreMenu';
import TimeRangeToolbar from './TimeRangeToolbar';
import StickyTimeRangeToolbar from './StickyTimeRangeToolbar';
import { PRIMARY_NAV_TABS, TIME_RANGE_TAB_IDS } from '../../config/navTabs';
import { prefetchMainTabChunk } from '../../utils/prefetchTabChunks';

/**
 * Desktop main navigation — four primary hubs + More menu (parity with mobile bottom nav).
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
    <div className="relative mb-4 hidden md:block">
      <StickyTimeRangeToolbar enabled>
        <div className="border-b border-cdborder/40 pb-1" data-pinned-main-nav="">
          <div className="flex items-center gap-2">
            <nav
              className="flex flex-1 flex-wrap items-center gap-x-0.5 gap-y-0 min-w-0"
              role="tablist"
              aria-label="Main navigation"
            >
              {PRIMARY_NAV_TABS.map((item) => (
                <NavTab
                  key={item.id}
                  id={`main-tab-${item.id}`}
                  ariaControls={`main-tabpanel-${item.id}`}
                  icon={item.icon}
                  label={item.label}
                  isActive={activeTab === item.id}
                  onClick={() => onTabChange(item.id)}
                  onPrefetch={() => prefetchMainTabChunk(item.id)}
                />
              ))}
              <NavMoreMenu activeTab={activeTab} onTabChange={onTabChange} />
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
