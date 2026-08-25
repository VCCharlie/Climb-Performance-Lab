import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import useTouchFocusRelease from '../../hooks/useTouchFocusRelease';

describe('useTouchFocusRelease', () => {
    beforeEach(() => {
        vi.spyOn(document, 'addEventListener');
        vi.spyOn(document, 'removeEventListener');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('registers a capture-phase pointerup listener on mount', () => {
        const { unmount } = renderHook(() => useTouchFocusRelease());

        expect(document.addEventListener).toHaveBeenCalledWith(
            'pointerup',
            expect.any(Function),
            true,
        );

        unmount();

        expect(document.removeEventListener).toHaveBeenCalledWith(
            'pointerup',
            expect.any(Function),
            true,
        );
    });

    it('blurs a focused recharts surface after touch pointerup', () => {
        renderHook(() => useTouchFocusRelease());

        const handler = document.addEventListener.mock.calls.find(
            ([eventName]) => eventName === 'pointerup',
        )?.[1];

        expect(handler).toBeTypeOf('function');

        const surface = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        surface.setAttribute('class', 'recharts-surface');
        surface.blur = vi.fn();
        document.body.appendChild(surface);
        Object.defineProperty(document, 'activeElement', {
            configurable: true,
            value: surface,
        });

        handler({ pointerType: 'touch' });

        expect(surface.blur).toHaveBeenCalled();

        document.body.removeChild(surface);
        Object.defineProperty(document, 'activeElement', {
            configurable: true,
            value: document.body,
        });
    });

    it('blurs a focused element inside cd-chart-host after touch pointerup', () => {
        renderHook(() => useTouchFocusRelease());

        const handler = document.addEventListener.mock.calls.find(
            ([eventName]) => eventName === 'pointerup',
        )?.[1];

        const host = document.createElement('div');
        host.className = 'cd-chart-host';
        const button = document.createElement('button');
        button.type = 'button';
        button.blur = vi.fn();
        host.appendChild(button);
        document.body.appendChild(host);
        Object.defineProperty(document, 'activeElement', {
            configurable: true,
            value: button,
        });

        handler({ pointerType: 'touch' });

        expect(button.blur).toHaveBeenCalled();

        document.body.removeChild(host);
        Object.defineProperty(document, 'activeElement', {
            configurable: true,
            value: document.body,
        });
    });

    it('does not blur chart focus for mouse pointerup', () => {
        renderHook(() => useTouchFocusRelease());

        const handler = document.addEventListener.mock.calls.find(
            ([eventName]) => eventName === 'pointerup',
        )?.[1];

        const surface = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        surface.setAttribute('class', 'recharts-surface');
        document.body.appendChild(surface);
        Object.defineProperty(document, 'activeElement', {
            configurable: true,
            value: surface,
        });

        handler({ pointerType: 'mouse' });

        expect(document.activeElement).toBe(surface);

        document.body.removeChild(surface);
        Object.defineProperty(document, 'activeElement', {
            configurable: true,
            value: document.body,
        });
    });
});
