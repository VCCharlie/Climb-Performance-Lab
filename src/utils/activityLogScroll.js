/** @type {{ scrollToId?: (id: string) => void } | null} */
let scroller = null;

/**
 * Register the Activity Log scroll handler (table virtualizer or card list container).
 * @param {{ scrollToId: (id: string) => void }} handler
 */
export function registerActivityLogScroller(handler) {
    scroller = handler;
}

/** Clear scroll handler on unmount. */
export function unregisterActivityLogScroller() {
    scroller = null;
}

/**
 * Scroll the activity log so the row with `id` (e.g. month-2024-January) is near the top.
 * @param {string} id
 */
export function scrollActivityLogToId(id) {
    scroller?.scrollToId?.(id);
}
