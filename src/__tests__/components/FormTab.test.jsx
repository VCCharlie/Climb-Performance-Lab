import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import FormTab from '../../components/dashboard/FormTab.jsx';

function mockMatchMedia(matches = false) {
    return vi.fn().mockImplementation((query) => ({
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }));
}

/**
 * Uses real Recharts (no mock) to catch production-only chart crashes on the Form tab.
 */
describe('FormTab mobile fitness chart', () => {
    beforeEach(() => {
        window.matchMedia = mockMatchMedia(false);
    });

    afterEach(() => {
        delete window.matchMedia;
    });

    it('renders CTL / ATL / TSB chart without throwing when activities have load', () => {
        const data = [
            { id: '1', date: '2026-01-01', type: 'Ride', load: 45 },
            { id: '2', date: '2026-01-02', type: 'Ride', load: 62 },
            { id: '3', date: '2026-01-03', type: 'Ride', load: 30 },
            { id: '4', date: '2026-01-04', type: 'Ride', load: 80 },
            { id: '5', date: '2026-01-05', type: 'Ride', load: 55 },
        ];

        expect(() =>
            render(
                <FormTab
                    data={data}
                    customTicks={['2026-01-01', '2026-01-05']}
                />,
            ),
        ).not.toThrow();

        expect(screen.getByText('CTL / ATL / TSB')).toBeTruthy();
        expect(screen.getByLabelText(/touch and drag horizontally/i)).toBeTruthy();
    });
});
