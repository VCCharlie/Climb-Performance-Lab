import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import StickyCompareColumnSwitcher from '../../components/dashboard/StickyCompareColumnSwitcher';

vi.mock('../../hooks/useStickyToolbarTop', () => ({
    default: () => 72,
}));

describe('StickyCompareColumnSwitcher', () => {
    let observerCallback;

    beforeEach(() => {
        observerCallback = null;
        global.IntersectionObserver = class {
            constructor(callback) {
                observerCallback = callback;
            }

            observe() {}

            disconnect() {}

            unobserve() {}
        };
    });

    afterEach(() => {
        delete global.IntersectionObserver;
    });

    it('renders separate inline and portaled switchers when pinned', async () => {
        const onChange = vi.fn();
        render(
            <StickyCompareColumnSwitcher
                showCompare
                activeColumn={1}
                onChange={onChange}
            />,
        );

        act(() => {
            observerCallback([{ isIntersecting: false }]);
        });

        await waitFor(() => {
            expect(screen.getAllByRole('button', { name: 'Column 2', hidden: true })).toHaveLength(2);
        });

        const columnButtons = screen.getAllByRole('button', { name: 'Column 2', hidden: true });
        fireEvent.click(columnButtons[1]);
        expect(onChange).toHaveBeenCalledWith(2);
    });
});
