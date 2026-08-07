import React, { Children, cloneElement, isValidElement, useEffect, useRef, useState } from 'react';
import FixedLayerPortal from '../ui/FixedLayerPortal';
import useAppHeaderOffset from '../../hooks/useAppHeaderOffset';
import { setPinnedTimeRangeHeight } from '../../utils/pinnedTimeRangeHeight';

const DESKTOP_NAV_QUERY = '(min-width: 768px)';

/** Solid shell matching the site header (opaque, no blur). */
const PINNED_SHELL_CLASS =
    'hidden md:block fixed left-0 right-0 z-[34] border-b border-cdborder/50 border-t border-cdsurface bg-cdsurface shadow-sm';

function isDesktopNavViewport() {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return false;
    }
    return window.matchMedia(DESKTOP_NAV_QUERY).matches;
}

function clonePinnedChild(children) {
    return Children.map(children, (child) => {
        if (!isValidElement(child)) return child;
        return cloneElement(child, { key: `${child.key ?? 'toolbar'}-pinned` });
    });
}

/**
 * Pins children (main nav + time-range toolbar) below the site header while scrolling.
 */
export default function StickyTimeRangeToolbar({ children, enabled = true }) {
    const headerOffset = useAppHeaderOffset();
    const sentinelRef = useRef(null);
    const pinnedBarRef = useRef(null);
    const [pinned, setPinned] = useState(false);

    useEffect(() => {
        if (!enabled) {
            setPinnedTimeRangeHeight(0);
            return undefined;
        }

        const sentinel = sentinelRef.current;
        if (!sentinel || typeof IntersectionObserver === 'undefined') return undefined;

        const updatePinned = (entry) => {
            if (!isDesktopNavViewport()) {
                setPinned(false);
                return;
            }
            setPinned(!entry.isIntersecting);
        };

        const observer = new IntersectionObserver(
            ([entry]) => updatePinned(entry),
            {
                root: null,
                rootMargin: `-${headerOffset}px 0px 0px 0px`,
                threshold: 0,
            },
        );

        const onViewportChange = () => {
            if (!isDesktopNavViewport()) {
                setPinned(false);
            }
        };

        observer.observe(sentinel);
        window.addEventListener('resize', onViewportChange);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', onViewportChange);
        };
    }, [enabled, headerOffset]);

    useEffect(() => {
        if (!enabled || !pinned || !isDesktopNavViewport()) {
            setPinnedTimeRangeHeight(0);
            return undefined;
        }

        const updateHeight = () => {
            const h = pinnedBarRef.current?.offsetHeight ?? 0;
            setPinnedTimeRangeHeight(h);
        };

        updateHeight();
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateHeight) : null;
        if (pinnedBarRef.current && ro) ro.observe(pinnedBarRef.current);

        return () => {
            ro?.disconnect();
            setPinnedTimeRangeHeight(0);
        };
    }, [enabled, pinned, children]);

    useEffect(() => {
        if (!enabled) setPinnedTimeRangeHeight(0);
    }, [enabled]);

    const showPinnedPortal = pinned && isDesktopNavViewport();

    if (!enabled) return null;

    return (
        <>
            <div ref={sentinelRef} className="h-px w-full -mb-px" aria-hidden />
            <div className={showPinnedPortal ? 'invisible' : undefined} aria-hidden={showPinnedPortal}>
                {children}
            </div>
            {showPinnedPortal && (
                <FixedLayerPortal>
                    <div
                        ref={pinnedBarRef}
                        data-pinned-main-nav=""
                        className={PINNED_SHELL_CLASS}
                        style={{ top: Math.max(0, headerOffset - 1) }}
                    >
                        <div className="max-w-7xl mx-auto px-3 py-1">
                            {clonePinnedChild(children)}
                        </div>
                    </div>
                </FixedLayerPortal>
            )}
        </>
    );
}
