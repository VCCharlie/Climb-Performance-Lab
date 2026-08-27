import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import MainNav from '../../components/shell/MainNav.jsx';
import StickyTimeRangeToolbar from '../../components/shell/StickyTimeRangeToolbar.jsx';
import TimeRangeToolbar from '../../components/shell/TimeRangeToolbar.jsx';

function mockMatchMedia(viewport) {
    return vi.fn().mockImplementation((query) => ({
        matches: viewport === 'tablet'
            ? query.includes('768px') && query.includes('1023px')
            : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }));
}

describe('period preset dedup on lg+ desktop', () => {
    beforeEach(() => {
        class MockIntersectionObserver {
            constructor(callback) {
                this.callback = callback;
            }

            observe() {
                this.callback([{ isIntersecting: false }]);
            }

            disconnect() {}
            unobserve() {}
        }
        vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    });

    afterEach(() => {
        cleanup();
        delete window.matchMedia;
        vi.unstubAllGlobals();
    });

    it('MainNav sub-header row is lg:hidden (tablet-only shell)', () => {
        window.matchMedia = mockMatchMedia('tablet');

        const { container } = render(
            <MainNav
                activeTab="dashboard"
                onTabChange={() => {}}
                timeRange="1M"
                onTimeRangeChange={() => {}}
                customStart=""
                customEnd=""
                onCustomStart={() => {}}
                onCustomEnd={() => {}}
            />,
        );

        expect(container.firstChild).toHaveClass('lg:hidden');
    });

    it('StickyTimeRangeToolbar does not portal a pinned row on lg+ desktop', () => {
        window.matchMedia = mockMatchMedia('desktop');

        render(
            <StickyTimeRangeToolbar enabled>
                <div data-pinned-main-nav="">
                    <TimeRangeToolbar
                        layout="desktop"
                        timeRange="1M"
                        onTimeRangeChange={() => {}}
                        customStart=""
                        customEnd=""
                        onCustomStart={() => {}}
                        onCustomEnd={() => {}}
                        compact
                    />
                </div>
            </StickyTimeRangeToolbar>,
        );

        expect(document.body.querySelector('.fixed[data-pinned-main-nav]')).toBeNull();
    });

    it('StickyTimeRangeToolbar keeps period preset in tablet sub-header', () => {
        window.matchMedia = mockMatchMedia('tablet');

        render(
            <MainNav
                activeTab="dashboard"
                onTabChange={() => {}}
                timeRange="1M"
                onTimeRangeChange={() => {}}
                customStart=""
                customEnd=""
                onCustomStart={() => {}}
                onCustomEnd={() => {}}
            />,
        );

        expect(screen.getByRole('button', { name: /Time range: 1M/i })).toBeInTheDocument();
    });
});
