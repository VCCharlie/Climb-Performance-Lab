/** CSS variable for the height of the pinned time-range toolbar (0 when not pinned). */
export const PINNED_TIME_RANGE_HEIGHT_VAR = '--cpl-pinned-time-range-height';

export function setPinnedTimeRangeHeight(px) {
    if (typeof document === 'undefined') return;
    if (!px || px <= 0) {
        document.documentElement.style.removeProperty(PINNED_TIME_RANGE_HEIGHT_VAR);
    } else {
        document.documentElement.style.setProperty(PINNED_TIME_RANGE_HEIGHT_VAR, `${px}px`);
    }
    window.dispatchEvent(new Event('cpl-pinned-toolbar-change'));
}

export function readPinnedTimeRangeHeight() {
    if (typeof document === 'undefined') return 0;
    const raw = getComputedStyle(document.documentElement).getPropertyValue(PINNED_TIME_RANGE_HEIGHT_VAR);
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : 0;
}
