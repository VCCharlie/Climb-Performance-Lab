import { describe, it, expect } from 'vitest';
import { stripChartFocusability } from '../../utils/chartFocusRelease';

/** Old ChartHost strip — always wrote tabindex (even when unchanged), re-triggering attribute observer. */
function oldUnconditionalStrip(root) {
    root.querySelectorAll('.recharts-surface, .recharts-wrapper [tabindex]').forEach((node) => {
        if (node instanceof Element) {
            node.setAttribute('tabindex', '-1');
            if (node instanceof SVGElement) {
                node.setAttribute('focusable', 'false');
            }
        }
    });
    const surface = root.querySelector('.recharts-surface');
    if (surface instanceof SVGElement) {
        surface.removeAttribute('tabindex');
        surface.setAttribute('focusable', 'false');
    }
}

function buildChartHostDom() {
    const host = document.createElement('div');
    host.className = 'cd-chart-host';
    const wrapper = document.createElement('div');
    wrapper.className = 'recharts-wrapper';
    const surface = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    surface.setAttribute('class', 'recharts-surface');
    surface.setAttribute('tabindex', '0');
    const tooltipDiv = document.createElement('div');
    tooltipDiv.setAttribute('tabindex', '0');
    wrapper.appendChild(surface);
    wrapper.appendChild(tooltipDiv);
    host.appendChild(wrapper);
    return host;
}

/**
 * Regression: PR #567/#568 observed tabindex + stripChartFocusability caused a
 * MutationObserver feedback loop that froze the main thread before charts could paint.
 */
describe('ChartHost MutationObserver regression', () => {
    it('old observer pattern re-fires on every tabindex mutation (feedback loop)', async () => {
        const host = buildChartHostDom();
        let callbackCount = 0;
        const observer = new MutationObserver(() => {
            callbackCount += 1;
            if (callbackCount > 100) {
                observer.disconnect();
                return;
            }
            oldUnconditionalStrip(host);
        });
        observer.observe(host, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['tabindex'],
        });

        oldUnconditionalStrip(host);

        await new Promise((resolve) => {
            const deadline = Date.now() + 500;
            const tick = () => {
                if (callbackCount > 5 || Date.now() >= deadline) {
                    resolve();
                    return;
                }
                setTimeout(tick, 0);
            };
            tick();
        });

        observer.disconnect();
        expect(callbackCount).toBeGreaterThan(5);
    });

    it('fixed pattern (childList only + idempotent strip) completes without observer churn', () => {
        const host = buildChartHostDom();
        let callbackCount = 0;
        const strippingRef = { current: false };

        const runStrip = () => {
            if (strippingRef.current) return;
            strippingRef.current = true;
            try {
                stripChartFocusability(host);
            } finally {
                strippingRef.current = false;
            }
        };

        const observer = new MutationObserver((mutations) => {
            callbackCount += 1;
            const structural = mutations.some(
                (m) => m.type === 'childList' && (m.addedNodes.length > 0 || m.removedNodes.length > 0),
            );
            if (structural) runStrip();
        });
        observer.observe(host, { childList: true, subtree: true });

        runStrip();

        expect(callbackCount).toBe(0);
        expect(host.querySelector('.recharts-surface')?.getAttribute('focusable')).toBe('false');
        expect(host.querySelector('.recharts-wrapper div')?.getAttribute('tabindex')).toBe('-1');

        observer.disconnect();
    });
});
