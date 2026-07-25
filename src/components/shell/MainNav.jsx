import React, { useEffect, useRef, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { Menu, X, ChevronRight } from 'lucide-react';
import { Button, cn } from '../ui';
import NavTab from './NavTab';
import TimeRangeToolbar from './TimeRangeToolbar';
import { MAIN_NAV_TABS } from '../../config/navTabs';
import { prefetchMainTabChunk } from '../../utils/prefetchTabChunks';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { computeAnchoredOverlayStyle } from '../../utils/anchoredOverlayPosition';

/**
 * App shell navigation — mobile menu + desktop primary nav bar with time-range toolbar.
 */
export default function MainNav({
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
  const menuTriggerRef = useRef(null);
  const menuPanelId = useId();

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

  useEffect(() => {
    if (!isMobileMenuOpen) {
      setMobilePanelStyle(null);
      return undefined;
    }

    const update = () => {
      const el = menuTriggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const anchored = computeAnchoredOverlayStyle(rect, {
        minWidth: Math.min(window.innerWidth - 16, 480),
        align: 'start',
        maxHeightCap: Math.round(window.innerHeight * 0.65),
      });
      const { placement: _placement, ...rest } = anchored;
      setMobilePanelStyle({
        ...rest,
        left: '12px',
        right: '12px',
        width: 'auto',
        zIndex: 150,
      });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [isMobileMenuOpen]);

  return (
    <div className="relative mb-4">
      {/* Mobile: menu trigger + quick range */}
      <div className="flex items-center gap-2 mb-3 md:hidden">
        <Button
          ref={menuTriggerRef}
          type="button"
          variant="tonal"
          className="flex-1 justify-start font-semibold min-h-11"
          onClick={() => onMobileMenuOpenChange(!isMobileMenuOpen)}
          aria-expanded={isMobileMenuOpen}
          aria-haspopup="true"
          aria-controls={menuPanelId}
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

      {/* Mobile: portaled menu + scrim (avoids parent overflow clipping) */}
      {isMobileMenuOpen && typeof document !== 'undefined' && createPortal(
        <>
          <button
            type="button"
            className="fixed inset-0 z-[140] bg-cdscrim md:hidden cd-transition"
            aria-label="Close navigation menu"
            onClick={() => onMobileMenuOpenChange(false)}
          />
          {mobilePanelStyle && (
          <nav
            id={menuPanelId}
            style={mobilePanelStyle}
            className="md:hidden fixed z-[150] overflow-y-auto custom-scrollbar rounded-cdxl border border-cdborder/60 bg-cdsurface shadow-lg animate-in fade-in slide-in-from-top-2 duration-200"
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
                onPrefetch={() => prefetchMainTabChunk(item.id)}
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
