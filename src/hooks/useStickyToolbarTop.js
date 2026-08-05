import { useSyncExternalStore } from 'react';
import useAppHeaderOffset from './useAppHeaderOffset';
import { readPinnedTimeRangeHeight } from '../utils/pinnedTimeRangeHeight';

function subscribePinnedToolbarHeight(callback) {
    window.addEventListener('cpl-pinned-toolbar-change', callback);
    return () => window.removeEventListener('cpl-pinned-toolbar-change', callback);
}

/**
 * Pixel offset from viewport top for secondary sticky toolbars (below header + pinned time-range bar).
 */
export default function useStickyToolbarTop() {
    const headerOffset = useAppHeaderOffset();
    const pinnedToolbarHeight = useSyncExternalStore(
        subscribePinnedToolbarHeight,
        readPinnedTimeRangeHeight,
        () => 0,
    );
    return headerOffset + pinnedToolbarHeight;
}
