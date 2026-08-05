import React from 'react';
import CompareColumnSwitcher from './CompareColumnSwitcher';

/**
 * Column 1 / 2 toggle that stays visible while scrolling long comparison lists (mobile/tablet).
 */
export default function StickyCompareColumnSwitcher(props) {
    if (!props.showCompare) return null;

    return (
        <div
            className={[
                'lg:hidden sticky z-20 -mx-1 px-1 py-2',
                'top-[calc(env(safe-area-inset-top,0px)+0.25rem)]',
                'bg-cdsurface/95 backdrop-blur-sm',
                'border-y border-cdborder/50 shadow-sm',
            ].join(' ')}
        >
            <CompareColumnSwitcher {...props} />
        </div>
    );
}
