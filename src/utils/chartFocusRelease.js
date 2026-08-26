/** Recharts nodes that receive sticky pointer focus and show browser outline rings. */
export const RECHARTS_FOCUS_SELECTORS = [
    '.recharts-surface',
    '.recharts-wrapper',
    '.recharts-tooltip-wrapper',
    '.recharts-default-tooltip',
    '.recharts-responsive-container',
].join(', ');

const REAL_CONTROL_SELECTOR = 'button, a[href], input, select, textarea, [role="button"], [role="link"]';

function isRealControl(element) {
    if (!(element instanceof Element)) return false;
    return element.matches(REAL_CONTROL_SELECTOR);
}

/**
 * True when focus landed on a chart surface/tooltip wrapper — not on a real button/link inside the card.
 */
export function shouldReleaseChartFocus(element) {
    if (!(element instanceof Element)) return false;
    if (isRealControl(element)) return false;

    if (element.matches(`${RECHARTS_FOCUS_SELECTORS}, svg`)) return true;
    if (element.closest(RECHARTS_FOCUS_SELECTORS)) return true;

    // Recharts tooltip uses tabindex=-1 on an HTML div inside SVG (Escape key) — still shows focus ring on tap.
    const host = element.closest('.cd-chart-host');
    if (host && element.hasAttribute('tabindex') && element.closest('.recharts-wrapper')) {
        return true;
    }

    return false;
}

export function releaseChartFocus(element) {
    if (!(element instanceof Element)) return;
    if (!shouldReleaseChartFocus(element)) return;
    element.blur();
}

/**
 * Strip focusability Recharts adds after interaction (tooltip div, surface).
 * Only writes attributes when values differ — avoids unnecessary DOM mutations.
 */
export function stripChartFocusability(root) {
    if (!(root instanceof Element)) return;

    root.querySelectorAll('.recharts-surface, .recharts-wrapper [tabindex]').forEach((node) => {
        if (!(node instanceof Element) || node.matches(REAL_CONTROL_SELECTOR)) return;

        if (node instanceof SVGElement) {
            if (node.getAttribute('focusable') !== 'false') {
                node.setAttribute('focusable', 'false');
            }
            if (node.hasAttribute('tabindex')) {
                node.removeAttribute('tabindex');
            }
            return;
        }

        if (node.getAttribute('tabindex') !== '-1') {
            node.setAttribute('tabindex', '-1');
        }
    });
}
