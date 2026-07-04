import { useSyncExternalStore } from 'react';
import {
    CARD_LAYOUT_MEDIA_QUERY,
    prefersActivityCardLayout,
    subscribeCardLayoutPreference,
    getCardLayoutMediaQueryList,
} from '../utils/activityLogLayout';

function subscribeToMediaQuery(query, callback) {
    const mq = window.matchMedia(query);
    mq.addEventListener('change', callback);
    return () => mq.removeEventListener('change', callback);
}

function getMediaQuerySnapshot(query) {
    return window.matchMedia(query).matches;
}

/**
 * Subscribe to a CSS media query (useSyncExternalStore — reliable in PWAs).
 * @param {string} query
 * @returns {boolean}
 */
export default function useMediaQuery(query) {
    return useSyncExternalStore(
        (callback) => subscribeToMediaQuery(query, callback),
        () => getMediaQuerySnapshot(query),
        () => false,
    );
}

/** Card layout for Activity Log (wide touch + narrow viewports). */
export function useActivityCardLayout() {
    return useSyncExternalStore(
        subscribeCardLayoutPreference,
        prefersActivityCardLayout,
        () => false,
    );
}

export { CARD_LAYOUT_MEDIA_QUERY, getCardLayoutMediaQueryList };
