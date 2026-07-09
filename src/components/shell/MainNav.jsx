import React from 'react';
import { Menu, X, ChevronRight } from 'lucide-react';
import { Button, cn } from '../ui';
import NavTab from './NavTab';
import TimeRangeToolbar from './TimeRangeToolbar';
import { MAIN_NAV_TABS } from '../../config/navTabs';

/**
 * App shell navigation — mobile menu + desktop primary nav bar with time-range toolbar.
 * ⚡ Bolt: React.memo skips re-render when tab/time-range props are unchanged (e.g. Firestore activity sync).
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
  isMobileMenuOpen,
  onMobileMenuOpenChange,
  tabs = MAIN_NAV_TABS,
}) {
  const mobileLabel = tabs.find((t) => t.id === activeTab)?.label || 'Menu';

  const selectTab = (tabId) => {
    onTabChange(tabId);
    onMobileMenuOpenChange(false);
  };

  return (
    <div className="relative mb-4">
      {/* Mobile: menu trigger + quick range */}
      <div className="flex items-center gap-2 mb-3 md:hidden">
        <Button
          type="button"
          variant="tonal"
          className="flex-1 justify-start font-semibold"
          onClick={() => onMobileMenuOpenChange(!isMobileMenuOpen)}
          aria-expanded={isMobileMenuOpen}
          aria-haspopup="true"
        >
          {isMobileMenuOpen ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
          {mobileLabel}
        </Button>
        <TimeRangeToolbar
          layout="mobile-quick"
          timeRange={timeRange}
          onTimeRangeChange={onTimeRangeChange}
          customStart={customStart}
          customEnd={customEnd}
          onCustomStart={onCustomStart}
          onCustomEnd={onCustomEnd}
        />
      </div>

      <TimeRangeToolbar
        layout="mobile-full"
        timeRange={timeRange}
        onTimeRangeChange={onTimeRangeChange}
        customStart={customStart}
        customEnd={customEnd}
        onCustomStart={onCustomStart}
        onCustomEnd={onCustomEnd}
        className="md:hidden"
      />

      {/* Mobile: slide-down menu with scrim */}
      {isMobileMenuOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-cdscrim md:hidden cd-transition"
            aria-label="Close navigation menu"
            onClick={() => onMobileMenuOpenChange(false)}
          />
          <nav
            className="md:hidden absolute top-full left-0 right-0 z-50 mt-1 overflow-hidden rounded-cdxl border border-cdborder/60 bg-cdsurface shadow-lg"
            aria-label="Main navigation"
          >
            {tabs.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectTab(item.id)}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-3 text-sm font-medium cd-transition cd-focus-ring',
                    isActive
                      ? 'bg-cdprimarycontainer text-cdonprimarycontainer'
                      : 'text-cdtext hover:bg-cdsurfacelow',
                  )}
                >
                  <Icon className={cn('w-4 h-4 shrink-0', isActive && 'text-cdprimary')} aria-hidden />
                  {item.label}
                  {(item.id === 'training' || item.id === 'race') && (
                    <ChevronRight size={12} className="ml-auto text-cdmuted" aria-hidden />
                  )}
                </button>
              );
            })}
          </nav>
        </>
      )}

      {/* Desktop: primary nav + time range */}
      <div className="hidden md:block border-b border-cdborder/40 mb-4">
        <div className="flex items-end justify-between gap-4 pb-1">
          <nav
            className="flex overflow-x-auto gap-0.5 no-scrollbar"
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
              />
            ))}
          </nav>
          <TimeRangeToolbar
            layout="desktop"
            timeRange={timeRange}
            onTimeRangeChange={onTimeRangeChange}
            customStart={customStart}
            customEnd={customEnd}
            onCustomStart={onCustomStart}
            onCustomEnd={onCustomEnd}
            className="shrink-0"
          />
        </div>
      </div>
    </div>
  );
}

export default React.memo(MainNav);
