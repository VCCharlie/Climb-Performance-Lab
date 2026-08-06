import React, { Children, cloneElement, isValidElement, useEffect, useRef, useState } from 'react';
import FixedLayerPortal from '../ui/FixedLayerPortal';
import useAppHeaderOffset from '../../hooks/useAppHeaderOffset';
import { setPinnedTimeRangeHeight } from '../../utils/pinnedTimeRangeHeight';

/** Solid shell matching the site header (opaque, no blur). */
const PINNED_SHELL_CLASS =
    'fixed left-0 right-0 z-[34] border-b border-cdborder/50 bg-cdsurface shadow-sm';

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

        const observer = new IntersectionObserver(
            ([entry]) => setPinned(!entry.isIntersecting),
            {
                root: null,
                rootMargin: `-${headerOffset}px 0px 0px 0px`,
                threshold: 0,
            },
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [enabled, headerOffset]);

    useEffect(() => {
        if (!enabled || !pinned) {
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

    if (!enabled) return null;

    return (
        <>
            <div ref={sentinelRef} className="h-px w-full -mb-px" aria-hidden />
            <div className={pinned ? 'invisible' : undefined} aria-hidden={pinned}>
                {children}
            </div>
            {pinned && (
                <FixedLayerPortal>
                    <div
                        ref={pinnedBarRef}
                        data-pinned-main-nav=""
                        className={PINNED_SHELL_CLASS}
                        style={{ top: headerOffset }}
                    >
                        <div className="max-w-7xl mx-auto px-3 py-1.5">
                            {clonePinnedChild(children)}
                        </div>
                    </div>
                </FixedLayerPortal>
            )}
        </>
    );
}
