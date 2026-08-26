import { describe, it, expect, vi } from 'vitest';
import {
    releaseChartFocus,
    shouldReleaseChartFocus,
    stripChartFocusability,
} from '../../utils/chartFocusRelease';

describe('shouldReleaseChartFocus', () => {
    it('returns true for recharts surface SVG', () => {
        const surface = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        surface.setAttribute('class', 'recharts-surface');
        expect(shouldReleaseChartFocus(surface)).toBe(true);
    });

    it('returns true for recharts wrapper div', () => {
        const wrapper = document.createElement('div');
        wrapper.className = 'recharts-wrapper';
        expect(shouldReleaseChartFocus(wrapper)).toBe(true);
    });

    it('returns false for buttons inside chart host', () => {
        const host = document.createElement('div');
        host.className = 'cd-chart-host';
        const button = document.createElement('button');
        host.appendChild(button);
        expect(shouldReleaseChartFocus(button)).toBe(false);
    });

    it('returns true for tooltip escape div with tabindex inside wrapper', () => {
        const host = document.createElement('div');
        host.className = 'cd-chart-host';
        const wrapper = document.createElement('div');
        wrapper.className = 'recharts-wrapper';
        const tooltipDiv = document.createElement('div');
        tooltipDiv.setAttribute('tabindex', '-1');
        wrapper.appendChild(tooltipDiv);
        host.appendChild(wrapper);
        expect(shouldReleaseChartFocus(tooltipDiv)).toBe(true);
    });
});

describe('releaseChartFocus', () => {
    it('blurs chart focus targets', () => {
        const surface = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        surface.setAttribute('class', 'recharts-surface');
        surface.blur = vi.fn();
        releaseChartFocus(surface);
        expect(surface.blur).toHaveBeenCalled();
    });

    it('does not blur real controls', () => {
        const button = document.createElement('button');
        button.blur = vi.fn();
        releaseChartFocus(button);
        expect(button.blur).not.toHaveBeenCalled();
    });
});

describe('stripChartFocusability', () => {
    it('removes tabindex and sets focusable=false on recharts surface', () => {
        const host = document.createElement('div');
        host.className = 'cd-chart-host';
        const surface = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        surface.setAttribute('class', 'recharts-surface');
        surface.setAttribute('tabindex', '0');
        host.appendChild(surface);

        stripChartFocusability(host);

        expect(surface.hasAttribute('tabindex')).toBe(false);
        expect(surface.getAttribute('focusable')).toBe('false');
    });

    it('forces tabindex=-1 on tooltip escape divs inside wrapper', () => {
        const host = document.createElement('div');
        const wrapper = document.createElement('div');
        wrapper.className = 'recharts-wrapper';
        const tooltipDiv = document.createElement('div');
        tooltipDiv.setAttribute('tabindex', '0');
        wrapper.appendChild(tooltipDiv);
        host.appendChild(wrapper);

        stripChartFocusability(host);

        expect(tooltipDiv.getAttribute('tabindex')).toBe('-1');
    });

    it('is idempotent — second strip does not write attributes again', () => {
        const host = document.createElement('div');
        const surface = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        surface.setAttribute('class', 'recharts-surface');
        surface.setAttribute('tabindex', '0');
        host.appendChild(surface);

        stripChartFocusability(host);
        const setAttribute = vi.spyOn(surface, 'setAttribute');
        const removeAttribute = vi.spyOn(surface, 'removeAttribute');
        stripChartFocusability(host);

        expect(setAttribute).not.toHaveBeenCalled();
        expect(removeAttribute).not.toHaveBeenCalled();
    });
});
