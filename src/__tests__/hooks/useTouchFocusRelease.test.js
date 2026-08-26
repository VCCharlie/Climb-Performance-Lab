import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import useTouchFocusRelease, { shouldReleaseChartFocus } from '../../hooks/useTouchFocusRelease';

describe('shouldReleaseChartFocus', () => {
    it('releases recharts surface focus', () => {
        const surface = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        surface.setAttribute('class', 'recharts-surface');
        expect(shouldReleaseChartFocus(surface)).toBe(true);
    });

    it('does not release real button focus inside chart host', () => {
        const host = document.createElement('div');
        host.className = 'cd-chart-host';
        const button = document.createElement('button');
        host.appendChild(button);
        document.body.appendChild(host);
        expect(shouldReleaseChartFocus(button)).toBe(false);
        document.body.removeChild(host);
    });

    it('releases recharts tooltip tabindex div inside chart host', () => {
        const host = document.createElement('div');
        host.className = 'cd-chart-host';
        const wrapper = document.createElement('div');
        wrapper.className = 'recharts-wrapper';
        const tooltipDiv = document.createElement('div');
        tooltipDiv.setAttribute('tabindex', '-1');
        wrapper.appendChild(tooltipDiv);
        host.appendChild(wrapper);
        document.body.appendChild(host);
        expect(shouldReleaseChartFocus(tooltipDiv)).toBe(true);
        document.body.removeChild(host);
    });
});

describe('useTouchFocusRelease', () => {
    beforeEach(() => {
        vi.spyOn(document, 'addEventListener');
        vi.spyOn(document, 'removeEventListener');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('registers capture-phase focusin and pointerup listeners on mount', () => {
        const { unmount } = renderHook(() => useTouchFocusRelease());

        expect(document.addEventListener).toHaveBeenCalledWith('focusin', expect.any(Function), true);
        expect(document.addEventListener).toHaveBeenCalledWith('pointerup', expect.any(Function), true);

        unmount();

        expect(document.removeEventListener).toHaveBeenCalledWith('focusin', expect.any(Function), true);
        expect(document.removeEventListener).toHaveBeenCalledWith('pointerup', expect.any(Function), true);
    });

    it('blurs a focused recharts surface on focusin', () => {
        renderHook(() => useTouchFocusRelease());

        const handler = document.addEventListener.mock.calls.find(
            ([eventName]) => eventName === 'focusin',
        )?.[1];

        const surface = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        surface.setAttribute('class', 'recharts-surface');
        surface.blur = vi.fn();

        handler({ target: surface });

        expect(surface.blur).toHaveBeenCalled();
    });

    it('does not blur a button inside cd-chart-host on focusin', () => {
        renderHook(() => useTouchFocusRelease());

        const handler = document.addEventListener.mock.calls.find(
            ([eventName]) => eventName === 'focusin',
        )?.[1];

        const host = document.createElement('div');
        host.className = 'cd-chart-host';
        const button = document.createElement('button');
        button.blur = vi.fn();
        host.appendChild(button);
        document.body.appendChild(host);

        handler({ target: button });

        expect(button.blur).not.toHaveBeenCalled();

        document.body.removeChild(host);
    });
});
