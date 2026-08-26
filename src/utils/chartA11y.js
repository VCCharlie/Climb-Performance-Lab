/**
 * Recharts 3.x enables accessibilityLayer by default (tabIndex on SVG → sticky focus rings on touch).
 * Pass these props on every chart root to keep keyboard UX on buttons while charts stay non-focusable.
 */
export const CHART_A11Y_PROPS = Object.freeze({
    accessibilityLayer: false,
    // Prevent Android/WebKit from drawing native SVG focus rings on tap.
    focusable: false,
});
