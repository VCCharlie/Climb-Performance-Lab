/**
 * When to use Activity Log card layout instead of the wide table.
 *
 * - Up to Tailwind `lg` (1023px): phones, most tablets, phone landscape (~844px)
 * - Touch devices with coarse pointer up to 1279px: PWAs / tablets in landscape
 */
export const CARD_LAYOUT_MEDIA_QUERY =
    '(max-width: 1023px), ((hover: none) and (pointer: coarse) and (max-width: 1279px))';

export function getCardLayoutMediaQueryList() {
    if (typeof window === 'undefined') return null;
    return window.matchMedia(CARD_LAYOUT_MEDIA_QUERY);
}

export function prefersActivityCardLayout() {
    return getCardLayoutMediaQueryList()?.matches ?? false;
}

export function subscribeCardLayoutPreference(callback) {
    const mq = getCardLayoutMediaQueryList();
    if (!mq) return () => {};
    mq.addEventListener('change', callback);
    return () => mq.removeEventListener('change', callback);
}
