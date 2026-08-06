import React, { useCallback, useEffect, useRef, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { Menu, X, ChevronRight, RefreshCw } from 'lucide-react';
import { Button, cn } from '../ui';
import NavTab from './NavTab';
import TimeRangeToolbar from './TimeRangeToolbar';
import StickyTimeRangeToolbar from './StickyTimeRangeToolbar';
import { MAIN_NAV_TABS, TIME_RANGE_TAB_IDS } from '../../config/navTabs';
import { prefetchMainTabChunk } from '../../utils/prefetchTabChunks';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useTodayIntervalsSync } from '../../context/TodayIntervalsSyncContext';

const MOBILE_MENU_Z = 200;

function measureMobileNavBottom() {
    if (typeof document === 'undefined') return 0;
    const pinned = document.querySelector('[data-pinned-main-nav]');
    const chrome = pinned || document.querySelector('[data-mobile-nav-chrome]');
    if (!chrome) return 0;
    return chrome.getBoundingClientRect().bottom;
}

/**
 * App shell navigation — sticky mobile context row + desktop tabs with inline time presets.
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
  const { syncTodayActivities, isTodaySyncBusy } = useTodayIntervalsSync();
  const mobileLabel = tabs.find((t) => t.id === activeTab)?.label || 'Menu';
  const menuTriggerRef = useRef(null);
  const menuPanelId = useId();
  const showTimeRange = TIME_RANGE_TAB_IDS.has(activeTab);

  const timeRangeProps = {
    timeRange,
    onTimeRangeChange,
    customStart,
    customEnd,
    onCustomStart,
    onCustomEnd,
  };

  useBodyScrollLock(isMobileMenuOpen);

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onMobileMenuOpenChange(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isMobileMenuOpen, onMobileMenuOpenChange]);

  const selectTab = (tabId) => {
    onTabChange(tabId);
    onMobileMenuOpenChange(false);
  };

  const [mobilePanelStyle, setMobilePanelStyle] = useState(null);

  const updateMobileMenuPosition = useCallback(() => {
    const bottom = measureMobileNavBottom();
    if (!bottom) return;
    const top = bottom + 4;
    setMobilePanelStyle({
      position: 'fixed',
      top: `${top}px`,
      left: '12px',
      right: '12px',
      width: 'auto',
      zIndex: MOBILE_MENU_Z,
      maxHeight: `min(65vh, calc(100vh - ${Math.round(top + 12)}px))`,
      overflowY: 'auto',
    });
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      setMobilePanelStyle(null);
      return undefined;
    }

    updateMobileMenuPosition();
    window.addEventListener('resize', updateMobileMenuPosition);
    window.addEventListener('scroll', updateMobileMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateMobileMenuPosition);
      window.removeEventListener('scroll', updateMobileMenuPosition, true);
    };
  }, [isMobileMenuOpen, updateMobileMenuPosition]);

  const toggleMobileMenu = () => {
    if (!isMobileMenuOpen) {
      updateMobileMenuPosition();
    }
    onMobileMenuOpenChange(!isMobileMenuOpen);
  };

  return (
    <div className="relative mb-4">
      <StickyTimeRangeToolbar enabled>
        {/* Mobile: menu trigger + optional time presets (sticky together) */}
        <div className="md:hidden pb-2" data-mobile-nav-chrome="">
          <div className="flex items-center gap-2 mb-2">
            <Button
              ref={menuTriggerRef}
              type="button"
              variant="tonal"
              className="flex-1 justify-start font-semibold min-h-11"
              onClick={toggleMobileMenu}
              aria-expanded={isMobileMenuOpen}
              aria-haspopup="true"
              aria-controls={menuPanelId}
            >
              {isMobileMenuOpen ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
              {mobileLabel}
            </Button>
            {activeTab === 'dashboard' && syncTodayActivities && (
              <button
                type="button"
                onClick={syncTodayActivities}
                disabled={isTodaySyncBusy}
                className="flex items-center justify-center w-11 h-11 shrink-0 rounded-lg border border-cdborder bg-cdsurface text-cdmuted hover:text-green-400 hover:border-green-500/50 cd-transition focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none disabled:opacity-50"
                title="Sync today's activities from Intervals.icu"
                aria-label="Sync today's activities from Intervals.icu"
              >
                <RefreshCw size={18} className={isTodaySyncBusy ? 'animate-spin' : ''} aria-hidden />
              </button>
            )}
          </div>
          {showTimeRange ? (
            <TimeRangeToolbar
              layout="mobile-full"
              {...timeRangeProps}
              compact
            />
          ) : null}
        </div>

        {/* Desktop: tabs left, time presets right on one row (sticky together) */}
        <div className="hidden md:block border-b border-cdborder/40 pb-1">
          <div className="flex items-center gap-3 min-h-[2.75rem]">
            <nav
              className="flex flex-1 min-w-0 overflow-x-auto gap-0.5 no-scrollbar"
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
              <>
                <div className="w-px self-stretch bg-cdborder/50 shrink-0" aria-hidden />
                <TimeRangeToolbar
                  layout="desktop"
                  {...timeRangeProps}
                  compact
                  className="shrink-0 max-w-[min(100%,32rem)]"
                />
              </>
            ) : null}
          </div>
        </div>
      </StickyTimeRangeToolbar>

      {/* Mobile: portaled menu + scrim (avoids parent overflow clipping) */}
      {isMobileMenuOpen && typeof document !== 'undefined' && createPortal(
        <>
          <button
            type="button"
            className="fixed inset-0 z-[190] bg-cdscrim md:hidden cd-transition"
            aria-label="Close navigation menu"
            onClick={() => onMobileMenuOpenChange(false)}
          />
          {mobilePanelStyle && (
          <nav
            id={menuPanelId}
            style={mobilePanelStyle}
            className="md:hidden fixed overflow-y-auto custom-scrollbar rounded-cdxl border border-cdborder/60 bg-cdsurface shadow-lg animate-in fade-in slide-in-from-top-2 duration-200"
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
                  onMouseEnter={() => prefetchMainTabChunk(item.id)}
                  onFocus={() => prefetchMainTabChunk(item.id)}
                  onPointerDown={() => prefetchMainTabChunk(item.id)}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 min-h-11 py-3 text-sm font-medium cd-transition cd-focus-ring',
                    isActive
                      ? 'bg-cdprimarycontainer text-cdonprimarycontainer'
                      : 'text-cdtext hover:bg-cdsurfacelow active:bg-cdsurfacehigh',
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
          )}
        </>,
        document.body,
      )}
    </div>
  );
}

export default React.memo(MainNav);
