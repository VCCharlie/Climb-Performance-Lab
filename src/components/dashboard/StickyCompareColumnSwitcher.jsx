import React, { useEffect, useRef, useState } from 'react';
import CompareColumnSwitcher from './CompareColumnSwitcher';
import useAppHeaderOffset from '../../hooks/useAppHeaderOffset';

/**
 * Column 1 / 2 toggle that pins below the site header while scrolling (mobile/tablet).
 * Uses a fixed clone because CSS sticky breaks inside animated/transformed ancestors.
 */
export default function StickyCompareColumnSwitcher(props) {
    const headerOffset = useAppHeaderOffset();
    const sentinelRef = useRef(null);
    const [pinned, setPinned] = useState(false);

    useEffect(() => {
        if (!props.showCompare) return undefined;

        const sentinel = sentinelRef.current;
        if (!sentinel) return undefined;

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
    }, [props.showCompare, headerOffset]);

    if (!props.showCompare) return null;

    const isPinned = pinned;
    const switcher = <CompareColumnSwitcher {...props} />;

    return (
        <>
            <div ref={sentinelRef} className="lg:hidden h-px w-full -mb-px" aria-hidden />
            <div
                className={[
                    'lg:hidden py-2 -mx-1 px-1',
                    pinned ? 'invisible' : '',
                ].join(' ')}
                aria-hidden={isPinned}
            >
                {switcher}
            </div>
            {isPinned && (
                <div
                    className="lg:hidden fixed left-0 right-0 z-[35] border-b border-cdborder/60 bg-cdsurface/95 backdrop-blur-md shadow-md px-3 py-2"
                    style={{ top: headerOffset }}
                >
                    <div className="max-w-7xl mx-auto">
                        {switcher}
                    </div>
                </div>
            )}
        </>
    );
}
